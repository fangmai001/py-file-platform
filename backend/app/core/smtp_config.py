import logging
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import SmtpSetting

logger = logging.getLogger(__name__)

_SETTINGS_ROW_ID = 1


def get_smtp_settings(db: Session) -> SmtpSetting:
    """Fetch the single-row SMTP config, seeding it from SMTP_* env vars on first use.

    This keeps existing .env-configured deployments working unchanged until an admin
    edits the values via the admin UI (see app/api/smtp_settings.py).
    """
    settings_row = db.get(SmtpSetting, _SETTINGS_ROW_ID)
    if settings_row is None:
        settings_row = SmtpSetting(
            id=_SETTINGS_ROW_ID,
            enabled=bool(settings.smtp_host),
            host=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_username,
            password=settings.smtp_password,
            from_address=settings.smtp_from_address or settings.smtp_from,
            use_tls=settings.smtp_use_tls,
        )
        db.add(settings_row)
        db.flush()
    return settings_row


def warn_if_smtp_env_config_ignored(db: Session) -> None:
    """Log a warning if SMTP_HOST is set but silently ignored because the
    smtp_settings DB row already exists and is authoritative (see get_smtp_settings).

    No-op if the row doesn't exist yet - that's the expected first-boot path where
    get_smtp_settings will seed it from SMTP_* env vars on next read.
    """
    if db.get(SmtpSetting, _SETTINGS_ROW_ID) is None:
        return
    if settings.smtp_host is not None:
        logger.warning(
            "SMTP_HOST (and other SMTP_* env vars) is set in .env, but the "
            "smtp_settings DB row already exists and is authoritative, so the env "
            'value is being ignored. Manage SMTP configuration via the "Email SMTP '
            '設定" tab in the admin UI instead.'
        )


@dataclass(frozen=True)
class SmtpConfig:
    """Plain snapshot of SmtpSetting's fields, safe to hand to a BackgroundTask -
    unlike the ORM row, it doesn't need a live session to read once the request ends."""

    enabled: bool
    host: str | None
    port: int
    username: str | None
    password: str | None
    from_address: str
    use_tls: bool


def to_smtp_config(settings_row: SmtpSetting) -> SmtpConfig:
    return SmtpConfig(
        enabled=settings_row.enabled,
        host=settings_row.host,
        port=settings_row.port,
        username=settings_row.username,
        password=settings_row.password,
        from_address=settings_row.from_address,
        use_tls=settings_row.use_tls,
    )
