from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

# 允許的圖示 key。這份清單必須與 frontend/src/lib/highlight-icons.ts 中的
# HIGHLIGHT_ICON_OPTIONS 保持同步（相同的 key、相同的順序）。
HighlightIconKey = Literal[
    "shield-check",
    "history",
    "folder-tree",
    "clipboard-list",
    "file-text",
    "upload",
    "download",
    "users",
    "lock",
    "globe",
    "search",
    "bell",
    "link",
    "calendar",
    "star",
    "sparkles",
]

DEFAULT_HIGHLIGHT_ICON: HighlightIconKey = "sparkles"


class HighlightCreate(BaseModel):
    icon: HighlightIconKey = DEFAULT_HIGHLIGHT_ICON
    title: str
    description: str | None = None
    sort_order: int = 0
    is_public: bool = True


class HighlightUpdate(BaseModel):
    icon: HighlightIconKey | None = None
    title: str | None = None
    description: str | None = None
    sort_order: int | None = None
    is_public: bool | None = None


class HighlightResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    icon: str
    title: str
    description: str | None
    sort_order: int
    is_public: bool
    created_at: datetime
