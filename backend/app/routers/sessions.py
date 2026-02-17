from datetime import datetime
from typing import List

from app.algorithm import AssignmentPreferences
from app.algorithm import CourtAssignment as AlgoCourtAssignment
from app.algorithm import PlayerStats, auto_assign_courts
from app.database import get_db
from app.dependencies import get_current_admin, get_current_user
from app.models import (Attendance, AttendanceStatus, CourtAssignment, Gender,
                        MatchType, Player, Round)
from app.models import Session as SessionModel
from app.models import SessionHistory, SessionStatus, User
from app.schemas import (AttendanceCreate, AttendanceResponse,
                         AutoAssignmentRequest, CourtAssignmentResponse,
                         CourtAssignmentUpdate, PlayerSessionStats,
                         RoundResponse, SessionCreate, SessionResponse,
                         SessionStats, SessionUpdate)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("", response_model=List[SessionResponse])
def get_sessions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get all sessions for the current user's club."""
    query = db.query(SessionModel)
    
    # Filter by club_id if user is not a super admin
    if current_user.club_id is not None:
        query = query.filter(SessionModel.club_id == current_user.club_id)
    
    sessions = query.order_by(SessionModel.created_at.desc()).offset(skip).limit(limit).all()
    return sessions


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific session by ID."""
    query = db.query(SessionModel).filter(SessionModel.id == session_id)
    
    # Filter by club_id if user is not a super admin
    if current_user.club_id is not None:
        query = query.filter(SessionModel.club_id == current_user.club_id)
    
    session = query.first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    return session


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    session: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create a new session."""
    # Ensure club_id is set from the current user
    if current_user.club_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be associated with a club to create sessions"
        )
    
    session_data = session.dict()
    session_data['club_id'] = current_user.club_id
    
    new_session = SessionModel(**session_data)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


