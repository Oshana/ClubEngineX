from datetime import datetime
from typing import List

from app.auth import get_password_hash
from app.database import get_db
from app.dependencies import get_current_super_admin
from app.models import (Club, ClubSettings, Player, Session,
                        SubscriptionStatus, User, UserRole, RankingSystemType)
from app.schemas import (ClubCreate, ClubResponse, ClubUpdate, UserCreate,
                         UserResponse, UserUpdate)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session as DBSession

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
    # Check if club name already exists
    existing_club = db.query(Club).filter(Club.name == club.name).first()
    if existing_club:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A club with this name already exists"
        )
    
    # Check if contact email already exists (if provided)
    if club.contact_email:
        existing_email = db.query(Club).filter(Club.contact_email == club.contact_email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A club with this email already exists"
            )
    
    new_club = Club(**club.dict())
    db.add(new_club)
    db.commit()
    db.refresh(new_club)
    
    # Create default club settings
    settings = ClubSettings(
        club_id=new_club.id,
        ranking_system_type=RankingSystemType.CUSTOM,
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
    
    # Check if updating name and it conflicts with another club
    if 'name' in update_data:
        existing_club = db.query(Club).filter(
            Club.name == update_data['name'],
            Club.id != club_id
        ).first()
        if existing_club:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A club with this name already exists"
            )
    
    # Check if updating email and it conflicts with another club
    if 'contact_email' in update_data and update_data['contact_email']:
        existing_email = db.query(Club).filter(
            Club.contact_email == update_data['contact_email'],
            Club.id != club_id
        ).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A club with this email already exists"
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
    """Permanently delete a club and all related data."""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found"
        )
    
    # Hard delete
    db.delete(club)
    db.commit()
    return None


@router.patch("/clubs/{club_id}/toggle-active", response_model=ClubResponse)
def toggle_club_active(
    club_id: int,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """Toggle club active status (deactivate/reactivate)."""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found"
        )
    
    club.is_active = not club.is_active
    club.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(club)
    return club


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


# Club admin management endpoints

@router.get("/clubs/{club_id}/admins", response_model=List[UserResponse])
def get_club_admins(
    club_id: int,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """Get all club admins for a specific club."""
    # Verify club exists
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found"
        )
    
    admins = db.query(User).filter(
        User.club_id == club_id,
        User.role == UserRole.CLUB_ADMIN
    ).all()
    return admins


@router.post("/clubs/{club_id}/admins", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_club_admin(
    club_id: int,
    user_data: UserCreate,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """Create a new club admin for a specific club."""
    # Verify club exists
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found"
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
    
    # Force role to be CLUB_ADMIN
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        is_email_verified=False if user_data.email else None,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        club_id=club_id,
        role=UserRole.CLUB_ADMIN,
        is_admin=True,  # Backward compatibility
        is_super_admin=False,
        is_active=True,
        created_at=datetime.utcnow()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """Update a user's information (super admin can edit club admins)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Super admin can only edit club admins and session managers, not other super admins
    if user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot edit other super admins"
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
    
    if user_update.role is not None:
        # Don't allow promoting to super admin
        if user_update.role == UserRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot promote users to super admin"
            )
        user.role = user_update.role
        # Update backward compatibility fields
        user.is_admin = user_update.role in [UserRole.CLUB_ADMIN, UserRole.SESSION_MANAGER]
    
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """Delete a user (super admin can delete club admins and session managers)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Cannot delete super admins
    if user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete super admins"
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
