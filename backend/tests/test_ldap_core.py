from unittest.mock import MagicMock, patch

from ldap3.core.exceptions import LDAPException

from app.core.ldap import authenticate_ldap
from app.models import LdapSetting


def _config(**overrides) -> LdapSetting:
    defaults = dict(
        enabled=True,
        server_uri="ldap://ldap.example.internal",
        bind_dn="cn=service,dc=example",
        bind_password="service-pw",
        base_dn="ou=people,dc=example",
        user_search_filter="(uid={username})",
    )
    defaults.update(overrides)
    return LdapSetting(**defaults)


def _connection_cm(mock_conn: MagicMock) -> MagicMock:
    mock_conn.__enter__ = MagicMock(return_value=mock_conn)
    mock_conn.__exit__ = MagicMock(return_value=False)
    return mock_conn


def test_authenticate_ldap_returns_false_without_password():
    assert authenticate_ldap("alice", "", _config()) is False


def test_authenticate_ldap_returns_false_when_not_configured():
    config = _config(server_uri=None, base_dn=None)
    assert authenticate_ldap("alice", "pw", config) is False


def test_authenticate_ldap_success():
    config = _config()

    search_conn = _connection_cm(MagicMock())
    entry = MagicMock()
    entry.entry_dn = "uid=alice,ou=people,dc=example"
    search_conn.entries = [entry]

    bind_conn = _connection_cm(MagicMock())

    with patch("app.core.ldap.Server"), patch("app.core.ldap.Connection", side_effect=[search_conn, bind_conn]):
        assert authenticate_ldap("alice", "s3cret", config) is True


def test_authenticate_ldap_no_matching_entry():
    config = _config()

    search_conn = _connection_cm(MagicMock())
    search_conn.entries = []

    with patch("app.core.ldap.Server"), patch("app.core.ldap.Connection", return_value=search_conn):
        assert authenticate_ldap("nobody", "whatever", config) is False


def test_authenticate_ldap_bind_failure_returns_false():
    config = _config()

    with patch("app.core.ldap.Server"), patch("app.core.ldap.Connection", side_effect=LDAPException("bind failed")):
        assert authenticate_ldap("alice", "wrong-pw", config) is False
