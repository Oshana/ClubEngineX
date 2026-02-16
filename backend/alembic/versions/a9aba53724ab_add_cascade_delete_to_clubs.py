"""add_cascade_delete_to_clubs

Revision ID: a9aba53724ab
Revises: 04e470251515
Create Date: 2026-02-16 23:00:46.394876

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a9aba53724ab'
down_revision: Union[str, None] = '04e470251515'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add cascade delete to foreign key constraints
    # Users table
    op.drop_constraint('users_club_id_fkey', 'users', type_='foreignkey')
    op.create_foreign_key('users_club_id_fkey', 'users', 'clubs', ['club_id'], ['id'], ondelete='CASCADE')
    
    # Players table
    op.drop_constraint('players_club_id_fkey', 'players', type_='foreignkey')
    op.create_foreign_key('players_club_id_fkey', 'players', 'clubs', ['club_id'], ['id'], ondelete='CASCADE')
    
    # Sessions table
    op.drop_constraint('sessions_club_id_fkey', 'sessions', type_='foreignkey')
    op.create_foreign_key('sessions_club_id_fkey', 'sessions', 'clubs', ['club_id'], ['id'], ondelete='CASCADE')
    
    # ClubSettings table
    op.drop_constraint('club_settings_club_id_fkey', 'club_settings', type_='foreignkey')
    op.create_foreign_key('club_settings_club_id_fkey', 'club_settings', 'clubs', ['club_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    # Remove cascade delete from foreign key constraints
    op.drop_constraint('club_settings_club_id_fkey', 'club_settings', type_='foreignkey')
    op.create_foreign_key('club_settings_club_id_fkey', 'club_settings', 'clubs', ['club_id'], ['id'])
    
    op.drop_constraint('sessions_club_id_fkey', 'sessions', type_='foreignkey')
    op.create_foreign_key('sessions_club_id_fkey', 'sessions', 'clubs', ['club_id'], ['id'])
    
    op.drop_constraint('players_club_id_fkey', 'players', type_='foreignkey')
    op.create_foreign_key('players_club_id_fkey', 'players', 'clubs', ['club_id'], ['id'])
    
    op.drop_constraint('users_club_id_fkey', 'users', type_='foreignkey')
    op.create_foreign_key('users_club_id_fkey', 'users', 'clubs', ['club_id'], ['id'])
