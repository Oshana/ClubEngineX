"""
Migration script to add role-based access control
"""
import sys

from sqlalchemy import text

sys.path.insert(0, '.')
from app.database import engine


def migrate():
    with engine.connect() as conn:
        try:
            # Create userrole enum type
            conn.execute(text("""
                DO $$ BEGIN
                    CREATE TYPE userrole AS ENUM ('super_admin', 'club_admin', 'session_manager');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            """))
            conn.commit()
            print("✅ Created userrole enum type")
            
            # Add role column to users table
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS role userrole DEFAULT 'session_manager';
            """))
            conn.commit()
            print("✅ Added role column to users table")
            
            # Migrate existing users based on is_super_admin and is_admin
            conn.execute(text("""
                UPDATE users 
                SET role = CASE 
                    WHEN is_super_admin = true THEN 'super_admin'::userrole
                    WHEN is_admin = true THEN 'club_admin'::userrole
                    ELSE 'session_manager'::userrole
                END
                WHERE role IS NULL OR role = 'session_manager';
            """))
            conn.commit()
            print("✅ Migrated existing users to new role system")
            
            # Create index on role for performance
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
            """))
            conn.commit()
            print("✅ Created index on role column")
            
            print("\n✅ Role-based access control migration completed successfully!")
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Migration failed: {e}")
            raise


if __name__ == "__main__":
    migrate()
