from datetime import datetime
from typing import List

from app.algorithm import AssignmentPreferences
from app.algorithm import CourtAssignment as AlgoCourtAssignment
from app.algorithm import PlayerStats, auto_assign_courts
from app.database import get_db
from app.dependencies import get_current_admin, get_current_user
from app.models import (Attendance, AttendanceStatus, CourtAssignment,
                        MatchType, Player, Round)
from app.models import Session as SessionModel
from app.models import SessionStatus, User
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
    """Get all sessions."""
    sessions = db.query(SessionModel).order_by(SessionModel.created_at.desc()).offset(skip).limit(limit).all()
    return sessions


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific session by ID."""
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
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
    new_session = SessionModel(**session.dict())
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
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
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
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    db.delete(session)
    db.commit()
    return None


@router.post("/{session_id}/end", response_model=SessionResponse)
def end_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """End a session by clearing all rounds, court assignments, and attendance."""
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Delete court assignments first (manually, to avoid foreign key issues)
    for round_obj in session.rounds:
        db.query(CourtAssignment).filter(CourtAssignment.round_id == round_obj.id).delete()
    
    # Delete all rounds
    db.query(Round).filter(Round.session_id == session_id).delete()
    
    # Delete all attendance records
    db.query(Attendance).filter(Attendance.session_id == session_id).delete()
    
    # Update session status to draft
    session.status = SessionStatus.DRAFT
    session.ended_at = None
    
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
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Clear existing attendance
    db.query(Attendance).filter(Attendance.session_id == session_id).delete()
    
    # Add new attendance records
    attendance_records = []
    for player_id in attendance.player_ids:
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
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
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
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
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
    
    if len(present_players) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough players (minimum 4 required)"
        )
    
    # Calculate player stats
    player_stats = []
    current_round_index = len(session.rounds)
    
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
    
    # Run algorithm
    assignments, waiting_ids = auto_assign_courts(
        player_stats,
        session.number_of_courts,
        current_round_index,
        algo_prefs,
        locked_courts_dict if locked_courts_dict else None
    )
    
    # Check if there's already an unstarted round and delete it
    existing_unstarted_round = db.query(Round).filter(
        Round.session_id == session_id,
        Round.started_at == None
    ).first()
    
    if existing_unstarted_round:
        # Delete the existing unstarted round and its assignments
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
    for assignment in assignments:
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
        matches_played = 0
        rounds_sitting = 0
        partners = set()
        opponents = set()
        opponents_count = {}
        match_types = {"MM": 0, "MF": 0, "FF": 0, "OTHER": 0}
        courts_played = set()  # Track court numbers
        
        for round_obj in session.rounds:
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
