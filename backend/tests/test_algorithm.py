import pytest
from app.algorithm import (AssignmentPreferences, PlayerStats,
                           auto_assign_courts, calculate_priority_score,
                           determine_match_type, find_best_team_arrangement)
from app.models import Gender, MatchType


def test_calculate_priority_score():
    """Test priority score calculation."""
    prefs = AssignmentPreferences()
    
    # Player who never played should have high priority
    player1 = PlayerStats(
        player_id=1,
        name="Player 1",
        gender=Gender.MALE,
        numeric_rank=5.0,
        matches_played=0,
        rounds_sitting_out=3,
        last_played_round=-1,
        recent_partners=set(),
        recent_opponents=set()
    )
    
    score1 = calculate_priority_score(player1, current_round=3, preferences=prefs)
    
    # Player who played recently should have lower priority
    player2 = PlayerStats(
        player_id=2,
        name="Player 2",
        gender=Gender.MALE,
        numeric_rank=5.0,
        matches_played=3,
        rounds_sitting_out=0,
        last_played_round=2,
        recent_partners=set(),
        recent_opponents=set()
    )
    
    score2 = calculate_priority_score(player2, current_round=3, preferences=prefs)
    
    assert score1 > score2, "Player who never played should have higher priority"


def test_determine_match_type():
    """Test match type determination."""
    # All males
    males = [
        PlayerStats(i, f"Player {i}", Gender.MALE, 5.0, 0, 0, -1, set(), set())
        for i in range(1, 5)
    ]
    assert determine_match_type(males) == MatchType.MM
    
    # All females
    females = [
        PlayerStats(i, f"Player {i}", Gender.FEMALE, 5.0, 0, 0, -1, set(), set())
        for i in range(1, 5)
    ]
    assert determine_match_type(females) == MatchType.FF
    
    # Mixed
    mixed = [
        PlayerStats(1, "Player 1", Gender.MALE, 5.0, 0, 0, -1, set(), set()),
        PlayerStats(2, "Player 2", Gender.MALE, 5.0, 0, 0, -1, set(), set()),
        PlayerStats(3, "Player 3", Gender.FEMALE, 5.0, 0, 0, -1, set(), set()),
        PlayerStats(4, "Player 4", Gender.FEMALE, 5.0, 0, 0, -1, set(), set()),
    ]
    assert determine_match_type(mixed) == MatchType.MF


def test_find_best_team_arrangement():
    """Test team arrangement logic."""
    prefs = AssignmentPreferences(balance_skill=1.0)
    
    # Create players with different ranks
    players = [
        PlayerStats(1, "Player 1", Gender.MALE, 10.0, 0, 0, -1, set(), set()),  # High rank
        PlayerStats(2, "Player 2", Gender.MALE, 2.0, 0, 0, -1, set(), set()),   # Low rank
        PlayerStats(3, "Player 3", Gender.MALE, 9.0, 0, 0, -1, set(), set()),   # High rank
        PlayerStats(4, "Player 4", Gender.MALE, 3.0, 0, 0, -1, set(), set()),   # Low rank
    ]
    
    team_a_idx, team_b_idx = find_best_team_arrangement(players, prefs)
    
    # Calculate team averages
    team_a_avg = (players[team_a_idx[0]].numeric_rank + players[team_a_idx[1]].numeric_rank) / 2
    team_b_avg = (players[team_b_idx[0]].numeric_rank + players[team_b_idx[1]].numeric_rank) / 2
    
    # Teams should be balanced (both around 6.0)
    assert abs(team_a_avg - team_b_avg) < 2.0, "Teams should be balanced"


def test_auto_assign_courts_basic():
    """Test basic court assignment."""
    # Create 8 players (2 courts worth)
    players = [
        PlayerStats(i, f"Player {i}", Gender.MALE, 5.0, 0, 0, -1, set(), set())
        for i in range(1, 9)
    ]
    
    prefs = AssignmentPreferences()
    assignments, waiting = auto_assign_courts(players, num_courts=2, current_round=0, preferences=prefs)
    
    assert len(assignments) == 2, "Should create 2 court assignments"
    assert len(waiting) == 0, "No players should be waiting"
    
    # Check each assignment has 4 players
    for assignment in assignments:
        assert assignment.team_a[0] != assignment.team_a[1], "Team A should have 2 different players"
        assert assignment.team_b[0] != assignment.team_b[1], "Team B should have 2 different players"


