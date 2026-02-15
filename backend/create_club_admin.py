"""
Script to create a test club admin user
"""
import sys
from sqlalchemy import text

sys.path.insert(0, '.')
from app.database import engine
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_club_admin():
    with engine.connect() as conn:
        try:
            # Get the default club ID
            result = conn.execute(text("SELECT id FROM clubs WHERE name = 'Default Club' LIMIT 1"))
            club = result.fetchone()
            
            if not club:
                print("❌ Default Club not found")
                return
            
            club_id = club[0]
            
            # Check if clubadmin@example.com already exists
            result = conn.execute(text("SELECT id FROM users WHERE email = 'clubadmin@example.com'"))
            existing = result.fetchone()
            
            if existing:
                print("✅ Club admin user already exists: clubadmin@example.com")
                return
            
            # Hash the password
            hashed_password = pwd_context.hash("clubadmin123")
            
            # Create club admin user
            result = conn.execute(text(f"""
                INSERT INTO users (email, hashed_password, full_name, is_admin, is_super_admin, club_id, is_active, created_at)
                VALUES ('clubadmin@example.com', '{hashed_password}', 'Club Admin', true, false, {club_id}, true, CURRENT_TIMESTAMP)
                RETURNING id, email, full_name;
            """))
            user = result.fetchone()
            conn.commit()
            
            print(f"✅ Created club admin user:")
            print(f"   Email: {user[1]}")
            print(f"   Password: clubadmin123")
            print(f"   Name: {user[2]}")
            print(f"   Club ID: {club_id}")
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Failed: {e}")
            raise


if __name__ == "__main__":
    create_club_admin()
