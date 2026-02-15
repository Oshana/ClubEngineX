from datetime import datetime
from typing import List

from app.database import get_db
from app.dependencies import get_current_super_admin
from app.models import Club, User, Player, Session, ClubSettings, SubscriptionStatus
from app.schemas import ClubCreate, ClubResponse, ClubUpdate, UserResponse
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import func

router = APIRouter(prefix="/super-admin", tags=["super-admin"])


@router.get("/clubs", response_model=List[ClubResponse])
def get_all_clubs(
    skip: int = 0,
    limit: int = 100,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """Get all clubs (super admin only)."""
    clubs = db.query(Club).offset(skip).limit(limit).all()
    return clubs


@router.get("/clubs/{club_id}", response_model=ClubResponse)
def get_club(
    club_id: int,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """Get a specific club by ID."""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found"
        )
    return club


@router.post("/clubs", response_model=ClubResponse, status_code=status.HTTP_201_CREATED)
def create_club(
    club: ClubCreate,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """Create a new club."""
    new_club = Club(**club.dict())
    db.add(new_club)
    db.commit()
    db.refresh(new_club)
    
    # Create default club settings
    settings = ClubSettings(
        club_id=new_club.id,
        ranking_system_type="CUSTOM",
        custom_levels=["Beginner", "Intermediate", "Advanced"]
    )
    db.add(settings)
    db.commit()
    
    return new_club


@router.patch("/clubs/{club_id}", response_model=ClubResponse)
def update_club(
    club_id: int,
    club_update: ClubUpdate,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """Update a club."""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found"
        )
    
    update_data = club_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(club, field, value)
    
    club.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(club)
    return club


@router.delete("/clubs/{club_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_club(
    club_id: int,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """Delete a club (soft delete by setting is_active to false)."""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found"
        )
    
    # Soft delete
    club.is_active = False
    db.commit()
    return None


@router.get("/clubs/{club_id}/stats")
def get_club_stats(
    club_id: int,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """Get statistics for a specific club."""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found"
        )
    
    total_players = db.query(func.count(Player.id)).filter(
        Player.club_id == club_id,
        Player.is_active == True
    ).scalar()
    
    total_admins = db.query(func.count(User.id)).filter(
        User.club_id == club_id,
        User.is_admin == True,
        User.is_active == True
    ).scalar()
    
    total_sessions = db.query(func.count(Session.id)).filter(
        Session.club_id == club_id
    ).scalar()
    
    active_sessions = db.query(func.count(Session.id)).filter(
        Session.club_id == club_id,
        Session.status == "active"
    ).scalar()
    
    return {
        "club_id": club_id,
        "club_name": club.name,
        "total_players": total_players,
        "total_admins": total_admins,
        "total_sessions": total_sessions,
        "active_sessions": active_sessions,
        "subscription_status": club.subscription_status,
        "subscription_end_date": club.subscription_end_date
    }


@router.get("/clubs/{club_id}/admins", response_model=List[UserResponse])
def get_club_admins(
    club_id: int,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """Get all admins for a specific club."""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found"
        )
    
    admins = db.query(User).filter(
        User.club_id == club_id,
        User.is_admin == True
    ).all()
    
    return admins


@router.get("/dashboard")
def get_super_admin_dashboard(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """Get super admin dashboard overview."""
    total_clubs = db.query(func.count(Club.id)).filter(Club.is_active == True).scalar()
    active_subscriptions = db.query(func.count(Club.id)).filter(
        Club.is_active == True,
        Club.subscription_status == "active"
    ).scalar()
    trial_subscriptions = db.query(func.count(Club.id)).filter(
        Club.is_active == True,
        Club.subscription_status == "trial"
    ).scalar()
    
    total_players = db.query(func.count(Player.id)).filter(Player.is_active == True).scalar()
    total_sessions = db.query(func.count(Session.id)).scalar()
    
    # Get recent clubs
    recent_clubs = db.query(Club).order_by(Club.created_at.desc()).limit(5).all()
    
    return {
        "total_clubs": total_clubs,
        "active_subscriptions": active_subscriptions,
        "trial_subscriptions": trial_subscriptions,
        "total_players": total_players,
        "total_sessions": total_sessions,
        "recent_clubs": [
            {
                "id": club.id,
                "name": club.name,
                "subscription_status": club.subscription_status,
                "created_at": club.created_at
            }
            for club in recent_clubs
        ]
    }