@router.patch("/{session_id}", response_model=SessionResponse)
def update_session(
    session_id: int,
    session_update: SessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update a session."""
    query = db.query(SessionModel).filter(SessionModel.id == session_id)
    
    # Filter by club_id if user is not a super admin
    if current_user.club_id is not None:
        query = query.filter(SessionModel.club_id == current_user.club_id)
    
    session = query.first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    update_data = session_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(session, field, value)
    
    db.commit()
    db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Delete a session."""
    query = db.query(SessionModel).filter(SessionModel.id == session_id)
    
    # Filter by club_id if user is not a super admin
    if current_user.club_id is not None:
        query = query.filter(SessionModel.club_id == current_user.club_id)
    
    session = query.first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    db.delete(session)
    db.commit()
    return None


@router.post("/{session_id}/start", response_model=SessionResponse)
def start_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Start a session by setting started_at timestamp and changing status to ACTIVE. Clears previous session data for fresh start."""
    query = db.query(SessionModel).filter(SessionModel.id == session_id)
    
    # Filter by club_id if user is not a super admin
    if current_user.club_id is not None:
        query = query.filter(SessionModel.club_id == current_user.club_id)
    
    session = query.first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Clear previous session data for a fresh start
    # Delete court assignments first (they reference rounds via foreign key)
    rounds = db.query(Round).filter(Round.session_id == session_id).all()
    for round_obj in rounds:
        db.query(CourtAssignment).filter(CourtAssignment.round_id == round_obj.id).delete()
    
    # Now delete rounds and attendance
    db.query(Round).filter(Round.session_id == session_id).delete()
    db.query(Attendance).filter(Attendance.session_id == session_id).delete()
    
    # Set started_at, clear ended_at, and update status to ACTIVE
    session.started_at = datetime.utcnow()
    session.ended_at = None
    session.status = SessionStatus.ACTIVE
    
    db.commit()
    db.refresh(session)
    return session


@router.post("/{session_id}/end", response_model=SessionResponse)
def end_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """End a session, save statistics snapshot, and preserve data."""
    query = db.query(SessionModel).filter(SessionModel.id == session_id)
    
    # Filter by club_id if user is not a super admin
    if current_user.club_id is not None:
        query = query.filter(SessionModel.club_id == current_user.club_id)
    
    session = query.first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Auto-end any active round (started but not ended)
    active_round = db.query(Round).filter(
        Round.session_id == session_id,
        Round.started_at.isnot(None),
        Round.ended_at.is_(None)
    ).first()
    
    if active_round:
        active_round.ended_at = datetime.utcnow()
    
    # Calculate and save statistics snapshot before ending
    if session.started_at:
        rounds = db.query(Round).filter(Round.session_id == session_id).all()
        attendance_records = db.query(Attendance).filter(
            Attendance.session_id == session_id,
            Attendance.status == AttendanceStatus.PRESENT
        ).all()
        
        player_ids = {att.player_id for att in attendance_records}
        matches_per_player = {}
        waiting_times = {}
        match_type_counts = {"MM": 0, "MF": 0, "FF": 0}
        total_matches = 0
        total_round_duration = 0
        
        for round_obj in rounds:
            if round_obj.started_at is None:
                continue
            
            # Count matches
            for court in round_obj.court_assignments:
                if (court.team_a_player1_id and court.team_a_player2_id and 
                    court.team_b_player1_id and court.team_b_player2_id):
                    total_matches += 1
                    if court.match_type.value in match_type_counts:
                        match_type_counts[court.match_type.value] += 1
                    
                    for player_id in [court.team_a_player1_id, court.team_a_player2_id,
                                     court.team_b_player1_id, court.team_b_player2_id]:
                        matches_per_player[player_id] = matches_per_player.get(player_id, 0) + 1
            
            # Calculate round duration and waiting time
            if round_obj.started_at and round_obj.ended_at:
                round_duration = (round_obj.ended_at - round_obj.started_at).total_seconds() / 60
                total_round_duration += round_duration
                
                playing_players = set()
                for court in round_obj.court_assignments:
                    if court.team_a_player1_id:
                        playing_players.add(court.team_a_player1_id)
                    if court.team_a_player2_id:
                        playing_players.add(court.team_a_player2_id)
                    if court.team_b_player1_id:
                        playing_players.add(court.team_b_player1_id)
                    if court.team_b_player2_id:
                        playing_players.add(court.team_b_player2_id)
                
                waiting_players = player_ids - playing_players
                for player_id in waiting_players:
                    waiting_times[player_id] = waiting_times.get(player_id, 0) + round_duration
        
        avg_matches = sum(matches_per_player.values()) / len(player_ids) if player_ids else 0
        avg_waiting = sum(waiting_times.values()) / len(player_ids) if player_ids else 0
        
        if len(matches_per_player) > 1:
            match_counts = list(matches_per_player.values())
            mean = sum(match_counts) / len(match_counts)
            variance = sum((x - mean) ** 2 for x in match_counts) / len(match_counts)
            fairness_score = max(0, 10 - variance)
        else:
            fairness_score = 10.0
        
        # Calculate session duration before setting ended_at
        ended_at = datetime.utcnow()
        session_duration = (ended_at - session.started_at).total_seconds() / 60
        
        # Save statistics snapshot
        history = SessionHistory(
            session_id=session.id,
            session_name=session.name,
            started_at=session.started_at,
            ended_at=ended_at,
            total_rounds=len(rounds),
            total_players=len(player_ids),
            total_matches=total_matches,
            avg_matches_per_player=round(avg_matches, 2),
            avg_waiting_time=round(avg_waiting, 1),
            fairness_score=round(fairness_score, 2),
            session_duration_minutes=round(session_duration, 1),
            total_round_duration_minutes=round(total_round_duration, 1),
            match_type_distribution=match_type_counts
        )
        db.add(history)
    
    # Update session status to ended and set ended timestamp
    session.status = SessionStatus.ENDED
    session.ended_at = datetime.utcnow()
    
    db.commit()
    db.refresh(session)
    return session


@router.post("/{session_id}/attendance", response_model=List[AttendanceResponse])
def set_attendance(
    session_id: int,
    attendance: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Set present players for a session."""
    query = db.query(SessionModel).filter(SessionModel.id == session_id)
    
    # Filter by club_id if user is not a super admin
    if current_user.club_id is not None:
        query = query.filter(SessionModel.club_id == current_user.club_id)
    
    session = query.first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get currently present players before update
    current_attendance = db.query(Attendance).filter(
        Attendance.session_id == session_id,
        Attendance.status == AttendanceStatus.PRESENT
    ).all()
    current_player_ids = {att.player_id for att in current_attendance}
    
    # Determine which players are being removed
    new_player_ids = set(attendance.player_ids)
    removed_player_ids = current_player_ids - new_player_ids
    
    # Handle court assignments for removed players if there's an active round
    if removed_player_ids:
        # Get the current active round (not ended)
        active_round = db.query(Round).filter(
            Round.session_id == session_id,
            Round.ended_at.is_(None)
        ).first()
        
        if active_round:
            # Get all court assignments for this round
            courts = db.query(CourtAssignment).filter(
                CourtAssignment.round_id == active_round.id
            ).all()
            
            # Get all players currently in courts
            players_in_courts = set()
            for court in courts:
                for pid in [court.team_a_player1_id, court.team_a_player2_id, 
                           court.team_b_player1_id, court.team_b_player2_id]:
                    if pid and pid not in removed_player_ids:
                        players_in_courts.add(pid)
            
            # Get waiting players (present but not in any court)
            waiting_player_ids = new_player_ids - players_in_courts
            waiting_players = db.query(Player).filter(Player.id.in_(waiting_player_ids)).all() if waiting_player_ids else []
            
            courts_to_update = []
            for court in courts:
                # Check if any removed player is in this court
                court_player_slots = {
                    'team_a_player1_id': court.team_a_player1_id,
                    'team_a_player2_id': court.team_a_player2_id,
                    'team_b_player1_id': court.team_b_player1_id,
                    'team_b_player2_id': court.team_b_player2_id
                }
                
                if any(pid in removed_player_ids for pid in court_player_slots.values() if pid):
                    # Remove the players from the court
                    removed_slots = []
                    for slot, pid in court_player_slots.items():
                        if pid in removed_player_ids:
                            setattr(court, slot, None)
                            removed_slots.append(slot)
                    
                    # Get remaining players in court
                    remaining_players_data = []
                    for slot in ['team_a_player1_id', 'team_a_player2_id', 'team_b_player1_id', 'team_b_player2_id']:
                        pid = getattr(court, slot)
                        if pid:
                            player = db.query(Player).filter(Player.id == pid).first()
                            if player:
                                remaining_players_data.append({'slot': slot, 'player': player})
                    
                    # Try to fill empty slots from waiting list
                    for slot in removed_slots:
                        if waiting_players:
                            # Get current court player genders
                            court_genders = [p['player'].gender for p in remaining_players_data]
                            
                            # Try to find a suitable replacement
                            best_replacement = None
                            for waiting_player in waiting_players:
                                # Temporarily add this player to check if it forms a valid match
                                test_genders = court_genders + [waiting_player.gender]
                                
                                if len(test_genders) == 4:
                                    # Check if this creates a valid match type
                                    male_count = sum(1 for g in test_genders if g == Gender.MALE)
                                    female_count = sum(1 for g in test_genders if g == Gender.FEMALE)
                                    
                                    # Valid match types: MM (4M), FF (4F), or MF (2M+2F)
                                    if (male_count == 4 or female_count == 4 or 
                                        (male_count == 2 and female_count == 2)):
                                        best_replacement = waiting_player
                                        break
                            
                            if best_replacement:
                                # Assign the replacement player
                                setattr(court, slot, best_replacement.id)
                                remaining_players_data.append({'slot': slot, 'player': best_replacement})
                                waiting_players.remove(best_replacement)
                    
                    # Check final count
                    final_player_ids = [
                        court.team_a_player1_id,
                        court.team_a_player2_id,
                        court.team_b_player1_id,
                        court.team_b_player2_id
                    ]
                    final_count = sum(1 for p in final_player_ids if p is not None)
                    
                    # If we don't have exactly 4 players or can't form valid match, clear the court
                    if final_count != 4:
                        court.team_a_player1_id = None
                        court.team_a_player2_id = None
                        court.team_b_player1_id = None
                        court.team_b_player2_id = None
                        court.match_type = MatchType.OTHER
                    else:
                        # Recalculate match type for the updated court
                        players_in_court = db.query(Player).filter(
                            Player.id.in_([p for p in final_player_ids if p])
                        ).all()
                        male_count = sum(1 for p in players_in_court if p.gender == Gender.MALE)
                        female_count = sum(1 for p in players_in_court if p.gender == Gender.FEMALE)
                        
                        if male_count == 4:
                            court.match_type = MatchType.MM
                        elif female_count == 4:
                            court.match_type = MatchType.FF
                        elif male_count == 2 and female_count == 2:
                            court.match_type = MatchType.MF
                        else:
                            court.match_type = MatchType.OTHER
                    
                    courts_to_update.append(court)
            
            # Commit court changes
            if courts_to_update:
                db.commit()
    
    # Update attendance - only remove players who are no longer present
    # and add new players, preserving check_in_time for existing players
    for player_id in removed_player_ids:
        db.query(Attendance).filter(
            Attendance.session_id == session_id,
            Attendance.player_id == player_id
        ).delete()
    
    # Add new attendance records only for players who don't have one
    attendance_records = []
    for player_id in attendance.player_ids:
        # Check if player already has attendance record
        existing = db.query(Attendance).filter(
            Attendance.session_id == session_id,
            Attendance.player_id == player_id
        ).first()
        
        if existing:
            # Keep existing record (preserves original check_in_time)
            attendance_records.append(existing)
            continue
        
        # Verify player exists
        player = db.query(Player).filter(Player.id == player_id).first()
        if not player:
            continue
        
        new_attendance = Attendance(
            session_id=session_id,
            player_id=player_id,
            status=AttendanceStatus.PRESENT
        )
        db.add(new_attendance)
        attendance_records.append(new_attendance)
    
    db.commit()
    
    # Refresh records
    for record in attendance_records:
        db.refresh(record)
    
    return attendance_records


@router.get("/{session_id}/attendance", response_model=List[AttendanceResponse])
def get_attendance(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance for a session."""
    query = db.query(SessionModel).filter(SessionModel.id == session_id)
    
    # Filter by club_id if user is not a super admin
    if current_user.club_id is not None:
        query = query.filter(SessionModel.club_id == current_user.club_id)
    
    session = query.first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    attendance = db.query(Attendance).filter(
        Attendance.session_id == session_id,
        Attendance.status == AttendanceStatus.PRESENT
    ).all()
    
    return attendance


@router.get("/{session_id}/rounds", response_model=List[RoundResponse])
def get_rounds(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all rounds for a session."""
    query = db.query(SessionModel).filter(SessionModel.id == session_id)
    
    # Filter by club_id if user is not a super admin
    if current_user.club_id is not None:
        query = query.filter(SessionModel.club_id == current_user.club_id)
    
    session = query.first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return session.rounds


@router.post("/{session_id}/rounds/auto_assign", response_model=RoundResponse)
def auto_assign_round(
    session_id: int,
    request: AutoAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Auto-assign players to courts for the next round."""
    query = db.query(SessionModel).filter(SessionModel.id == session_id)
    
    # Filter by club_id if user is not a super admin
    if current_user.club_id is not None:
        query = query.filter(SessionModel.club_id == current_user.club_id)
    
    session = query.first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get present players
    present_players = db.query(Player).join(Attendance).filter(
        Attendance.session_id == session_id,
        Attendance.status == AttendanceStatus.PRESENT
    ).all()
    
    if len(present_players) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough players (minimum 4 required)"
        )
    
    # Auto-end any active round (started but not ended) before creating a new round
    active_round = db.query(Round).filter(
        Round.session_id == session_id,
        Round.started_at.isnot(None),
        Round.ended_at.is_(None)
    ).first()
    
    if active_round:
        active_round.ended_at = datetime.utcnow()
        db.commit()
    
    # Check if there's already an unstarted round
    existing_unstarted_round = db.query(Round).filter(
        Round.session_id == session_id,
        Round.started_at == None
    ).order_by(Round.round_index.desc()).first()

    # Determine round index (reuse unstarted round index if present)
    current_round_index = existing_unstarted_round.round_index if existing_unstarted_round else len(session.rounds)

    # Calculate player stats
    player_stats = []
    
    for player in present_players:
        # Get matches played in this session
        matches_played = 0
        last_played_round = -1
        recent_partners = set()
        recent_opponents = set()
        courts_played = set()  # Track which courts this player has used
        
        for round_obj in session.rounds:
            played_in_round = False
            for court in round_obj.court_assignments:
                player_ids_in_court = [
                    court.team_a_player1_id, court.team_a_player2_id,
                    court.team_b_player1_id, court.team_b_player2_id
                ]
                
                if player.id in player_ids_in_court:
                    played_in_round = True
                    matches_played += 1
                    last_played_round = round_obj.round_index
                    courts_played.add(court.court_number)  # Track court number
                    
                    # Track recent partners and opponents (last 2 rounds)
                    if current_round_index - round_obj.round_index <= 2:
                        # Find team
                        if player.id in [court.team_a_player1_id, court.team_a_player2_id]:
                            # Team A
                            partner_id = court.team_a_player2_id if player.id == court.team_a_player1_id else court.team_a_player1_id
                            if partner_id:
                                recent_partners.add(partner_id)
                            if court.team_b_player1_id:
                                recent_opponents.add(court.team_b_player1_id)
                            if court.team_b_player2_id:
                                recent_opponents.add(court.team_b_player2_id)
                        else:
                            # Team B
                            partner_id = court.team_b_player2_id if player.id == court.team_b_player1_id else court.team_b_player1_id
                            if partner_id:
                                recent_partners.add(partner_id)
                            if court.team_a_player1_id:
                                recent_opponents.add(court.team_a_player1_id)
                            if court.team_a_player2_id:
                                recent_opponents.add(court.team_a_player2_id)
        
        rounds_sitting_out = current_round_index - matches_played
        
        player_stats.append(PlayerStats(
            player_id=player.id,
            name=player.full_name,
            gender=player.gender,
            numeric_rank=player.numeric_rank or 5.0,
            matches_played=matches_played,
            rounds_sitting_out=rounds_sitting_out,
            last_played_round=last_played_round,
            recent_partners=recent_partners,
            recent_opponents=recent_opponents,
            courts_played=courts_played  # Include courts played
        ))
    
    # Get locked courts from the most recent round (if any)
    locked_courts_dict = {}
    if session.rounds:
        latest_round = session.rounds[-1]
        for court in latest_round.court_assignments:
            if court.locked:
                locked_courts_dict[court.court_number] = [
                    court.team_a_player1_id,
                    court.team_a_player2_id,
                    court.team_b_player1_id,
                    court.team_b_player2_id
                ]
    
    # Convert preferences
    algo_prefs = AssignmentPreferences(
        desired_mm=request.preferences.desired_mm,
        desired_mf=request.preferences.desired_mf,
        desired_ff=request.preferences.desired_ff,
        prioritize_waiting=request.preferences.prioritize_waiting,
        prioritize_equal_matches=request.preferences.prioritize_equal_matches,
        avoid_repeat_partners=request.preferences.avoid_repeat_partners,
        avoid_repeat_opponents=request.preferences.avoid_repeat_opponents,
        balance_skill=request.preferences.balance_skill
    )
    
    # If manual court assignments are provided, handle them
    assignments = None
    if request.court_assignments and len(request.court_assignments) > 0:
        # Check if we need to auto-assign remaining courts
        assigned_player_ids = set()
        for court in request.court_assignments:
            if court.team_a_player1_id:
                assigned_player_ids.add(court.team_a_player1_id)
            if court.team_a_player2_id:
                assigned_player_ids.add(court.team_a_player2_id)
            if court.team_b_player1_id:
                assigned_player_ids.add(court.team_b_player1_id)
            if court.team_b_player2_id:
                assigned_player_ids.add(court.team_b_player2_id)
        
        # Check if any court has incomplete assignments (mix mode)
        has_incomplete_courts = any(
            not (court.team_a_player1_id and court.team_a_player2_id and 
                 court.team_b_player1_id and court.team_b_player2_id)
            for court in request.court_assignments
        )
        
        # If there are unassigned players and we have fewer than required courts, auto-assign remaining
        if has_incomplete_courts or len(assigned_player_ids) < len(present_players):
            # Build locked courts from manual assignments that are complete
            manual_locked_courts = {}
            for court in request.court_assignments:
                if (court.team_a_player1_id and court.team_a_player2_id and 
                    court.team_b_player1_id and court.team_b_player2_id):
                    manual_locked_courts[court.court_number] = [
                        court.team_a_player1_id,
                        court.team_a_player2_id,
                        court.team_b_player1_id,
                        court.team_b_player2_id
                    ]
            
            # Filter player_stats to exclude already assigned players
            remaining_player_stats = [
                ps for ps in player_stats 
                if ps.player_id not in assigned_player_ids
            ]
            
            # Run algorithm for remaining players
            if len(remaining_player_stats) >= 4:
                auto_assignments, waiting_ids = auto_assign_courts(
                    remaining_player_stats,
                    session.number_of_courts,
                    current_round_index,
                    algo_prefs,
                    manual_locked_courts if manual_locked_courts else None
                )
                # Combine manual and auto assignments
                assignments = list(request.court_assignments) + auto_assignments
            else:
                assignments = request.court_assignments
        else:
            # Pure manual mode
            assignments = request.court_assignments
    else:
        # Run algorithm
        assignments, waiting_ids = auto_assign_courts(
            player_stats,
            session.number_of_courts,
            current_round_index,
            algo_prefs,
            locked_courts_dict if locked_courts_dict else None
        )

    # Delete any existing unstarted round and its assignments
    if existing_unstarted_round:
        db.delete(existing_unstarted_round)
        db.flush()

    # Create new round
    new_round = Round(
        session_id=session_id,
        round_index=current_round_index
    )
    db.add(new_round)
    db.flush()
    
    # Create court assignments
    if request.court_assignments and len(request.court_assignments) > 0:
        player_map = {p.id: p for p in present_players}

        def resolve_match_type(team_a_ids, team_b_ids):
            if len(team_a_ids) < 2 or len(team_b_ids) < 2:
                return MatchType.OTHER

            team_a_genders = [player_map[pid].gender for pid in team_a_ids if pid in player_map]
            team_b_genders = [player_map[pid].gender for pid in team_b_ids if pid in player_map]
            genders = team_a_genders + team_b_genders

            male_count = sum(1 for g in genders if g == Gender.MALE)
            female_count = sum(1 for g in genders if g == Gender.FEMALE)

            if male_count == 4:
                return MatchType.MM
            if female_count == 4:
                return MatchType.FF

            team_a_male = sum(1 for g in team_a_genders if g == Gender.MALE)
            team_a_female = sum(1 for g in team_a_genders if g == Gender.FEMALE)
            team_b_male = sum(1 for g in team_b_genders if g == Gender.MALE)
            team_b_female = sum(1 for g in team_b_genders if g == Gender.FEMALE)

            if team_a_male == 1 and team_a_female == 1 and team_b_male == 1 and team_b_female == 1:
                return MatchType.MF

            return MatchType.OTHER

    for assignment in assignments:
        # Check if this is a manual assignment (has team_a_player1_id) or auto assignment (has team_a tuple)
        if hasattr(assignment, 'team_a_player1_id'):
            # Manual assignment
            team_a_ids = [pid for pid in [assignment.team_a_player1_id, assignment.team_a_player2_id] if pid is not None]
            team_b_ids = [pid for pid in [assignment.team_b_player1_id, assignment.team_b_player2_id] if pid is not None]
            match_type = resolve_match_type(team_a_ids, team_b_ids)

            court = CourtAssignment(
                round_id=new_round.id,
                court_number=assignment.court_number,
                team_a_player1_id=assignment.team_a_player1_id,
                team_a_player2_id=assignment.team_a_player2_id,
                team_b_player1_id=assignment.team_b_player1_id,
                team_b_player2_id=assignment.team_b_player2_id,
                match_type=match_type,
                locked=assignment.locked if hasattr(assignment, 'locked') and assignment.locked is not None else False
            )
        else:
            # Auto assignment (from algorithm)
            court = CourtAssignment(
                round_id=new_round.id,
                court_number=assignment.court_number,
                team_a_player1_id=assignment.team_a[0],
                team_a_player2_id=assignment.team_a[1],
                team_b_player1_id=assignment.team_b[0],
                team_b_player2_id=assignment.team_b[1],
                match_type=assignment.match_type,
                locked=False
            )
        db.add(court)
    
    db.commit()
    db.refresh(new_round)
    
    return new_round


@router.post("/rounds/{round_id}/start", response_model=RoundResponse)
def start_round(
    round_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Start a round."""
    round_obj = db.query(Round).filter(Round.id == round_id).first()
    if not round_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Round not found"
        )
    
    round_obj.started_at = datetime.utcnow()
    round_obj.ended_at = None  # Clear ended_at to allow restarting a previously ended round
    db.commit()
    db.refresh(round_obj)
    return round_obj


@router.post("/rounds/{round_id}/end", response_model=RoundResponse)
def end_round(
    round_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """End a round."""
    round_obj = db.query(Round).filter(Round.id == round_id).first()
    if not round_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Round not found"
        )
    
    round_obj.ended_at = datetime.utcnow()
    db.commit()
    db.refresh(round_obj)
    return round_obj


@router.delete("/rounds/{round_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_round(
    round_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Cancel/delete a round and its court assignments."""
    round_obj = db.query(Round).filter(Round.id == round_id).first()
    if not round_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Round not found"
        )
    
    # Delete court assignments first
    db.query(CourtAssignment).filter(CourtAssignment.round_id == round_id).delete()
    
    # Delete the round
    db.delete(round_obj)
    db.commit()
    return None


@router.patch("/rounds/{round_id}/courts/{court_number}", response_model=CourtAssignmentResponse)
def update_court_assignment(
    round_id: int,
    court_number: int,
    update: CourtAssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update a court assignment (manual edit)."""
    # First check if the round belongs to user's club
    round_query = db.query(Round).filter(Round.id == round_id)
    if current_user.club_id is not None:
        round_query = round_query.join(SessionModel).filter(SessionModel.club_id == current_user.club_id)
    
    round_obj = round_query.first()
    if not round_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Round not found"
        )
    
    court = db.query(CourtAssignment).filter(
        CourtAssignment.round_id == round_id,
        CourtAssignment.court_number == court_number
    ).first()
    
    if not court:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Court assignment not found"
        )
    
    update_data = update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(court, field, value)
    
    db.commit()
    db.refresh(court)
    return court


@router.patch("/court-assignments/{court_assignment_id}", response_model=CourtAssignmentResponse)
def update_court_assignment_by_id(
    court_assignment_id: int,
    update: CourtAssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update a court assignment by its ID."""
    court = db.query(CourtAssignment).filter(
        CourtAssignment.id == court_assignment_id
    ).first()
    
    if not court:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Court assignment not found"
        )
    
    update_data = update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(court, field, value)
    
    db.commit()
    db.refresh(court)
    return court


@router.get("/{session_id}/stats", response_model=SessionStats)
def get_session_stats(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get fairness stats for a session."""
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get present players
    present_players = db.query(Player).join(Attendance).filter(
        Attendance.session_id == session_id,
        Attendance.status == AttendanceStatus.PRESENT
    ).all()
    
    player_stats = []
    total_rounds = len(session.rounds)
    
    for player in present_players:
        # Get player's attendance record to check when they joined
        attendance = db.query(Attendance).filter(
            Attendance.session_id == session_id,
            Attendance.player_id == player.id
        ).first()
        
        matches_played = 0
        rounds_sitting = 0
        partners = set()
        opponents = set()
        opponents_count = {}
        match_types = {"MM": 0, "MF": 0, "FF": 0, "OTHER": 0}
        courts_played = set()  # Track court numbers
        
        for round_obj in session.rounds:
            # Only count rounds that were created after player joined
            # Use <= to skip rounds created strictly before check-in (not equal)
            if attendance and attendance.check_in_time > round_obj.created_at:
                continue
                
            played_in_round = False
            for court in round_obj.court_assignments:
                player_ids = [
                    court.team_a_player1_id, court.team_a_player2_id,
                    court.team_b_player1_id, court.team_b_player2_id
                ]
                
                if player.id in player_ids:
                    played_in_round = True
                    matches_played += 1
                    match_types[court.match_type.value] += 1
                    courts_played.add(court.court_number)  # Track court number
                    
                    # Track partners and opponents
                    if player.id in [court.team_a_player1_id, court.team_a_player2_id]:
                        partner_id = court.team_a_player2_id if player.id == court.team_a_player1_id else court.team_a_player1_id
                        if partner_id:
                            partner = db.query(Player).filter(Player.id == partner_id).first()
                            if partner:
                                partners.add(partner.full_name)
                        
                        for opp_id in [court.team_b_player1_id, court.team_b_player2_id]:
                            if opp_id:
                                opp = db.query(Player).filter(Player.id == opp_id).first()
                                if opp:
                                    opponents.add(opp.full_name)
                                    opponents_count[opp.full_name] = opponents_count.get(opp.full_name, 0) + 1
                    else:
                        partner_id = court.team_b_player2_id if player.id == court.team_b_player1_id else court.team_b_player1_id
                        if partner_id:
                            partner = db.query(Player).filter(Player.id == partner_id).first()
                            if partner:
                                partners.add(partner.full_name)
                        
                        for opp_id in [court.team_a_player1_id, court.team_a_player2_id]:
                            if opp_id:
                                opp = db.query(Player).filter(Player.id == opp_id).first()
                                if opp:
                                    opponents.add(opp.full_name)
                                    opponents_count[opp.full_name] = opponents_count.get(opp.full_name, 0) + 1
            
            if not played_in_round:
                rounds_sitting += 1
        
        waiting_time = rounds_sitting * session.match_duration_minutes
        
        player_stats.append(PlayerSessionStats(
            player_id=player.id,
            player_name=player.full_name,
            matches_played=matches_played,
            rounds_sitting_out=rounds_sitting,
            waiting_time_minutes=waiting_time,
            partners=list(partners),
            opponents=list(opponents),
            opponents_count=opponents_count,
            match_type_counts=match_types,
            courts_played=sorted(list(courts_played))  # Include courts played
        ))
    
    # Calculate fairness metrics
    if player_stats:
        avg_matches = sum(p.matches_played for p in player_stats) / len(player_stats)
        avg_waiting = sum(p.waiting_time_minutes for p in player_stats) / len(player_stats)
        
        # Fairness score: lower variance = better
        match_variance = sum((p.matches_played - avg_matches) ** 2 for p in player_stats) / len(player_stats)
        fairness_score = max(0, 100 - (match_variance * 10))
    else:
        avg_matches = 0
        avg_waiting = 0
        fairness_score = 100
    
    return SessionStats(
        session_id=session_id,
        total_rounds=total_rounds,
        player_stats=player_stats,
        fairness_score=fairness_score,
        avg_matches_per_player=avg_matches,
        avg_waiting_time=avg_waiting
    )
