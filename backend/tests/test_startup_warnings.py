import logging

from app.core.config import settings
from app.core.ldap_config import warn_if_ldap_env_config_ignored
from app.core.smtp_config import warn_if_smtp_env_config_ignored
from app.core.startup_checks import warn_if_frontend_base_url_is_dev_default
from tests.conftest import configure_ldap, configure_smtp


def test_ldap_warn_noop_when_row_does_not_exist_yet(db_session, caplog, monkeypatch):
    monkeypatch.setattr(settings, "ldap_enabled", True)
    monkeypatch.setattr(settings, "ldap_server_uri", "ldap://ldap.example.internal")

    with caplog.at_level(logging.WARNING):
        warn_if_ldap_env_config_ignored(db_session)

    assert caplog.records == []


def test_ldap_warn_noop_when_row_exists_and_env_is_default(db_session, caplog, monkeypatch):
    configure_ldap(db_session)
    monkeypatch.setattr(settings, "ldap_enabled", False)
    monkeypatch.setattr(settings, "ldap_server_uri", None)

    with caplog.at_level(logging.WARNING):
        warn_if_ldap_env_config_ignored(db_session)

    assert caplog.records == []


def test_ldap_warn_fires_when_row_exists_and_env_enabled(db_session, caplog, monkeypatch):
    configure_ldap(db_session)
    monkeypatch.setattr(settings, "ldap_enabled", True)
    monkeypatch.setattr(settings, "ldap_server_uri", None)

    with caplog.at_level(logging.WARNING):
        warn_if_ldap_env_config_ignored(db_session)

    assert len(caplog.records) == 1
    assert "LDAP 設定" in caplog.records[0].message


def test_ldap_warn_fires_when_row_exists_and_env_server_uri_set(db_session, caplog, monkeypatch):
    configure_ldap(db_session)
    monkeypatch.setattr(settings, "ldap_enabled", False)
    monkeypatch.setattr(settings, "ldap_server_uri", "ldap://old-env-value.example")

    with caplog.at_level(logging.WARNING):
        warn_if_ldap_env_config_ignored(db_session)

    assert len(caplog.records) == 1
    assert "LDAP 設定" in caplog.records[0].message


def test_smtp_warn_noop_when_row_does_not_exist_yet(db_session, caplog, monkeypatch):
    monkeypatch.setattr(settings, "smtp_host", "smtp.example.internal")

    with caplog.at_level(logging.WARNING):
        warn_if_smtp_env_config_ignored(db_session)

    assert caplog.records == []


def test_smtp_warn_noop_when_row_exists_and_env_is_default(db_session, caplog, monkeypatch):
    configure_smtp(db_session)
    monkeypatch.setattr(settings, "smtp_host", None)

    with caplog.at_level(logging.WARNING):
        warn_if_smtp_env_config_ignored(db_session)

    assert caplog.records == []


def test_smtp_warn_fires_when_row_exists_and_env_host_set(db_session, caplog, monkeypatch):
    configure_smtp(db_session)
    monkeypatch.setattr(settings, "smtp_host", "smtp.old-env-value.example")

    with caplog.at_level(logging.WARNING):
        warn_if_smtp_env_config_ignored(db_session)

    assert len(caplog.records) == 1
    assert "Email SMTP 設定" in caplog.records[0].message


def test_frontend_base_url_warn_noop_in_native_dev(caplog, monkeypatch, tmp_path):
    # No static_dir means nothing built an image here, so 5173 is genuinely correct.
    monkeypatch.setattr(settings, "static_dir", str(tmp_path / "does-not-exist"))
    monkeypatch.setattr(settings, "frontend_base_url", "http://localhost:5173")

    with caplog.at_level(logging.WARNING):
        warn_if_frontend_base_url_is_dev_default()

    assert caplog.records == []


def test_frontend_base_url_warn_fires_in_production_image_with_dev_default(caplog, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "static_dir", str(tmp_path))
    monkeypatch.setattr(settings, "frontend_base_url", "http://localhost:5173")

    with caplog.at_level(logging.WARNING):
        warn_if_frontend_base_url_is_dev_default()

    assert len(caplog.records) == 1
    assert "FRONTEND_BASE_URL" in caplog.records[0].message


def test_frontend_base_url_warn_noop_when_configured(caplog, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "static_dir", str(tmp_path))
    monkeypatch.setattr(settings, "frontend_base_url", "http://files.example.internal")

    with caplog.at_level(logging.WARNING):
        warn_if_frontend_base_url_is_dev_default()

    assert caplog.records == []
