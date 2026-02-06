"""
Seed script to populate the database with initial data:
- 1 admin user
- 20 sample players
- 1 sample session
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import random

from app.auth import get_password_hash
from app.database import SessionLocal
from app.models import Gender, Player
from app.models import Session as SessionModel
from app.models import SessionStatus, User


def seed_database():
    db = SessionLocal()
    
    try:
        print("Starting database seeding...")
        
        # Create admin user
        print("Creating admin user...")
        admin = User(
            email="admin@badmintonclub.com",
            hashed_password=get_password_hash("Admin123!"),
            full_name="Admin User",
            is_admin=True,
            is_active=True
        )
        db.add(admin)
        db.flush()
        
        # Create sample players with varied attributes
        print("Creating 20 sample players...")
        
        first_names = [
            "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
            "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
            "Thomas", "Sarah", "Charles", "Karen"
        ]
        
        last_names = [
            "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
            "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
            "Thomas", "Taylor", "Moore", "Jackson", "Martin"
        ]
        
        genders = ["male", "female"]
        rank_systems = ["DublinDiv", "RegionLetters"]
        
        players = []
        for i in range(20):
            gender = genders[i % 2]  # Alternate male/female
            full_name = f"{first_names[i]} {last_names[i]}"
            
            # Generate rank
            if i < 10:
                rank_system = "DublinDiv"
                rank_value = str((i % 10) + 1)
                numeric_rank = float(rank_value)
            else:
                rank_system = "RegionLetters"
                rank_value = chr(65 + (i % 10))  # A, B, C, etc.
                numeric_rank = float(ord(rank_value) - 64)
            
            skill_tier = (i % 5) + 1  # 1-5
            
            # Create user account for first 10 players
            user = None
            if i < 10:
                user = User(
                    email=f"player{i+1}@badmintonclub.com",
                    hashed_password=get_password_hash("Player123!"),
                    full_name=full_name,
                    is_admin=False,
                    is_active=True
                )
                db.add(user)
                db.flush()
            
            player = Player(
                user_id=user.id if user else None,
                full_name=full_name,
                gender=gender,
                rank_system=rank_system,
                rank_value=rank_value,
                numeric_rank=numeric_rank,
                skill_tier=skill_tier,
                is_active=True
            )
            db.add(player)
            players.append(player)
        
        db.flush()
        print(f"Created {len(players)} players")
        
        # Create a sample session
        print("Creating sample session...")
        session = SessionModel(
            name="Monday Night Badminton",
            match_duration_minutes=15,
            number_of_courts=4,
            status=SessionStatus.DRAFT
        )
        db.add(session)
        db.flush()
        
        print(f"Created session: {session.name}")
        
        db.commit()
        print("✓ Database seeding completed successfully!")
        
        print("\n" + "="*50)
        print("ADMIN CREDENTIALS:")
        print("Email: admin@badmintonclub.com")
        print("Password: Admin123!")
        print("\nPLAYER CREDENTIALS (examples):")
        print("Email: player1@badmintonclub.com")
        print("Password: Player123!")
        print("Email: player2@badmintonclub.com")
        print("Password: Player123!")
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
