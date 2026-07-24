"""merge heads

Revision ID: 872b58a4f7f8
Revises: 2a72abb5ab29, c1a2f3b4d5e6
Create Date: 2026-07-23 23:37:15.566399

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '872b58a4f7f8'
down_revision: Union[str, None] = ('2a72abb5ab29', 'c1a2f3b4d5e6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
