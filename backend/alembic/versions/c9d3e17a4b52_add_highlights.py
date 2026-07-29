"""add highlights

Revision ID: c9d3e17a4b52
Revises: b7e41c9d2f08
Create Date: 2026-07-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9d3e17a4b52'
down_revision: Union[str, None] = 'b7e41c9d2f08'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# The four cards that used to be hardcoded in frontend/src/pages/HomePage.tsx, seeded so
# existing sites look unchanged after this migration. sort_order is spaced by 10 so new
# cards can be inserted between them without renumbering.
SEED_HIGHLIGHTS = [
    {
        'icon': 'shield-check',
        'title': '公開／私密控管',
        'description': '每個檔案可獨立設定可見度，公開檔案訪客免登入即可下載，私密檔案僅本人與管理員可見。',
        'sort_order': 10,
        'is_public': True,
    },
    {
        'icon': 'history',
        'title': '版本歷史',
        'description': '同名檔案重新上傳不會覆蓋，舊版本會保留完整歷史紀錄，方便回溯查閱。',
        'sort_order': 20,
        'is_public': True,
    },
    {
        'icon': 'folder-tree',
        'title': '資料夾分類',
        'description': '檔案依資料夾分組呈現，瀏覽時可依主題或用途快速找到需要的文件。',
        'sort_order': 30,
        'is_public': True,
    },
    {
        'icon': 'clipboard-list',
        'title': '稽核紀錄',
        'description': '刪除、權限變更等高權限操作皆會記錄稽核紀錄，操作歷程有跡可循。',
        'sort_order': 40,
        'is_public': True,
    },
]


def upgrade() -> None:
    highlights = op.create_table('highlights',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('icon', sa.String(length=64), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('sort_order', sa.Integer(), nullable=False),
    sa.Column('is_public', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    # created_at is intentionally omitted so the server default applies.
    op.bulk_insert(highlights, SEED_HIGHLIGHTS)


def downgrade() -> None:
    op.drop_table('highlights')
