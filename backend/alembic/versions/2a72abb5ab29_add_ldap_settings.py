"""add ldap settings

Revision ID: 2a72abb5ab29
Revises: 95ceb1331638
Create Date: 2026-07-23 14:41:09.569659

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2a72abb5ab29'
down_revision: Union[str, None] = '95ceb1331638'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('ldap_settings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('enabled', sa.Boolean(), nullable=False),
    sa.Column('server_uri', sa.Text(), nullable=True),
    sa.Column('bind_dn', sa.Text(), nullable=True),
    sa.Column('bind_password', sa.Text(), nullable=True),
    sa.Column('base_dn', sa.Text(), nullable=True),
    sa.Column('user_search_filter', sa.Text(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('ldap_settings')
