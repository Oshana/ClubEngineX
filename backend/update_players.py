import random

from app.database import SessionLocal
from app.models import Gender, Player

db = SessionLocal()

addresses = [
    "123 Oak Street, Dublin 2",
    "45 Pine Avenue, Dublin 4",
    "78 Maple Road, Dublin 6",
    "12 Cedar Lane, Dublin 8",
    "34 Birch Drive, Dublin 1",
    "56 Elm Street, Dublin 3",
    "89 Willow Way, Dublin 5",
    "23 Ash Court, Dublin 7",
    "67 Cherry Lane, Dublin 9",
    "90 Beech Road, Dublin 10",
    "14 Spruce Avenue, Dublin 12",
    "37 Walnut Street, Dublin 14",
    "52 Redwood Drive, Dublin 16",
    "83 Sycamore Lane, Dublin 18",
    "29 Chestnut Road, Dublin 20",
    "41 Poplar Avenue, Dublin 22",
    "76 Hickory Street, Dublin 24",
    "19 Juniper Way, Dublin 15",
    "64 Laurel Court, Dublin 11",
    "95 Cypress Drive, Dublin 13",
    "28 Magnolia Lane, Dublin 17",
    "51 Dogwood Road, Dublin 19",
    "73 Hawthorn Avenue, Dublin 21",
    "36 Rowan Street, Dublin 23",
    "82 Alder Drive, Dublin 6W",
    "47 Hazel Court, Dublin 8W",
    "59 Larch Lane, Dublin 10W",
    "22 Yew Road, Dublin 12W",
    "68 Elder Avenue, Dublin 14W",
    "91 Fir Street, Dublin 16W"
]

emergency_names = [
    "Mary Wilson", "John Chen", "Sarah Kumar", "David Lee", "Emily Smith",
    "Michael Brown", "Lisa Anderson", "James Taylor", "Jennifer Johnson", "Robert Martinez",
    "Patricia Garcia", "William Thompson", "Elizabeth Nguyen", "Richard Park", "Susan Kim",
    "Joseph Wang", "Karen Singh", "Thomas Davis", "Nancy Jones", "Charles Williams",
    "Margaret Lee", "Daniel Brown", "Betty Taylor", "Paul Martinez", "Dorothy Park",
    "Mark Wang", "Sandra Singh", "Donald Davis", "Ashley Jones", "Steven Williams"
]

try:
    # Get all players separated by gender
    male_players = db.query(Player).filter(Player.gender == Gender.MALE).all()
    female_players = db.query(Player).filter(Player.gender == Gender.FEMALE).all()
    
    # Assign divisions evenly for males (1-10, 2 per division)
    male_divisions = []
    for div in range(1, 11):
        male_divisions.extend([div, div])
    random.shuffle(male_divisions)
    
    # Assign divisions evenly for females (1-10, 1 per division)
    female_divisions = list(range(1, 11))
    random.shuffle(female_divisions)
    
    # Update male players
    for i, player in enumerate(male_players):
        player.level = str(male_divisions[i])
        player.contact_number = f"+353 {random.randint(80, 89)} {random.randint(100, 999)} {random.randint(1000, 9999)}"
        player.address = addresses[i]
        player.emergency_contact_name = emergency_names[i]
        player.emergency_contact_number = f"+353 {random.randint(80, 89)} {random.randint(100, 999)} {random.randint(1000, 9999)}"
    
    # Update female players
    for i, player in enumerate(female_players):
        player.level = str(female_divisions[i])
        player.contact_number = f"+353 {random.randint(80, 89)} {random.randint(100, 999)} {random.randint(1000, 9999)}"
        player.address = addresses[20 + i]  # Use addresses starting from index 20
        player.emergency_contact_name = emergency_names[20 + i]
        player.emergency_contact_number = f"+353 {random.randint(80, 89)} {random.randint(100, 999)} {random.randint(1000, 9999)}"
    
    db.commit()
    
    print(f"✓ Updated {len(male_players)} male players")
    print(f"✓ Updated {len(female_players)} female players")
    print(f"\nDivision distribution:")
    
    # Show division counts
    all_players = male_players + female_players
    for div in range(1, 11):
        male_count = sum(1 for p in male_players if p.level == str(div))
        female_count = sum(1 for p in female_players if p.level == str(div))
        print(f"  Division {div}: {male_count} males, {female_count} females (Total: {male_count + female_count})")
    
    print(f"\n✓ All players updated with divisions, contact info, addresses, and emergency contacts!")
    
finally:
    db.close()
