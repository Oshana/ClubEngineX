import sys

sys.path.insert(0, '.')
from app.database import SessionLocal
from app.models import Club, Player
from sqlalchemy import func

db = SessionLocal()
try:
    # Find the My Test club
    club = db.query(Club).filter(Club.name == 'My Test').first()
    if club:
        print(f'Club found: {club.name} (ID: {club.id})')
        
        # Count players in this club
        player_count = db.query(func.count(Player.id)).filter(
            Player.club_id == club.id,
            Player.is_active == True
        ).scalar()
        
        print(f'Total active players in {club.name}: {player_count}')
        
        # Also check for temporary players
        temp_count = db.query(func.count(Player.id)).filter(
            Player.club_id == club.id,
            Player.is_temp == True
        ).scalar()
        
        print(f'Temporary players: {temp_count}')
        
        # Total including temp
        total_count = db.query(func.count(Player.id)).filter(
            Player.club_id == club.id
        ).scalar()
        
        print(f'Total players (including temp/inactive): {total_count}')
    else:
        print('My Test club not found')
        
        # List all clubs
        clubs = db.query(Club).all()
        print('\nAvailable clubs:')
        for c in clubs:
            count = db.query(func.count(Player.id)).filter(Player.club_id == c.id).scalar()
            print(f'  - {c.name} (ID: {c.id}): {count} players')
finally:
    db.close()
