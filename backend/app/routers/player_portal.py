from typing import List

from app.database import get_db
from app.dependencies import get_current_user
from app.models import (Attendance, AttendanceStatus, CourtAssignment, Player,
                        Round, User)
from app.schemas import PlayerProfileStats, SessionResponse, UserResponse
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/me", tags=["player-portal"])


@router.get("", response_model=UserResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user profile."""
    return current_user


@router.get("/stats", response_model=PlayerProfileStats)
def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get player statistics."""
    # Get player profile
    player = db.query(Player).filter(Player.user_id == current_user.id).first()
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player profile not found"
        )
    
    # Get all sessions player attended
    attendances = db.query(Attendance).filter(
        Attendance.player_id == player.id,
        Attendance.status == AttendanceStatus.PRESENT
    ).all()
    
    total_matches = 0
    total_sessions = len(set(a.session_id for a in attendances))
    match_types = {"MM": 0, "MF": 0, "FF": 0, "OTHER": 0}
    partner_counts = {}
    opponent_counts = {}
    recent_sessions = []
    
    # Analyze each session
    for attendance in attendances:
        session = attendance.session
        session_matches = 0
        
        for round_obj in session.rounds:
            for court in round_obj.court_assignments:
                player_ids = [
                    court.team_a_player1_id, court.team_a_player2_id,
                    court.team_b_player1_id, court.team_b_player2_id
                ]
                
                if player.id in player_ids:
                    total_matches += 1
                    session_matches += 1
                    match_types[court.match_type.value] += 1
                    
                    # Track partners
                    if player.id in [court.team_a_player1_id, court.team_a_player2_id]:
                        partner_id = court.team_a_player2_id if player.id == court.team_a_player1_id else court.team_a_player1_id
                        if partner_id:
                            partner = db.query(Player).filter(Player.id == partner_id).first()
                            if partner:
                                partner_counts[partner.full_name] = partner_counts.get(partner.full_name, 0) + 1
                        
                        for opp_id in [court.team_b_player1_id, court.team_b_player2_id]:
                            if opp_id:
                                opp = db.query(Player).filter(Player.id == opp_id).first()
                                if opp:
                                    opponent_counts[opp.full_name] = opponent_counts.get(opp.full_name, 0) + 1
                    else:
                        partner_id = court.team_b_player2_id if player.id == court.team_b_player1_id else court.team_b_player1_id
                        if partner_id:
                            partner = db.query(Player).filter(Player.id == partner_id).first()
                            if partner:
                                partner_counts[partner.full_name] = partner_counts.get(partner.full_name, 0) + 1
                        
                        for opp_id in [court.team_a_player1_id, court.team_a_player2_id]:
                            if opp_id:
                                opp = db.query(Player).filter(Player.id == opp_id).first()
                                if opp:
                                    opponent_counts[opp.full_name] = opponent_counts.get(opp.full_name, 0) + 1
        
        recent_sessions.append({
            "session_id": session.id,
            "session_name": session.name,
            "date": session.date.isoformat(),
            "matches_played": session_matches
        })
    
    # Sort partners and opponents by frequency
    frequent_partners = [
        {"name": name, "count": count}
        for name, count in sorted(partner_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    ]
    
    frequent_opponents = [
        {"name": name, "count": count}
        for name, count in sorted(opponent_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    ]
    
    # Sort recent sessions by date
    recent_sessions.sort(key=lambda x: x["date"], reverse=True)
    recent_sessions = recent_sessions[:10]
    
    return PlayerProfileStats(
        player_id=player.id,
        player_name=player.full_name,
        total_matches=total_matches,
        total_sessions=total_sessions,
        match_type_counts=match_types,
        frequent_partners=frequent_partners,
        frequent_opponents=frequent_opponents,
        recent_sessions=recent_sessions
    )


@router.get("/sessions", response_model=List[SessionResponse])
def get_my_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get sessions the player attended."""
    player = db.query(Player).filter(Player.user_id == current_user.id).first()
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player profile not found"
        )
    
    # Get sessions through attendance
    sessions = db.query(Attendance.session).filter(
        Attendance.player_id == player.id
    ).all()
    
    return [s[0] for s in sessions]
