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
    # Nullable with no server default on purpose: NULL means "never configured", which the
    # app backfills from the MAX_UPLOAD_SIZE_MB env var, so existing deployments keep the
    # limit they already had instead of being silently reset to a hardcoded number here.
    op.add_column('site_settings', sa.Column('max_upload_size_mb', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('site_settings', 'max_upload_size_mb')
