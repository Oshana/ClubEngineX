"""
Add username field and email verification to User model
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text


def migrate():
    with engine.connect() as conn:
        print("Starting username and email verification migration...")
        
        # Add username column (will be populated with email values initially)
        print("1. Adding username column...")
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS username VARCHAR UNIQUE;
        """))
        conn.commit()
        
        # Populate username with email username part for existing users
        print("2. Populating username field from existing emails...")
        conn.execute(text("""
            UPDATE users 
            SET username = SPLIT_PART(email, '@', 1) 
            WHERE username IS NULL;
        """))
        conn.commit()
        
        # Add is_email_verified column
        print("3. Adding is_email_verified column...")
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;
        """))
        conn.commit()
        
        # Set existing users' emails as verified (backward compatibility)
        print("4. Setting existing users' emails as verified...")
        conn.execute(text("""
            UPDATE users 
            SET is_email_verified = TRUE 
            WHERE email IS NOT NULL;
        """))
        conn.commit()
        
        # Make email nullable
        print("5. Making email column nullable...")
        conn.execute(text("""
            ALTER TABLE users 
            ALTER COLUMN email DROP NOT NULL;
        """))
        conn.commit()
        
        # Make username NOT NULL after populating
        print("6. Making username column NOT NULL...")
        conn.execute(text("""
            ALTER TABLE users 
            ALTER COLUMN username SET NOT NULL;
        """))
        conn.commit()
        
        # Create index on username
        print("7. Creating index on username...")
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        """))
        conn.commit()
        
        print("✅ Username and email verification migration completed successfully!")
        print("   - Added username field (populated from email)")
        print("   - Added is_email_verified field (set to TRUE for existing users)")
        print("   - Made email optional")
        print("   - Created unique constraint and index on username")

if __name__ == "__main__":
    migrate()
