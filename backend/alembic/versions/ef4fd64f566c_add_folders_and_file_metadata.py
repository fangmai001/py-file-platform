"""add folders and file metadata

Revision ID: ef4fd64f566c
Revises: 6db92a4bf07c
Create Date: 2026-07-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ef4fd64f566c'
down_revision: Union[str, None] = '6db92a4bf07c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('folders',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_folders_name'), 'folders', ['name'], unique=True)

    op.add_column('files', sa.Column('display_name', sa.String(length=255), nullable=True))
    op.add_column('files', sa.Column('folder_id', sa.Integer(), nullable=True))
    op.add_column('files', sa.Column('announced_at', sa.Date(), nullable=True))
    op.create_index(op.f('ix_files_folder_id'), 'files', ['folder_id'], unique=False)
    op.create_foreign_key('fk_files_folder_id_folders', 'files', 'folders', ['folder_id'], ['id'])
    op.drop_column('files', 'folder')


def downgrade() -> None:
    op.add_column('files', sa.Column('folder', sa.String(length=255), nullable=True))
    op.drop_constraint('fk_files_folder_id_folders', 'files', type_='foreignkey')
    op.drop_index(op.f('ix_files_folder_id'), table_name='files')
    op.drop_column('files', 'announced_at')
    op.drop_column('files', 'folder_id')
    op.drop_column('files', 'display_name')

    op.drop_index(op.f('ix_folders_name'), table_name='folders')
    op.drop_table('folders')
