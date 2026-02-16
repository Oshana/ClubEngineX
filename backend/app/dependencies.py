from app.auth import decode_access_token
from app.database import get_db
from app.models import User, UserRole
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    
    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Allow super admins, club admins, and session managers (backward compatibility)."""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN, UserRole.SESSION_MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return current_user


async def get_current_super_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin permissions required",
        )
    return current_user


async def get_current_club_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Allow super admins and club admins."""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Club admin permissions required",
        )
    return current_user


async def get_current_session_manager(
    current_user: User = Depends(get_current_user)
) -> User:
    """Allow any admin role."""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN, UserRole.SESSION_MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Session manager permissions required",
        )
    return current_user
