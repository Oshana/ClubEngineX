from datetime import datetime
from typing import List

from app.auth import get_password_hash
from app.database import get_db
from app.dependencies import get_current_admin, get_current_club_admin
from app.models import ClubSettings, RankingSystemType, User, UserRole
from app.schemas import (AvailableLevelsResponse, ClubSettingsCreate,
                         ClubSettingsResponse, ClubSettingsUpdate, UserCreate,
                         UserResponse, UserUpdate)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/club-settings", tags=["club-settings"])


@router.get("", response_model=ClubSettingsResponse)
def get_club_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_club_admin)
):
    """Get club settings for the current user's club."""
    if current_user.club_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be associated with a club"
        )
    
    settings = db.query(ClubSettings).filter(ClubSettings.club_id == current_user.club_id).first()
    if not settings:
        # Create default settings if none exist
        settings = ClubSettings(
            club_id=current_user.club_id,
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
    current_user: User = Depends(get_current_club_admin)
):
    """Update club settings for the current user's club."""
    if current_user.club_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be associated with a club"
        )
    
    settings = db.query(ClubSettings).filter(ClubSettings.club_id == current_user.club_id).first()
    if not settings:
        # Create new settings if none exist
        settings = ClubSettings(club_id=current_user.club_id)
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
    if current_user.club_id is None:
        return AvailableLevelsResponse(levels=[str(i) for i in range(1, 11)], recent_sessions=[])
    
    settings = db.query(ClubSettings).filter(ClubSettings.club_id == current_user.club_id).first()
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


# Session Manager management endpoints (club admins only)

@router.get("/session-managers", response_model=List[UserResponse])
def get_session_managers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_club_admin)
):
    """Get all session managers for the current club."""
    if not current_user.club_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a club"
        )
    
    managers = db.query(User).filter(
        User.club_id == current_user.club_id,
        User.role == UserRole.SESSION_MANAGER
    ).all()
    return managers


@router.post("/session-managers", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_session_manager(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_club_admin)
):
    """Create a new session manager for the current club."""
    if not current_user.club_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a club"
        )
    
    # Check if username or email already exists
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | 
        ((User.email == user_data.email) & (user_data.email != None))
    ).first()
    if existing_user:
        if existing_user.username == user_data.username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
    
    # Force role to be SESSION_MANAGER
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        is_email_verified=False if user_data.email else None,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        club_id=current_user.club_id,
        role=UserRole.SESSION_MANAGER,
        is_admin=True,  # Backward compatibility
        is_super_admin=False,
        is_active=True,
        created_at=datetime.utcnow()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.patch("/session-managers/{user_id}", response_model=UserResponse)
def update_session_manager(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_club_admin)
):
    """Update a session manager's information (club admins can edit session managers in their club)."""
    if not current_user.club_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a club"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Can only edit session managers in the same club
    if user.club_id != current_user.club_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot edit users from other clubs"
        )
    
    if user.role != UserRole.SESSION_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only edit session managers"
        )
    
    # Update fields if provided
    if user_update.username is not None:
        # Check if username is taken by another user
        existing = db.query(User).filter(
            User.username == user_update.username,
            User.id != user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        user.username = user_update.username
    
    if user_update.email is not None:
        # Check if email is taken by another user
        existing = db.query(User).filter(
            User.email == user_update.email,
            User.id != user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        user.email = user_update.email
        user.is_email_verified = False  # Reset verification when email changes
    
    if user_update.password is not None:
        user.hashed_password = get_password_hash(user_update.password)
    
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    
    # Don't allow changing role
    if user_update.role is not None and user_update.role != UserRole.SESSION_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot change session manager role"
        )
    
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    
    db.commit()
    db.refresh(user)
    return user


@router.delete("/session-managers/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session_manager(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_club_admin)
):
    """Delete a session manager (club admins can delete session managers in their club)."""
    if not current_user.club_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a club"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Can only delete session managers in the same club
    if user.club_id != current_user.club_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete users from other clubs"
        )
    
    if user.role != UserRole.SESSION_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only delete session managers"
        )
    
    # Cannot delete yourself
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete yourself"
        )
    
    db.delete(user)
    db.commit()
    return None
