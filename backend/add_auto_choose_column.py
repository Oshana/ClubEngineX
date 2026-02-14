from app.database import engine
from sqlalchemy import text

# Add the new column to club_settings table
with engine.connect() as conn:
    try:
        conn.execute(text('ALTER TABLE club_settings ADD COLUMN IF NOT EXISTS auto_choose_match_types BOOLEAN DEFAULT FALSE'))
        conn.commit()
        print('✅ Successfully added auto_choose_match_types column to club_settings table')
    except Exception as e:
        print(f'❌ Error: {e}')
