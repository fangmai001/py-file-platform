from sqlalchemy import Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SiteSetting(Base):
    """Single-row table (id is always 1) holding site-wide branding text."""

    __tablename__ = "site_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    brand_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    browser_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    hero_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    hero_subtitle: Mapped[str | None] = mapped_column(Text, nullable=True)
