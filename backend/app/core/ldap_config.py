import logging

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import LdapSetting

logger = logging.getLogger(__name__)

_SETTINGS_ROW_ID = 1


def get_ldap_settings(db: Session) -> LdapSetting:
    """Fetch the single-row LDAP config, seeding it from LDAP_* env vars on first use.

    This keeps existing .env-configured deployments working unchanged until an admin
    edits the values via the admin UI (see app/api/ldap_settings.py).
    """
    settings_row = db.get(LdapSetting, _SETTINGS_ROW_ID)
    if settings_row is None:
        settings_row = LdapSetting(
            id=_SETTINGS_ROW_ID,
            enabled=settings.ldap_enabled,
            server_uri=settings.ldap_server_uri,
            bind_dn=settings.ldap_bind_dn,
            bind_password=settings.ldap_bind_password,
            base_dn=settings.ldap_base_dn,
            user_search_filter=settings.ldap_user_search_filter,
        )
        db.add(settings_row)
        db.flush()
    return settings_row


def warn_if_ldap_env_config_ignored(db: Session) -> None:
    """Log a warning if LDAP_* env vars are set but silently ignored because the
    ldap_settings DB row already exists and is authoritative (see get_ldap_settings).

    No-op if the row doesn't exist yet - that's the expected first-boot path where
    get_ldap_settings will seed it from these same env vars on next read.
    """
    if db.get(LdapSetting, _SETTINGS_ROW_ID) is None:
        return
    if settings.ldap_enabled is True or settings.ldap_server_uri is not None:
        logger.warning(
            "LDAP_ENABLED/LDAP_SERVER_URI (and other LDAP_* env vars) are set in .env, "
            "but the ldap_settings DB row already exists and is authoritative, so the "
            'env values are being ignored. Manage LDAP configuration via the "LDAP 設定" '
            "tab in the admin UI instead."
        )
