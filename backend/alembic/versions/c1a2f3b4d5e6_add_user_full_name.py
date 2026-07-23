"""add full_name to users

Revision ID: c1a2f3b4d5e6
Revises: 95ceb1331638
Create Date: 2026-07-23 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1a2f3b4d5e6'
down_revision: Union[str, None] = '95ceb1331638'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('full_name', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'full_name')
