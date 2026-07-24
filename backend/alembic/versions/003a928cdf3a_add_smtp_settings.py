"""add smtp settings

Revision ID: 003a928cdf3a
Revises: 872b58a4f7f8
Create Date: 2026-07-24 10:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003a928cdf3a'
down_revision: Union[str, None] = '872b58a4f7f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('smtp_settings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('enabled', sa.Boolean(), nullable=False),
    sa.Column('host', sa.Text(), nullable=True),
    sa.Column('port', sa.Integer(), nullable=False),
    sa.Column('username', sa.Text(), nullable=True),
    sa.Column('password', sa.Text(), nullable=True),
    sa.Column('from_address', sa.Text(), nullable=False),
    sa.Column('use_tls', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('smtp_settings')
