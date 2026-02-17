import random

from app.database import SessionLocal
from app.models import Gender, Player, User

# Male and Female first names
male_names = [
    "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph",
    "Thomas", "Charles", "Daniel", "Matthew", "Anthony", "Mark", "Donald"
]

female_names = [
    "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan",
    "Jessica", "Sarah", "Karen"
]

last_names = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris"
]

def main():
    db = SessionLocal()
    try:
        # Find the club admin user
        admin_user = db.query(User).filter(User.username == "clubadmin").first()
        
        if not admin_user:
            print("Error: User with username 'clubadmin' not found")
            return
        
        if not admin_user.club_id:
            print("Error: User 'clubadmin' is not associated with a club")
            return
        
        club_id = admin_user.club_id
        print(f"Adding players to club_id: {club_id}")
        
        # Add 15 male players
        print("\nAdding 15 male players...")
        for i in range(15):
            first_name = random.choice(male_names)
            last_name = random.choice(last_names)
            full_name = f"{first_name} {last_name}"
            level = str(random.randint(1, 10))
            
            player = Player(
                full_name=full_name,
                gender=Gender.MALE,
                level=level,
                club_id=club_id,
                is_active=True
            )
            db.add(player)
            print(f"  {i+1}. {full_name} (Male, Level {level})")
        
        # Add 10 female players
        print("\nAdding 10 female players...")
        for i in range(10):
            first_name = random.choice(female_names)
            last_name = random.choice(last_names)
            full_name = f"{first_name} {last_name}"
            level = str(random.randint(1, 10))
            
            player = Player(
                full_name=full_name,
                gender=Gender.FEMALE,
                level=level,
                club_id=club_id,
                is_active=True
            )
            db.add(player)
            print(f"  {i+1}. {full_name} (Female, Level {level})")
        
        db.commit()
        print(f"\n✓ Successfully added 25 players to club {club_id}")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
