import logging

from ldap3 import Connection, Server
from ldap3.core.exceptions import LDAPException
from ldap3.utils.conv import escape_filter_chars

from app.models import LdapSetting

logger = logging.getLogger(__name__)


def authenticate_ldap(username: str, password: str, config: LdapSetting) -> bool:
    """以 bind 的方式，對設定好的 LDAP 伺服器驗證一組 username／password。

    需要兩次 bind：先由服務帳號（config.bind_dn／bind_password）在 base_dn 底下搜出使用者的 DN，
    接著另開一條連線、以該 DN 搭配呼叫端提供的密碼再 bind 一次——第二次 bind 成功，
    就是密碼正確的證明。密碼從不被儲存，只用於這一次性的 bind。
    """
    if not password:
        return False
    if not (config.server_uri and config.base_dn):
        return False

    server = Server(config.server_uri)
    search_filter = config.user_search_filter.format(username=escape_filter_chars(username))

    try:
        with Connection(
            server,
            user=config.bind_dn,
            password=config.bind_password,
            auto_bind=True,
        ) as search_conn:
            search_conn.search(config.base_dn, search_filter, attributes=[])
            if not search_conn.entries:
                return False
            user_dn = search_conn.entries[0].entry_dn

        with Connection(server, user=user_dn, password=password, auto_bind=True):
            return True
    except LDAPException:
        logger.warning("LDAP authentication failed for username=%s", username, exc_info=True)
        return False
