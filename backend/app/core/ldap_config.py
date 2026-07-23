from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import LdapSetting

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
