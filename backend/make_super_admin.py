"""
Script to make a user a super admin
Usage: python make_super_admin.py <email>
"""
import sys
from sqlalchemy import text

sys.path.insert(0, '.')
from app.database import engine


def make_super_admin(email: str):
    with engine.connect() as conn:
        try:
            # Update user to be super admin and remove club_id
            result = conn.execute(text(f"""
                UPDATE users 
                SET is_super_admin = true, club_id = NULL
                WHERE email = '{email}'
                RETURNING id, email, full_name;
            """))
            user = result.fetchone()
            conn.commit()
            
            if user:
                print(f"✅ User '{user[2]}' ({user[1]}) is now a super admin!")
            else:
                print(f"❌ User with email '{email}' not found")
                
        except Exception as e:
            conn.rollback()
            print(f"❌ Failed: {e}")
            raise


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_super_admin.py <email>")
        print("Example: python make_super_admin.py admin@example.com")
        sys.exit(1)
    
    email = sys.argv[1]
    make_super_admin(email)
