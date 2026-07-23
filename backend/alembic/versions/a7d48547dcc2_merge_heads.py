"""merge heads

Revision ID: a7d48547dcc2
Revises: 0c799b6f341c, ef4fd64f566c
Create Date: 2026-07-23 08:13:46.846828

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7d48547dcc2'
down_revision: Union[str, None] = ('0c799b6f341c', 'ef4fd64f566c')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
