from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> project root is three levels up
_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg2://platform:platform@localhost:5432/platform"
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 50

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    # Optional: if both are set and no admin account exists yet, one is created at
    # startup so there's a way to bootstrap the first admin (see app/core/seed.py).
    initial_admin_username: str | None = None
    initial_admin_password: str | None = None

    # SMTP for outgoing mail (password reset links, future upload notifications).
    # When smtp_host is unset, app.core.email logs the message instead of sending it,
    # so password reset works in local/dev without a real mail server.
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_address: str | None = None
    smtp_use_tls: bool = True

    # Used to build links (e.g. password reset) that point back at the frontend.
    frontend_base_url: str = "http://localhost:5173"
    password_reset_token_expire_minutes: int = 30

    # LDAP auth (see app/core/ldap.py). Disabled by default so environments without an
    # LDAP server keep working exactly as before with only local accounts.
    ldap_enabled: bool = False
    ldap_server_uri: str | None = None
    ldap_bind_dn: str | None = None
    ldap_bind_password: str | None = None
    ldap_base_dn: str | None = None
    # {username} is substituted with the (filter-escaped) login username.
    ldap_user_search_filter: str = "(uid={username})"


settings = Settings()
