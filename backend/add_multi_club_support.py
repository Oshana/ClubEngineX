"""
Migration script to add multi-club support
"""
import sys

from sqlalchemy import text

sys.path.insert(0, '.')
from app.database import engine


def migrate():
    with engine.connect() as conn:
        try:
            # Create subscription_status enum type
            conn.execute(text("""
                DO $$ BEGIN
                    CREATE TYPE subscriptionstatus AS ENUM ('active', 'trial', 'expired', 'suspended');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            """))
            conn.commit()
            
            # Create clubs table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS clubs (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR NOT NULL,
                    address VARCHAR,
                    contact_email VARCHAR,
                    contact_phone VARCHAR,
                    subscription_status subscriptionstatus DEFAULT 'trial',
                    subscription_start_date TIMESTAMP,
                    subscription_end_date TIMESTAMP,
                    max_players INTEGER DEFAULT 100,
                    max_sessions_per_month INTEGER DEFAULT 20,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.commit()
            print("✅ Created clubs table")
            
            # Create a default club for existing data
            result = conn.execute(text("""
                INSERT INTO clubs (name, subscription_status, is_active)
                VALUES ('Default Club', 'active', true)
                RETURNING id;
            """))
            default_club_id = result.fetchone()[0]
            conn.commit()
            print(f"✅ Created default club with ID: {default_club_id}")
            
            # Add club_id and is_super_admin to users table
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES clubs(id),
                ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;
            """))
            conn.commit()
            print("✅ Added club_id and is_super_admin to users table")
            
            # Update existing users to belong to default club
            conn.execute(text(f"""
                UPDATE users SET club_id = {default_club_id} WHERE club_id IS NULL;
            """))
            conn.commit()
            print("✅ Assigned existing users to default club")
            
            # Add club_id to players table
            conn.execute(text("""
                ALTER TABLE players 
                ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES clubs(id);
            """))
            conn.commit()
            print("✅ Added club_id to players table")
            
            # Update existing players to belong to default club
            conn.execute(text(f"""
                UPDATE players SET club_id = {default_club_id} WHERE club_id IS NULL;
            """))
            conn.commit()
            
            # Make club_id NOT NULL after setting values
            conn.execute(text("""
                ALTER TABLE players 
                ALTER COLUMN club_id SET NOT NULL;
            """))
            conn.commit()
            print("✅ Assigned existing players to default club")
            
            # Add club_id to sessions table
            conn.execute(text("""
                ALTER TABLE sessions 
                ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES clubs(id);
            """))
            conn.commit()
            print("✅ Added club_id to sessions table")
            
            # Update existing sessions to belong to default club
            conn.execute(text(f"""
                UPDATE sessions SET club_id = {default_club_id} WHERE club_id IS NULL;
            """))
            conn.commit()
            
            # Make club_id NOT NULL after setting values
            conn.execute(text("""
                ALTER TABLE sessions 
                ALTER COLUMN club_id SET NOT NULL;
            """))
            conn.commit()
            print("✅ Assigned existing sessions to default club")
            
            # Add club_id to club_settings table
            conn.execute(text("""
                ALTER TABLE club_settings 
                ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES clubs(id) UNIQUE;
            """))
            conn.commit()
            print("✅ Added club_id to club_settings table")
            
            # Update existing club_settings to belong to default club
            conn.execute(text(f"""
                UPDATE club_settings SET club_id = {default_club_id} WHERE club_id IS NULL;
            """))
            conn.commit()
            
            # Make club_id NOT NULL after setting values
            conn.execute(text("""
                ALTER TABLE club_settings 
                ALTER COLUMN club_id SET NOT NULL;
            """))
            conn.commit()
            print("✅ Assigned existing club settings to default club")
            
            # Create indexes for performance
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_users_club_id ON users(club_id);
                CREATE INDEX IF NOT EXISTS idx_players_club_id ON players(club_id);
                CREATE INDEX IF NOT EXISTS idx_sessions_club_id ON sessions(club_id);
                CREATE INDEX IF NOT EXISTS idx_club_settings_club_id ON club_settings(club_id);
            """))
            conn.commit()
            print("✅ Created indexes on club_id columns")
            
            print("\n✅ Migration completed successfully!")
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Migration failed: {e}")
            raise


if __name__ == "__main__":
    migrate()
