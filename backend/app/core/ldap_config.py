import logging

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import LdapSetting

logger = logging.getLogger(__name__)

_SETTINGS_ROW_ID = 1


def get_ldap_settings(db: Session) -> LdapSetting:
    """取出單列的 LDAP 設定，第一次使用時以 LDAP_* 環境變數填入初始值。

    這讓既有那些靠 .env 設定的部署維持原樣運作，直到管理員透過管理後台 UI
    修改這些值為止（見 app/api/ldap_settings.py）。
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
    """LDAP_* 環境變數雖然有設，卻因為 ldap_settings 資料列已存在且具最終權威而被靜默忽略時
    （見 get_ldap_settings），記錄一則警告。

    該資料列尚未存在時什麼都不做——那是預期中的首次啟動路徑，
    get_ldap_settings 會在下一次讀取時以這些同樣的環境變數把它填好。
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
