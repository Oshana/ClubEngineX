"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2026-02-01

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('is_admin', sa.Boolean(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Create players table
    op.create_table(
        'players',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('gender', sa.Enum('male', 'female', 'other', 'unspecified', name='gender'), nullable=True),
        sa.Column('rank_system', sa.String(), nullable=True),
        sa.Column('rank_value', sa.String(), nullable=True),
        sa.Column('numeric_rank', sa.Float(), nullable=True),
        sa.Column('skill_tier', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_players_id'), 'players', ['id'], unique=False)

    # Create sessions table
    op.create_table(
        'sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=True),
        sa.Column('match_duration_minutes', sa.Integer(), nullable=True),
        sa.Column('number_of_courts', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('draft', 'active', 'ended', name='sessionstatus'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sessions_id'), 'sessions', ['id'], unique=False)

    # Create attendances table
    op.create_table(
        'attendances',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('player_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('present', 'left', name='attendancestatus'), nullable=True),
        sa.Column('check_in_time', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ),
        sa.ForeignKeyConstraint(['player_id'], ['players.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_attendances_id'), 'attendances', ['id'], unique=False)

    # Create rounds table
    op.create_table(
        'rounds',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('round_index', sa.Integer(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rounds_id'), 'rounds', ['id'], unique=False)

    # Create court_assignments table
    op.create_table(
        'court_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('round_id', sa.Integer(), nullable=False),
        sa.Column('court_number', sa.Integer(), nullable=False),
        sa.Column('team_a_player1_id', sa.Integer(), nullable=True),
        sa.Column('team_a_player2_id', sa.Integer(), nullable=True),
        sa.Column('team_b_player1_id', sa.Integer(), nullable=True),
        sa.Column('team_b_player2_id', sa.Integer(), nullable=True),
        sa.Column('match_type', sa.Enum('MM', 'MF', 'FF', 'OTHER', name='matchtype'), nullable=True),
        sa.Column('locked', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['round_id'], ['rounds.id'], ),
        sa.ForeignKeyConstraint(['team_a_player1_id'], ['players.id'], ),
        sa.ForeignKeyConstraint(['team_a_player2_id'], ['players.id'], ),
        sa.ForeignKeyConstraint(['team_b_player1_id'], ['players.id'], ),
        sa.ForeignKeyConstraint(['team_b_player2_id'], ['players.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_court_assignments_id'), 'court_assignments', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_court_assignments_id'), table_name='court_assignments')
    op.drop_table('court_assignments')
    op.drop_index(op.f('ix_rounds_id'), table_name='rounds')
    op.drop_table('rounds')
    op.drop_index(op.f('ix_attendances_id'), table_name='attendances')
    op.drop_table('attendances')
    op.drop_index(op.f('ix_sessions_id'), table_name='sessions')
    op.drop_table('sessions')
    op.drop_index(op.f('ix_players_id'), table_name='players')
    op.drop_table('players')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')
