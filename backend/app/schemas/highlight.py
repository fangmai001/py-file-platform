from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

# Allowed icon keys. Keep this list in sync with HIGHLIGHT_ICON_OPTIONS in
# frontend/src/lib/highlight-icons.ts (same keys, same order).
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
