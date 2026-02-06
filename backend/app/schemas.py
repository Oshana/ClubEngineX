from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


# Enums
class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    UNSPECIFIED = "unspecified"


class SessionStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ENDED = "ended"


class AttendanceStatus(str, Enum):
    PRESENT = "present"
    LEFT = "left"


class MatchType(str, Enum):
    MM = "MM"
    MF = "MF"
    FF = "FF"
    OTHER = "OTHER"


class RankingSystemType(str, Enum):
    INT_RANGE = "int_range"
    LETTER_RANGE = "letter_range"
    CUSTOM = "custom"


# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    is_admin: bool = False


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_admin: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Player Schemas
class PlayerBase(BaseModel):
    full_name: str
    gender: Gender = Gender.UNSPECIFIED
    rank_system: Optional[str] = None
    rank_value: Optional[str] = None
    numeric_rank: Optional[float] = None
    skill_tier: Optional[int] = None
    level: Optional[str] = None
    contact_number: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_number: Optional[str] = None
    is_active: bool = True
    is_temp: bool = False


class PlayerCreate(PlayerBase):
    user_id: Optional[int] = None


class PlayerUpdate(BaseModel):
    full_name: Optional[str] = None
    gender: Optional[Gender] = None
    rank_system: Optional[str] = None
    rank_value: Optional[str] = None
    numeric_rank: Optional[float] = None
    skill_tier: Optional[int] = None
    level: Optional[str] = None
    contact_number: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_number: Optional[str] = None
    is_active: Optional[bool] = None


class PlayerResponse(PlayerBase):
    id: int
    user_id: Optional[int] = None
    is_temp: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Session Schemas
class SessionBase(BaseModel):
    name: str
    match_duration_minutes: int = 15
    number_of_courts: int


class SessionCreate(SessionBase):
    pass


class SessionUpdate(BaseModel):
    name: Optional[str] = None
    match_duration_minutes: Optional[int] = None
    number_of_courts: Optional[int] = None
    status: Optional[SessionStatus] = None


class SessionResponse(SessionBase):
    id: int
    date: datetime
    status: SessionStatus
    created_at: datetime
    ended_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Attendance Schemas
class AttendanceCreate(BaseModel):
    player_ids: List[int]


class AttendanceResponse(BaseModel):
    id: int
    session_id: int
    player_id: int
    status: AttendanceStatus
    check_in_time: datetime

    class Config:
        from_attributes = True


# Round Schemas
class CourtAssignmentBase(BaseModel):
    court_number: int
    team_a_player1_id: Optional[int] = None
    team_a_player2_id: Optional[int] = None
    team_b_player1_id: Optional[int] = None
    team_b_player2_id: Optional[int] = None
    match_type: MatchType = MatchType.OTHER
    locked: bool = False


class CourtAssignmentCreate(CourtAssignmentBase):
    pass


class CourtAssignmentUpdate(BaseModel):
    team_a_player1_id: Optional[int] = None
    team_a_player2_id: Optional[int] = None
    team_b_player1_id: Optional[int] = None
    team_b_player2_id: Optional[int] = None
    match_type: Optional[MatchType] = None
    locked: Optional[bool] = None


class CourtAssignmentResponse(CourtAssignmentBase):
    id: int
    round_id: int

    class Config:
        from_attributes = True


class RoundCreate(BaseModel):
    session_id: int
    court_assignments: List[CourtAssignmentCreate]


class RoundResponse(BaseModel):
    id: int
    session_id: int
    round_index: int
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    court_assignments: List[CourtAssignmentResponse]

    class Config:
        from_attributes = True


# Auto-assignment Schemas
class AutoAssignmentPreferences(BaseModel):
    desired_mm: int = 0
    desired_mf: int = 0
    desired_ff: int = 0
    prioritize_waiting: float = 1.0
    prioritize_equal_matches: float = 1.0
    avoid_repeat_partners: float = 0.5
    avoid_repeat_opponents: float = 0.3
    balance_skill: float = 0.5


class AutoAssignmentRequest(BaseModel):
    session_id: int
    preferences: AutoAssignmentPreferences = AutoAssignmentPreferences()
    court_assignments: Optional[List[CourtAssignmentCreate]] = None


# Stats Schemas
class PlayerSessionStats(BaseModel):
    player_id: int
    player_name: str
    matches_played: int
    rounds_sitting_out: int
    waiting_time_minutes: float
    partners: List[str]
    opponents: List[str]
    opponents_count: dict
    match_type_counts: dict
    courts_played: List[int]  # Court numbers this player has used


class SessionStats(BaseModel):
    session_id: int
    total_rounds: int
    player_stats: List[PlayerSessionStats]
    fairness_score: float
    avg_matches_per_player: float
    avg_waiting_time: float


class PlayerProfileStats(BaseModel):
    player_id: int
    player_name: str
    total_matches: int
    total_sessions: int
    match_type_counts: dict
    frequent_partners: List[dict]
    frequent_opponents: List[dict]


# Club Settings Schemas
class ClubSettingsBase(BaseModel):
    ranking_system_type: RankingSystemType = RankingSystemType.CUSTOM
    int_range_start: Optional[int] = None
    int_range_end: Optional[int] = None
    letter_range_start: Optional[str] = None
    letter_range_end: Optional[str] = None
    custom_levels: Optional[List[str]] = None


class ClubSettingsCreate(ClubSettingsBase):
    pass


class ClubSettingsUpdate(BaseModel):
    ranking_system_type: Optional[RankingSystemType] = None
    int_range_start: Optional[int] = None
    int_range_end: Optional[int] = None
    letter_range_start: Optional[str] = None
    letter_range_end: Optional[str] = None
    custom_levels: Optional[List[str]] = None


class ClubSettingsResponse(ClubSettingsBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AvailableLevelsResponse(BaseModel):
    levels: List[str]
    recent_sessions: List[dict]
