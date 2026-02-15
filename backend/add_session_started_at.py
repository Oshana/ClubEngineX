"""Add started_at column to sessions table."""
import sys

sys.path.insert(0, '.')

from app.database import engine
from sqlalchemy import text


def add_column():
    with engine.connect() as conn:
        # Add started_at column
        conn.execute(text("""
            ALTER TABLE sessions 
            ADD COLUMN IF NOT EXISTS started_at TIMESTAMP
        """))
        conn.commit()
        print("✅ Successfully added started_at column to sessions table")

if __name__ == "__main__":
    add_column()
