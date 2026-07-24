"""merge heads

Revision ID: e8ca19147f12
Revises: 2a72abb5ab29, c1a2f3b4d5e6
Create Date: 2026-07-24 10:08:58.336753

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8ca19147f12'
down_revision: Union[str, None] = ('2a72abb5ab29', 'c1a2f3b4d5e6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
