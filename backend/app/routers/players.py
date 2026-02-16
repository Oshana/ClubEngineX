from typing import List, Optional

from app.database import get_db
from app.dependencies import get_current_club_admin
from app.models import Player, User
from app.schemas import PlayerCreate, PlayerResponse, PlayerUpdate
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/players", tags=["players"])


@router.get("", response_model=List[PlayerResponse])
def get_players(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_club_admin)
):
    """Get all players for the current user's club with optional filters."""
    query = db.query(Player)
    
    # Filter by club_id if user is not a super admin
    if current_user.club_id is not None:
        query = query.filter(Player.club_id == current_user.club_id)
    
    if search:
        query = query.filter(Player.full_name.ilike(f"%{search}%"))
    
    if is_active is not None:
        query = query.filter(Player.is_active == is_active)
    
    players = query.offset(skip).limit(limit).all()
    return players


@router.get("/{player_id}", response_model=PlayerResponse)
def get_player(
    player_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_club_admin)
):
    """Get a specific player by ID."""
    query = db.query(Player).filter(Player.id == player_id)
    
    # Filter by club_id if user is not a super admin
    if current_user.club_id is not None:
        query = query.filter(Player.club_id == current_user.club_id)
    
    player = query.first()
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found"
        )
    return player


@router.post("", response_model=PlayerResponse, status_code=status.HTTP_201_CREATED)
def create_player(
    player: PlayerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_club_admin)
):
    """Create a new player for the current user's club."""
    if current_user.club_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be associated with a club to create players"
        )
    
    player_data = player.dict()
    player_data['club_id'] = current_user.club_id
    
    new_player = Player(**player_data)
    db.add(new_player)
    db.commit()
    db.refresh(new_player)
    return new_player


@router.patch("/{player_id}", response_model=PlayerResponse)
def update_player(
    player_id: int,
    player_update: PlayerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_club_admin)
):
    """Update a player."""
    query = db.query(Player).filter(Player.id == player_id)
    
    # Filter by club_id if user is not a super admin
    if current_user.club_id is not None:
        query = query.filter(Player.club_id == current_user.club_id)
    
    player = query.first()
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found"
        )
    
    # Update only provided fields
    update_data = player_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(player, field, value)
    
    db.commit()
    db.refresh(player)
    return player


@router.delete("/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_player(
    player_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_club_admin)
):
    """Delete a player (soft delete by setting is_active=False)."""
    query = db.query(Player).filter(Player.id == player_id)
    
    # Filter by club_id if user is not a super admin
    if current_user.club_id is not None:
        query = query.filter(Player.club_id == current_user.club_id)
    
    player = query.first()
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found"
        )
    
    player.is_active = False
    db.commit()
    return None
