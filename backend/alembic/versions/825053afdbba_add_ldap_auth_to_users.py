"""add ldap auth to users

Revision ID: 825053afdbba
Revises: 2054979bb335
Create Date: 2026-07-23 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '825053afdbba'
down_revision: Union[str, None] = '2054979bb335'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('auth_source', sa.String(16), nullable=False, server_default='local'),
    )
    op.alter_column('users', 'password_hash', existing_type=sa.String(255), nullable=True)


def downgrade() -> None:
    op.alter_column('users', 'password_hash', existing_type=sa.String(255), nullable=False)
    op.drop_column('users', 'auth_source')
