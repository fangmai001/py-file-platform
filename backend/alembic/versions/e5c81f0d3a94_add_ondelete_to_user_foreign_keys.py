"""add ondelete to user foreign keys

Revision ID: e5c81f0d3a94
Revises: d4b7a09f21c3
Create Date: 2026-08-04 11:20:31.409277

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5c81f0d3a94'
down_revision: Union[str, None] = 'd4b7a09f21c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# The three FKs were created anonymously, so Postgres named them itself using its
# <table>_<column>_fkey convention. files.owner_id is intentionally not in this list -
# it stays RESTRICT so deleting an account can't take its uploads with it.
_CONSTRAINTS = (
    ('notifications', 'recipient_id', 'notifications_recipient_id_fkey', 'CASCADE'),
    ('password_reset_tokens', 'user_id', 'password_reset_tokens_user_id_fkey', 'CASCADE'),
    ('audit_logs', 'actor_id', 'audit_logs_actor_id_fkey', 'SET NULL'),
)


def upgrade() -> None:
    # audit_logs.actor_id has to become nullable before SET NULL can ever fire.
    op.alter_column('audit_logs', 'actor_id', existing_type=sa.Integer(), nullable=True)

    for table, column, constraint_name, ondelete in _CONSTRAINTS:
        op.drop_constraint(constraint_name, table, type_='foreignkey')
        op.create_foreign_key(constraint_name, table, 'users', [column], ['id'], ondelete=ondelete)


def downgrade() -> None:
    for table, column, constraint_name, _ in _CONSTRAINTS:
        op.drop_constraint(constraint_name, table, type_='foreignkey')
        op.create_foreign_key(constraint_name, table, 'users', [column], ['id'])

    # Lossy on purpose, and the only way back: rows whose actor was deleted while the
    # SET NULL rule was in place have no user to point at any more, so restoring the NOT
    # NULL constraint means dropping them.
    op.execute('DELETE FROM audit_logs WHERE actor_id IS NULL')
    op.alter_column('audit_logs', 'actor_id', existing_type=sa.Integer(), nullable=False)