def test_auto_assign_courts_with_waiting():
    """Test court assignment with extra players."""
    # Create 10 players but only 2 courts (8 players can play)
    players = [
        PlayerStats(i, f"Player {i}", Gender.MALE, 5.0, 0, 0, -1, set(), set())
        for i in range(1, 11)
    ]
    
    prefs = AssignmentPreferences()
    assignments, waiting = auto_assign_courts(players, num_courts=2, current_round=0, preferences=prefs)
    
    assert len(assignments) == 2, "Should create 2 court assignments"
    assert len(waiting) == 2, "2 players should be waiting"


def test_auto_assign_courts_with_locked():
    """Test court assignment with locked courts."""
    players = [
        PlayerStats(i, f"Player {i}", Gender.MALE, 5.0, 0, 0, -1, set(), set())
        for i in range(1, 13)
    ]
    
    # Lock court 0 with players 1-4
    locked_courts = {0: [1, 2, 3, 4]}
    
    prefs = AssignmentPreferences()
    assignments, waiting = auto_assign_courts(
        players,
        num_courts=3,
        current_round=0,
        preferences=prefs,
        locked_courts=locked_courts
    )
    
    # Should have 3 assignments total (1 locked + 2 new)
    assert len(assignments) == 3, "Should create 3 court assignments"
    
    # Check locked court is included
    locked_assignment = next((a for a in assignments if a.court_number == 0), None)
    assert locked_assignment is not None, "Locked court should be in assignments"
    
    # Verify locked court has correct players
    locked_players = set([
        locked_assignment.team_a[0],
        locked_assignment.team_a[1],
        locked_assignment.team_b[0],
        locked_assignment.team_b[1]
    ])
    assert locked_players == {1, 2, 3, 4}, "Locked court should have correct players"


def test_auto_assign_deterministic():
    """Test that algorithm is deterministic."""
    players = [
        PlayerStats(i, f"Player {i}", Gender.MALE, 5.0, 0, 0, -1, set(), set())
        for i in range(1, 9)
    ]
    
    prefs = AssignmentPreferences()
    
    # Run twice with same inputs
    assignments1, waiting1 = auto_assign_courts(players, num_courts=2, current_round=0, preferences=prefs)
    assignments2, waiting2 = auto_assign_courts(players, num_courts=2, current_round=0, preferences=prefs)
    
    # Results should be identical
    assert len(assignments1) == len(assignments2)
    assert waiting1 == waiting2
    
    for a1, a2 in zip(assignments1, assignments2):
        assert a1.court_number == a2.court_number
        assert a1.team_a == a2.team_a
        assert a1.team_b == a2.team_b


def test_avoid_recent_partners():
    """Test that algorithm avoids recent partners."""
    # Create 4 players where 1 and 2 were recent partners
    players = [
        PlayerStats(1, "Player 1", Gender.MALE, 5.0, 1, 0, 0, {2}, set()),
        PlayerStats(2, "Player 2", Gender.MALE, 5.0, 1, 0, 0, {1}, set()),
        PlayerStats(3, "Player 3", Gender.MALE, 5.0, 1, 0, 0, set(), set()),
        PlayerStats(4, "Player 4", Gender.MALE, 5.0, 1, 0, 0, set(), set()),
    ]
    
    prefs = AssignmentPreferences(avoid_repeat_partners=1.0)
    assignments, waiting = auto_assign_courts(players, num_courts=1, current_round=1, preferences=prefs)
    
    assert len(assignments) == 1
    assignment = assignments[0]
    
    # Players 1 and 2 should NOT be on the same team
    team_a_ids = set(assignment.team_a)
    team_b_ids = set(assignment.team_b)
    
    # Either both on different teams or arrangement has changed
    assert not (1 in team_a_ids and 2 in team_a_ids), "Recent partners should not be on same team"
    assert not (1 in team_b_ids and 2 in team_b_ids), "Recent partners should not be on same team"


def test_insufficient_players():
    """Test handling of insufficient players."""
    # Only 2 players (need 4 for one court)
    players = [
        PlayerStats(1, "Player 1", Gender.MALE, 5.0, 0, 0, -1, set(), set()),
        PlayerStats(2, "Player 2", Gender.MALE, 5.0, 0, 0, -1, set(), set()),
    ]
    
    prefs = AssignmentPreferences()
    assignments, waiting = auto_assign_courts(players, num_courts=1, current_round=0, preferences=prefs)
    
    assert len(assignments) == 0, "Should not create any assignments with insufficient players"
    assert len(waiting) == 2, "All players should be waiting"
