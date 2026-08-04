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


# 這三個 FK 當初是匿名建立的，因此 Postgres 依自己的 <table>_<column>_fkey 慣例替它們命名。
# files.owner_id 刻意不在這份清單裡——它維持 RESTRICT，這樣刪除帳號就帶不走它的上傳檔。
_CONSTRAINTS = (
    ('notifications', 'recipient_id', 'notifications_recipient_id_fkey', 'CASCADE'),
    ('password_reset_tokens', 'user_id', 'password_reset_tokens_user_id_fkey', 'CASCADE'),
    ('audit_logs', 'actor_id', 'audit_logs_actor_id_fkey', 'SET NULL'),
)


def upgrade() -> None:
    # audit_logs.actor_id 必須先變成可為 null，SET NULL 才有可能生效。
    op.alter_column('audit_logs', 'actor_id', existing_type=sa.Integer(), nullable=True)

    for table, column, constraint_name, ondelete in _CONSTRAINTS:
        op.drop_constraint(constraint_name, table, type_='foreignkey')
        op.create_foreign_key(constraint_name, table, 'users', [column], ['id'], ondelete=ondelete)


def downgrade() -> None:
    for table, column, constraint_name, _ in _CONSTRAINTS:
        op.drop_constraint(constraint_name, table, type_='foreignkey')
        op.create_foreign_key(constraint_name, table, 'users', [column], ['id'])

    # 刻意有損，而且這是唯一的回復方式：在 SET NULL 規則生效期間、操作者已被刪除的那些
    # 資料列，已經沒有任何 user 可指向，因此要還原 NOT NULL constraint 就只能把它們刪掉。
    op.execute('DELETE FROM audit_logs WHERE actor_id IS NULL')
    op.alter_column('audit_logs', 'actor_id', existing_type=sa.Integer(), nullable=False)
