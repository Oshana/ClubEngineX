from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_admin
from ..models import (Attendance, AttendanceStatus, CourtAssignment, Player,
                      Round, SessionHistory)
from ..models import Session as SessionModel

router = APIRouter(prefix="/statistics", tags=["statistics"])


class MatchTypeDistribution(BaseModel):
    MM: int = 0
    MF: int = 0
    FF: int = 0


class SessionStatsResponse(BaseModel):
    session_id: int
    session_name: str
    session_date: str
    total_rounds: int
    total_players: int
    total_matches: int
    avg_matches_per_player: float
    avg_waiting_time: float
    fairness_score: float
    match_type_distribution: MatchTypeDistribution
    session_duration_minutes: float  # Time from Start to End Session button clicks
    total_round_duration_minutes: float  # Total time of all rounds


class GlobalStatsResponse(BaseModel):
    total_sessions: int
    total_players: int
    total_matches_played: int
    avg_session_duration_minutes: float
    session_stats: List[SessionStatsResponse]


@router.get("/global", response_model=GlobalStatsResponse)
def get_global_statistics(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Get global statistics across all sessions including historical runs."""
    
    # Get session history (completed runs)
    session_histories = db.query(SessionHistory).order_by(SessionHistory.started_at.desc()).all()
    
    total_sessions = len(session_histories)
    total_matches_played = 0
    total_duration_minutes = 0
    session_stats_list = []
    
    # Add historical sessions
    for history in session_histories:
        total_matches_played += history.total_matches
        total_duration_minutes += history.session_duration_minutes
        
        session_stats_list.append(SessionStatsResponse(
            session_id=history.session_id,
            session_name=history.session_name,
            session_date=history.started_at.isoformat(),
            total_rounds=history.total_rounds,
            total_players=history.total_players,
            total_matches=history.total_matches,
            avg_matches_per_player=history.avg_matches_per_player,
            avg_waiting_time=history.avg_waiting_time,
            fairness_score=history.fairness_score,
            match_type_distribution=MatchTypeDistribution(
                MM=history.match_type_distribution.get("MM", 0),
                MF=history.match_type_distribution.get("MF", 0),
                FF=history.match_type_distribution.get("FF", 0)
            ),
            session_duration_minutes=history.session_duration_minutes,
            total_round_duration_minutes=history.total_round_duration_minutes
        ))
    
    # Calculate total unique players across all history
    total_players = sum(h.total_players for h in session_histories)
    
    avg_session_duration = total_duration_minutes / total_sessions if total_sessions > 0 else 0
    
    return GlobalStatsResponse(
        total_sessions=total_sessions,
        total_players=total_players,
        total_matches_played=total_matches_played,
        avg_session_duration_minutes=round(avg_session_duration, 1),
        session_stats=session_stats_list
    )
