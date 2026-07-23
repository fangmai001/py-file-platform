from sqlalchemy import Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LdapSetting(Base):
    """Single-row table (id is always 1) holding admin-editable LDAP auth config.

    Seeded from the LDAP_* env vars the first time it's read (see
    app/core/ldap_config.py) so existing .env-configured deployments keep working
    until an admin edits the values via the admin UI.
    """

    __tablename__ = "ldap_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    server_uri: Mapped[str | None] = mapped_column(Text, nullable=True)
    bind_dn: Mapped[str | None] = mapped_column(Text, nullable=True)
    bind_password: Mapped[str | None] = mapped_column(Text, nullable=True)
    base_dn: Mapped[str | None] = mapped_column(Text, nullable=True)
    # {username} is substituted with the (filter-escaped) login username.
    user_search_filter: Mapped[str] = mapped_column(Text, nullable=False, default="(uid={username})")
