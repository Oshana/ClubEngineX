"""
Auto-assignment algorithm for badminton court assignments.

This module implements a fair court assignment algorithm that:
1. Prioritizes players who have waited longer or played fewer matches
2. Balances skill levels between teams
3. Avoids repeating recent partners and opponents
4. Respects match type preferences (MM/MF/FF)
5. Handles locked courts

The algorithm is deterministic - same inputs produce same outputs.
"""

import random
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Set, Tuple

from app.models import Gender, MatchType


@dataclass
class PlayerStats:
    """Statistics for a player in the current session."""
    player_id: int
    name: str
    gender: Gender
    numeric_rank: float
    matches_played: int
    rounds_sitting_out: int
    last_played_round: int  # -1 if never played
    recent_partners: Set[int]  # player IDs from last 2 rounds
    recent_opponents: Set[int]  # player IDs from last 2 rounds
    courts_played: Set[int]  # court numbers played on


@dataclass
class AssignmentPreferences:
    """Preferences for court assignment algorithm."""
    desired_mm: int = 0
    desired_mf: int = 0
    desired_ff: int = 0
    prioritize_waiting: float = 1.0
    prioritize_equal_matches: float = 1.0
    avoid_repeat_partners: float = 0.5
    avoid_repeat_opponents: float = 0.3
    balance_skill: float = 0.5
    court_variety: float = 0.3  # Weight for court variation


@dataclass
class CourtAssignment:
    """Represents a court assignment."""
    court_number: int
    team_a: Tuple[int, int]  # player IDs
    team_b: Tuple[int, int]  # player IDs
    match_type: MatchType


def calculate_priority_score(
    player: PlayerStats,
    current_round: int,
    preferences: AssignmentPreferences
) -> float:
    """
    Calculate priority score for a player.
    Higher score = higher priority to play.
    Priority order: 1. Wait time, 2. Equal matches
    """
    score = 0.0
    
    # HIGHEST PRIORITY: Waiting time (rounds since last played)
    if player.last_played_round >= 0:
        rounds_waited = current_round - player.last_played_round
    else:
        rounds_waited = current_round + 1  # Never played yet
    score += rounds_waited * preferences.prioritize_waiting * 100.0  # Increased weight
    
    # SECOND PRIORITY: Players who have played fewer matches
    avg_matches = 2.0  # Rough average
    matches_deficit = max(0, avg_matches - player.matches_played)
    score += matches_deficit * preferences.prioritize_equal_matches * 10.0
    
    return score


def determine_match_type(players: List[PlayerStats]) -> MatchType:
    """Determine match type based on player genders."""
    genders = [p.gender for p in players]
    male_count = sum(1 for g in genders if g == Gender.MALE)
    female_count = sum(1 for g in genders if g == Gender.FEMALE)
    
    if male_count == 4:
        return MatchType.MM
    elif female_count == 4:
        return MatchType.FF
    elif male_count > 0 and female_count > 0:
        return MatchType.MF
    else:
        return MatchType.OTHER


def calculate_team_balance_score(
    team_a: List[PlayerStats],
    team_b: List[PlayerStats],
    preferences: AssignmentPreferences
) -> float:
    """
    Calculate how balanced two teams are.
    Lower score = better balance.
    """
    # Skill balance
    team_a_rank = sum(p.numeric_rank for p in team_a) / len(team_a)
    team_b_rank = sum(p.numeric_rank for p in team_b) / len(team_b)
    rank_diff = abs(team_a_rank - team_b_rank)
    
    return rank_diff * preferences.balance_skill


def calculate_partnership_penalty(
    players: List[PlayerStats],
    team_a_indices: Tuple[int, int],
    team_b_indices: Tuple[int, int],
    preferences: AssignmentPreferences
) -> float:
    """
    Calculate penalty for repeating recent partnerships/opponents.
    Higher penalty = worse choice.
    """
    penalty = 0.0
    
    # Check team A partnership
    p1, p2 = players[team_a_indices[0]], players[team_a_indices[1]]
    if p1.player_id in p2.recent_partners:
        penalty += preferences.avoid_repeat_partners * 10.0
    
    # Check team B partnership
    p3, p4 = players[team_b_indices[0]], players[team_b_indices[1]]
    if p3.player_id in p4.recent_partners:
        penalty += preferences.avoid_repeat_partners * 10.0
    
    # Check opponents
    for i in team_a_indices:
        for j in team_b_indices:
            if players[i].player_id in players[j].recent_opponents:
                penalty += preferences.avoid_repeat_opponents * 5.0
    
    return penalty


def find_best_team_arrangement(
    players: List[PlayerStats],
    preferences: AssignmentPreferences,
    court_number: int = 0
) -> Tuple[Tuple[int, int], Tuple[int, int]]:
    """
    Find the best way to divide 4 players into 2 teams of 2.
    Returns indices of team A and team B.
    Considers: skill balance, partner/opponent variety, and court variety.
    """
    # All possible team arrangements (3 ways to divide 4 players into 2 pairs)
    arrangements = [
        ((0, 1), (2, 3)),
        ((0, 2), (1, 3)),
        ((0, 3), (1, 2))
    ]
    
    best_score = float('inf')
    best_arrangement = arrangements[0]
    
    for team_a_idx, team_b_idx in arrangements:
        team_a = [players[i] for i in team_a_idx]
        team_b = [players[i] for i in team_b_idx]
        
        # Calculate balance score
        balance_score = calculate_team_balance_score(team_a, team_b, preferences)
        
        # Calculate partnership penalty
        partnership_penalty = calculate_partnership_penalty(
            players, team_a_idx, team_b_idx, preferences
        )
        
        # Calculate court variety penalty (prefer courts players haven't used)
        court_penalty = 0.0
        for player in players:
            if court_number in player.courts_played:
                court_penalty += preferences.court_variety * 3.0
        
        total_score = balance_score * 100.0 + partnership_penalty + court_penalty
        
        if total_score < best_score:
            best_score = total_score
            best_arrangement = (team_a_idx, team_b_idx)
    
    return best_arrangement


