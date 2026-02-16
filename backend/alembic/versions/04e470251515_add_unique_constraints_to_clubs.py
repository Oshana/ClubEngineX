"""add_unique_constraints_to_clubs

Revision ID: 04e470251515
Revises: ea9559bdeae1
Create Date: 2026-02-16 22:53:36.681722

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '04e470251515'
down_revision: Union[str, None] = 'ea9559bdeae1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add unique constraint to club name
    op.create_index('ix_clubs_name', 'clubs', ['name'], unique=True)
    
    # Add unique constraint and index to contact_email
    op.create_index('ix_clubs_contact_email', 'clubs', ['contact_email'], unique=True)


def downgrade() -> None:
    # Remove unique constraints
    op.drop_index('ix_clubs_contact_email', table_name='clubs')
    op.drop_index('ix_clubs_name', table_name='clubs')
