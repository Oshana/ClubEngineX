from datetime import date

from app.database import SessionLocal
from app.models import Gender, Player

db = SessionLocal()

# Male players
male_players = [
    "James Wilson", "Michael Chen", "David Kumar", "Robert Lee", "John Smith",
    "Daniel Brown", "Thomas Anderson", "Christopher Taylor", "Matthew Johnson", "Andrew Martinez",
    "Joshua Garcia", "Ryan Thompson", "Kevin Nguyen", "Brian Park", "Steven Kim",
    "Eric Wang", "Justin Singh", "Brandon Davis", "Nicholas Jones", "Tyler Williams"
]

# Female players
female_players = [
    "Sarah Johnson", "Emily Chen", "Jessica Lee", "Michelle Kim", "Amanda Taylor",
    "Ashley Martinez", "Jennifer Park", "Stephanie Wang", "Lauren Brown", "Nicole Nguyen"
]

try:
    # Add male players
    for i, name in enumerate(male_players, 1):
        player = Player(
            full_name=name,
            gender=Gender.MALE,
            skill_tier=2 + (i % 4),  # Skill tiers 2-5
            is_active=True,
            is_temp=False
        )
        db.add(player)
    
    # Add female players
    for i, name in enumerate(female_players, 1):
        player = Player(
            full_name=name,
            gender=Gender.FEMALE,
            skill_tier=2 + (i % 4),  # Skill tiers 2-5
            is_active=True,
            is_temp=False
        )
        db.add(player)
    
    db.commit()
    print(f"✓ Created {len(male_players)} male players")
    print(f"✓ Created {len(female_players)} female players")
    print(f"✓ Total: {len(male_players) + len(female_players)} players added successfully!")
    
finally:
    db.close()
