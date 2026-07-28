"""add branding images to site settings

Revision ID: b7e41c9d2f08
Revises: f3a9c6d21b47
Create Date: 2026-07-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e41c9d2f08'
down_revision: Union[str, None] = 'f3a9c6d21b47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('site_settings', sa.Column('favicon_filename', sa.Text(), nullable=True))
    op.add_column('site_settings', sa.Column('hero_image_filename', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('site_settings', 'hero_image_filename')
    op.drop_column('site_settings', 'favicon_filename')
