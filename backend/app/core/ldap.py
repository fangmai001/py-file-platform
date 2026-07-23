import logging

from ldap3 import Connection, Server
from ldap3.core.exceptions import LDAPException
from ldap3.utils.conv import escape_filter_chars

from app.models import LdapSetting

logger = logging.getLogger(__name__)


def authenticate_ldap(username: str, password: str, config: LdapSetting) -> bool:
    """Bind-authenticate a username/password pair against the configured LDAP server.

    Two binds are needed: first the service account (config.bind_dn/bind_password)
    searches base_dn for the user's DN, then a second connection binds as that DN with
    the caller-supplied password - that second bind succeeding is what proves the
    password is correct. The password is never stored, only used for this one-off bind.
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
