from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_admin
from ..models import (Attendance, AttendanceStatus, CourtAssignment, Player,
                      Round)
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
    """Get global statistics across all sessions."""
    
    # Get all sessions ordered by creation time (most recent first)
    sessions = db.query(SessionModel).order_by(SessionModel.created_at.desc()).all()
    
    total_sessions = len(sessions)
    total_matches_played = 0
    total_players_set = set()
    total_duration_minutes = 0
    session_stats_list = []
    
    for session in sessions:
        # Calculate session duration from started_at and ended_at
        session_duration = 0
        if session.started_at and session.ended_at:
            session_duration = (session.ended_at - session.started_at).total_seconds() / 60
            total_duration_minutes += session_duration
        
        # Get rounds for this session
        rounds = db.query(Round).filter(Round.session_id == session.id).all()
        total_rounds = len(rounds)
        
        # Calculate total round duration
        total_round_duration = 0
        for round_obj in rounds:
            if round_obj.started_at and round_obj.ended_at:
                round_duration = (round_obj.ended_at - round_obj.started_at).total_seconds() / 60
                total_round_duration += round_duration
        
        # Get unique players who attended
        attendance_records = db.query(Attendance).filter(
            Attendance.session_id == session.id,
            Attendance.status == AttendanceStatus.PRESENT
        ).all()
        
        player_ids = {att.player_id for att in attendance_records}
        total_players_set.update(player_ids)
        total_players = len(player_ids)
        
        # Calculate session statistics
        matches_per_player = {}
        waiting_times = {}
        match_type_counts = {"MM": 0, "MF": 0, "FF": 0}
        total_session_matches = 0
        
        for round_obj in rounds:
            if round_obj.started_at is None:
                continue
                
            # Count matches (courts with 4 players)
            for court in round_obj.court_assignments:
                if (court.team_a_player1_id and court.team_a_player2_id and 
                    court.team_b_player1_id and court.team_b_player2_id):
                    total_session_matches += 1
                    total_matches_played += 1
                    
                    # Track match type
                    if court.match_type in match_type_counts:
                        match_type_counts[court.match_type] += 1
                    
                    # Track player matches
                    for player_id in [court.team_a_player1_id, court.team_a_player2_id,
                                     court.team_b_player1_id, court.team_b_player2_id]:
                        matches_per_player[player_id] = matches_per_player.get(player_id, 0) + 1
            
            # Calculate round duration for waiting time
            if round_obj.started_at and round_obj.ended_at:
                round_duration = (round_obj.ended_at - round_obj.started_at).total_seconds() / 60
                
                # Track waiting time for players not in this round
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
        
        # Calculate averages
        avg_matches = sum(matches_per_player.values()) / len(player_ids) if player_ids else 0
        avg_waiting = sum(waiting_times.values()) / len(player_ids) if player_ids else 0
        
        # Calculate fairness score (lower variance = better fairness)
        if len(matches_per_player) > 1:
            match_counts = list(matches_per_player.values())
            mean = sum(match_counts) / len(match_counts)
            variance = sum((x - mean) ** 2 for x in match_counts) / len(match_counts)
            fairness_score = max(0, 10 - variance)  # Scale 0-10, higher is better
        else:
            fairness_score = 10.0
        
        session_stats_list.append(SessionStatsResponse(
            session_id=session.id,
            session_name=session.name,
            session_date=session.created_at.isoformat() if session.created_at else session.date.isoformat(),
            total_rounds=total_rounds,
            total_players=total_players,
            total_matches=total_session_matches,
            avg_matches_per_player=round(avg_matches, 2),
            avg_waiting_time=round(avg_waiting, 1),
            fairness_score=round(fairness_score, 2),
            match_type_distribution=MatchTypeDistribution(
                MM=match_type_counts.get("MM", 0),
                MF=match_type_counts.get("MF", 0),
                FF=match_type_counts.get("FF", 0)
            ),
            session_duration_minutes=round(session_duration, 1),
            total_round_duration_minutes=round(total_round_duration, 1)
        ))
    
    avg_session_duration = total_duration_minutes / total_sessions if total_sessions > 0 else 0
    
    return GlobalStatsResponse(
        total_sessions=total_sessions,
        total_players=len(total_players_set),
        total_matches_played=total_matches_played,
        avg_session_duration_minutes=round(avg_session_duration, 1),
        session_stats=session_stats_list
    )