def select_players_for_match_type(
    available_players: List[PlayerStats],
    match_type: MatchType,
    count: int
) -> List[PlayerStats]:
    """
    Select players for a specific match type preference.
    Returns up to 'count' sets of 4 players that match the type.
    """
    selected_groups = []
    
    if match_type == MatchType.MM:
        males = [p for p in available_players if p.gender == Gender.MALE]
        for i in range(0, min(len(males), count * 4), 4):
            if i + 4 <= len(males):
                selected_groups.append(males[i:i+4])
    
    elif match_type == MatchType.FF:
        females = [p for p in available_players if p.gender == Gender.FEMALE]
        for i in range(0, min(len(females), count * 4), 4):
            if i + 4 <= len(females):
                selected_groups.append(females[i:i+4])
    
    elif match_type == MatchType.MF:
        males = [p for p in available_players if p.gender == Gender.MALE]
        females = [p for p in available_players if p.gender == Gender.FEMALE]
        
        # Try to create mixed matches (2M + 2F each)
        for _ in range(count):
            if len(males) >= 2 and len(females) >= 2:
                group = males[:2] + females[:2]
                selected_groups.append(group)
                males = males[2:]
                females = females[2:]
            else:
                break
    
    return selected_groups


def auto_assign_courts(
    player_stats: List[PlayerStats],
    num_courts: int,
    current_round: int,
    preferences: AssignmentPreferences,
    locked_courts: Optional[Dict[int, List[int]]] = None
) -> Tuple[List[CourtAssignment], List[int]]:
    """
    Main auto-assignment algorithm.
    
    Args:
        player_stats: List of player statistics
        num_courts: Number of available courts
        current_round: Current round index
        preferences: Assignment preferences
        locked_courts: Dict of court_number -> [4 player IDs] for locked courts
    
    Returns:
        Tuple of (court_assignments, waiting_player_ids)
    """
    # Seed random for deterministic results
    random.seed(42 + current_round)
    
    # Filter locked players
    locked_player_ids = set()
    if locked_courts:
        for player_ids in locked_courts.values():
            locked_player_ids.update(player_ids)
    
    # Available players (not locked)
    available_players = [p for p in player_stats if p.player_id not in locked_player_ids]
    
    # Sort by priority score (highest first)
    available_players.sort(
        key=lambda p: calculate_priority_score(p, current_round, preferences),
        reverse=True
    )
    
    # Calculate how many courts we need to fill
    num_courts_to_fill = num_courts - (len(locked_courts) if locked_courts else 0)
    players_needed = num_courts_to_fill * 4
    
    # Select players for courts
    selected_players = []
    remaining_players = []
    
    if len(available_players) >= players_needed:
        selected_players = available_players[:players_needed]
        remaining_players = available_players[players_needed:]
    else:
        selected_players = available_players
        # Not enough players for all courts
    
    # Group selected players into courts (groups of 4)
    court_assignments = []
    court_number = 0
    
    # Add locked courts first
    if locked_courts:
        for locked_court_num, locked_player_ids_list in locked_courts.items():
            # Get player stats for locked players
            locked_players = [
                p for p in player_stats if p.player_id in locked_player_ids_list
            ]
            if len(locked_players) == 4:
                match_type = determine_match_type(locked_players)
                team_a_idx, team_b_idx = find_best_team_arrangement(locked_players, preferences, locked_court_num)
                
                court_assignments.append(CourtAssignment(
                    court_number=locked_court_num,
                    team_a=(locked_players[team_a_idx[0]].player_id, 
                           locked_players[team_a_idx[1]].player_id),
                    team_b=(locked_players[team_b_idx[0]].player_id,
                           locked_players[team_b_idx[1]].player_id),
                    match_type=match_type
                ))
                court_number = max(court_number, locked_court_num + 1)
    
    # Assign remaining courts
    for i in range(0, len(selected_players), 4):
        if i + 4 <= len(selected_players):
            # Skip court numbers already used by locked courts
            while locked_courts and court_number in locked_courts:
                court_number += 1
            
            group = selected_players[i:i+4]
            match_type = determine_match_type(group)
            
            # Find best team arrangement (considers skill balance, partners, opponents, and court variety)
            team_a_idx, team_b_idx = find_best_team_arrangement(group, preferences, court_number)
            
            court_assignments.append(CourtAssignment(
                court_number=court_number,
                team_a=(group[team_a_idx[0]].player_id, group[team_a_idx[1]].player_id),
                team_b=(group[team_b_idx[0]].player_id, group[team_b_idx[1]].player_id),
                match_type=match_type
            ))
            court_number += 1
    
    # Waiting players are those not assigned
    waiting_player_ids = [p.player_id for p in remaining_players]
    
    # Add any selected but not assigned players (if odd number)
    assigned_player_ids = set()
    for ca in court_assignments:
        assigned_player_ids.update([ca.team_a[0], ca.team_a[1], ca.team_b[0], ca.team_b[1]])
    
    for p in selected_players:
        if p.player_id not in assigned_player_ids:
            waiting_player_ids.append(p.player_id)
    
    return court_assignments, waiting_player_ids
