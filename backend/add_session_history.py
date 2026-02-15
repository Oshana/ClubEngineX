#!/usr/bin/env python3
"""
Migration script to add session_history table for tracking multiple runs of the same session.
"""
import sys
sys.path.insert(0, '.')

from app.database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        # Create session_history table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS session_history (
                id SERIAL PRIMARY KEY,
                session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                session_name VARCHAR NOT NULL,
                started_at TIMESTAMP NOT NULL,
                ended_at TIMESTAMP NOT NULL,
                total_rounds INTEGER DEFAULT 0,
                total_players INTEGER DEFAULT 0,
                total_matches INTEGER DEFAULT 0,
                avg_matches_per_player FLOAT DEFAULT 0,
                avg_waiting_time FLOAT DEFAULT 0,
                fairness_score FLOAT DEFAULT 0,
                session_duration_minutes FLOAT DEFAULT 0,
                total_round_duration_minutes FLOAT DEFAULT 0,
                match_type_distribution JSON DEFAULT '{"MM": 0, "MF": 0, "FF": 0}',
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        
        # Create index on session_id for faster queries
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_session_history_session_id 
            ON session_history(session_id)
        """))
        
        # Create index on started_at for ordering
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_session_history_started_at 
            ON session_history(started_at DESC)
        """))
        
        conn.commit()
        print("✅ Successfully created session_history table and indexes")

if __name__ == "__main__":
    run_migration()
