from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Highlight(Base):
    """A feature highlight card shown on the home page below the hero section."""

    __tablename__ = "highlights"

    id: Mapped[int] = mapped_column(primary_key=True)
    # kebab-case key resolved to a lucide icon by frontend/src/lib/highlight-icons.ts;
    # allowed values are validated by HighlightIconKey in app/schemas/highlight.py.
    icon: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
