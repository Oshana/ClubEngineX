import enum
from datetime import datetime

from app.database import Base
from sqlalchemy import ARRAY, Boolean, Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import Float, ForeignKey, Integer, String, false
from sqlalchemy.orm import relationship


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    UNSPECIFIED = "unspecified"


class SessionStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ENDED = "ended"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    LEFT = "left"


class MatchType(str, enum.Enum):
    MM = "MM"  # Male vs Male
    MF = "MF"  # Mixed
    FF = "FF"  # Female vs Female
    OTHER = "OTHER"


class RankingSystemType(str, enum.Enum):
    INT_RANGE = "int_range"  # e.g., 1-10
    LETTER_RANGE = "letter_range"  # e.g., A-F
    CUSTOM = "custom"  # Manually defined levels


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to player profile
    player = relationship("Player", back_populates="user", uselist=False)


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    full_name = Column(String, nullable=False)
    gender = Column(SQLEnum(Gender, native_enum=True, values_callable=lambda obj: [e.value for e in obj]), default=Gender.UNSPECIFIED)
    rank_system = Column(String, nullable=True)  # e.g., "DublinDiv", "RegionLetters"
    rank_value = Column(String, nullable=True)  # e.g., "1", "A"
    numeric_rank = Column(Float, nullable=True)  # Derived number for sorting
    skill_tier = Column(Integer, nullable=True)  # 1-5
    level = Column(String, nullable=True)  # Player's division according to club ranking system
    contact_number = Column(String, nullable=True)
    address = Column(String, nullable=True)
    emergency_contact_name = Column(String, nullable=True)
    emergency_contact_number = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_temp = Column(Boolean, default=False, nullable=False, server_default=false())
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="player")
    attendances = relationship("Attendance", back_populates="player")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    match_duration_minutes = Column(Integer, default=15)
    number_of_courts = Column(Integer, nullable=False)
    status = Column(SQLEnum(SessionStatus, native_enum=True, values_callable=lambda obj: [e.value for e in obj]), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)

    # Relationships
    attendances = relationship("Attendance", back_populates="session", cascade="all, delete-orphan")
    rounds = relationship("Round", back_populates="session", cascade="all, delete-orphan")


class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    status = Column(SQLEnum(AttendanceStatus, native_enum=True, values_callable=lambda obj: [e.value for e in obj]), default=AttendanceStatus.PRESENT)
    check_in_time = Column(DateTime, default=datetime.utcnow)

    # Relationships
    session = relationship("Session", back_populates="attendances")
    player = relationship("Player", back_populates="attendances")


class Round(Base):
    __tablename__ = "rounds"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    round_index = Column(Integer, nullable=False)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    session = relationship("Session", back_populates="rounds")
    court_assignments = relationship("CourtAssignment", back_populates="round", cascade="all, delete-orphan", order_by="CourtAssignment.court_number")


class CourtAssignment(Base):
    __tablename__ = "court_assignments"

    id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("rounds.id"), nullable=False)
    court_number = Column(Integer, nullable=False)
    team_a_player1_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    team_a_player2_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    team_b_player1_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    team_b_player2_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    match_type = Column(SQLEnum(MatchType, native_enum=True, values_callable=lambda obj: [e.value for e in obj]), default=MatchType.OTHER)
    locked = Column(Boolean, default=False)

    # Relationships
    round = relationship("Round", back_populates="court_assignments")
    team_a_player1 = relationship("Player", foreign_keys=[team_a_player1_id])
    team_a_player2 = relationship("Player", foreign_keys=[team_a_player2_id])
    team_b_player1 = relationship("Player", foreign_keys=[team_b_player1_id])
    team_b_player2 = relationship("Player", foreign_keys=[team_b_player2_id])


class ClubSettings(Base):
    __tablename__ = "club_settings"

    id = Column(Integer, primary_key=True, index=True)
    ranking_system_type = Column(SQLEnum(RankingSystemType, native_enum=True, values_callable=lambda obj: [e.value for e in obj]), default=RankingSystemType.CUSTOM)
    int_range_start = Column(Integer, nullable=True)  # For INT_RANGE type
    int_range_end = Column(Integer, nullable=True)  # For INT_RANGE type
    letter_range_start = Column(String, nullable=True)  # For LETTER_RANGE type
    letter_range_end = Column(String, nullable=True)  # For LETTER_RANGE type
    custom_levels = Column(ARRAY(String), nullable=True)  # For CUSTOM type, e.g., ["Beginner", "Intermediate", "Advanced"]
    auto_choose_match_types = Column(Boolean, default=False)  # Auto-select match types for rounds
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
