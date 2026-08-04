"""add max upload size to site settings

Revision ID: d4b7a09f21c3
Revises: c9d3e17a4b52
Create Date: 2026-07-30 10:12:04.881233

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4b7a09f21c3'
down_revision: Union[str, None] = 'c9d3e17a4b52'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 刻意設成可為 null 且不給 server default：NULL 代表「從未設定過」，應用程式會以
    # MAX_UPLOAD_SIZE_MB 環境變數回填，讓既有部署保有原本的上限，
    # 而不是被這裡某個寫死的數字悄悄重設掉。
    op.add_column('site_settings', sa.Column('max_upload_size_mb', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('site_settings', 'max_upload_size_mb')
