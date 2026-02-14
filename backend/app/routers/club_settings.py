from typing import List

from app.database import get_db
from app.dependencies import get_current_admin
from app.models import ClubSettings, RankingSystemType, User
from app.schemas import (AvailableLevelsResponse, ClubSettingsCreate,
                         ClubSettingsResponse, ClubSettingsUpdate)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/club-settings", tags=["club-settings"])


@router.get("", response_model=ClubSettingsResponse)
def get_club_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get club settings."""
    settings = db.query(ClubSettings).first()
    if not settings:
        # Create default settings if none exist
        settings = ClubSettings(
            ranking_system_type=RankingSystemType.INT_RANGE,
            int_range_start=1,
            int_range_end=10
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("", response_model=ClubSettingsResponse)
def update_club_settings(
    settings_update: ClubSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update club settings."""
    settings = db.query(ClubSettings).first()
    if not settings:
        # Create new settings if none exist
        settings = ClubSettings()
        db.add(settings)
    
    update_data = settings_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)
    
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/levels", response_model=AvailableLevelsResponse)
def get_available_levels(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get available levels based on current club settings."""
    settings = db.query(ClubSettings).first()
    if not settings:
        return AvailableLevelsResponse(levels=[str(i) for i in range(1, 11)], recent_sessions=[])
    
    levels = []
    if settings.ranking_system_type == RankingSystemType.INT_RANGE:
        if settings.int_range_start and settings.int_range_end:
            levels = [str(i) for i in range(settings.int_range_start, settings.int_range_end + 1)]
    elif settings.ranking_system_type == RankingSystemType.LETTER_RANGE:
        if settings.letter_range_start and settings.letter_range_end:
            start_ord = ord(settings.letter_range_start.upper())
            end_ord = ord(settings.letter_range_end.upper())
            levels = [chr(i) for i in range(start_ord, end_ord + 1)]
    elif settings.ranking_system_type == RankingSystemType.CUSTOM:
        levels = settings.custom_levels or ["Beginner", "Intermediate", "Advanced"]
    
    return AvailableLevelsResponse(levels=levels, recent_sessions=[])
