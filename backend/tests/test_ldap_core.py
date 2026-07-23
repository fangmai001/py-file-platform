from unittest.mock import MagicMock, patch

from ldap3.core.exceptions import LDAPException

from app.core.config import settings
from app.core.ldap import authenticate_ldap


def _configure_ldap_settings(monkeypatch):
    monkeypatch.setattr(settings, "ldap_server_uri", "ldap://ldap.example.internal")
    monkeypatch.setattr(settings, "ldap_bind_dn", "cn=service,dc=example")
    monkeypatch.setattr(settings, "ldap_bind_password", "service-pw")
    monkeypatch.setattr(settings, "ldap_base_dn", "ou=people,dc=example")
    monkeypatch.setattr(settings, "ldap_user_search_filter", "(uid={username})")


def _connection_cm(mock_conn: MagicMock) -> MagicMock:
    mock_conn.__enter__ = MagicMock(return_value=mock_conn)
    mock_conn.__exit__ = MagicMock(return_value=False)
    return mock_conn


def test_authenticate_ldap_returns_false_without_password(monkeypatch):
    _configure_ldap_settings(monkeypatch)
    assert authenticate_ldap("alice", "") is False


def test_authenticate_ldap_returns_false_when_not_configured(monkeypatch):
    monkeypatch.setattr(settings, "ldap_server_uri", None)
    monkeypatch.setattr(settings, "ldap_base_dn", None)
    assert authenticate_ldap("alice", "pw") is False


def test_authenticate_ldap_success(monkeypatch):
    _configure_ldap_settings(monkeypatch)

    search_conn = _connection_cm(MagicMock())
    entry = MagicMock()
    entry.entry_dn = "uid=alice,ou=people,dc=example"
    search_conn.entries = [entry]

    bind_conn = _connection_cm(MagicMock())

    with patch("app.core.ldap.Server"), patch("app.core.ldap.Connection", side_effect=[search_conn, bind_conn]):
        assert authenticate_ldap("alice", "s3cret") is True


def test_authenticate_ldap_no_matching_entry(monkeypatch):
    _configure_ldap_settings(monkeypatch)

    search_conn = _connection_cm(MagicMock())
    search_conn.entries = []

    with patch("app.core.ldap.Server"), patch("app.core.ldap.Connection", return_value=search_conn):
        assert authenticate_ldap("nobody", "whatever") is False


def test_authenticate_ldap_bind_failure_returns_false(monkeypatch):
    _configure_ldap_settings(monkeypatch)

    with patch("app.core.ldap.Server"), patch("app.core.ldap.Connection", side_effect=LDAPException("bind failed")):
        assert authenticate_ldap("alice", "wrong-pw") is False
