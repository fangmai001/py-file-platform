from sqlalchemy import Boolean, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SmtpSetting(Base):
    """Single-row table (id is always 1) holding admin-editable SMTP config for
    outgoing mail (password reset links, upload notifications).

    Seeded from the SMTP_* env vars the first time it's read (see
    app/core/smtp_config.py) so existing .env-configured deployments keep working
    until an admin edits the values via the admin UI.
    """

    __tablename__ = "smtp_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    host: Mapped[str | None] = mapped_column(Text, nullable=True)
    port: Mapped[int] = mapped_column(Integer, nullable=False, default=587)
    username: Mapped[str | None] = mapped_column(Text, nullable=True)
    password: Mapped[str | None] = mapped_column(Text, nullable=True)
    from_address: Mapped[str] = mapped_column(Text, nullable=False, default="noreply@example.com")
    use_tls: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
