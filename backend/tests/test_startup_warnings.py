import logging

import pytest

from app.core.config import settings
from app.core.ldap_config import warn_if_ldap_env_config_ignored
from app.core.smtp_config import warn_if_smtp_env_config_ignored
from app.core.startup_checks import check_jwt_secret_key, warn_if_frontend_base_url_is_dev_default
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
    # 沒有 static_dir 就代表這裡從沒建置過 image，所以 5173 確實是正確的。
    monkeypatch.setattr(settings, "static_dir", str(tmp_path / "does-not-exist"))
    monkeypatch.setattr(settings, "frontend_base_url", "http://localhost:5173")

    with caplog.at_level(logging.WARNING):
        warn_if_frontend_base_url_is_dev_default()

    assert caplog.records == []


def _make_production_image(monkeypatch, tmp_path):
    """讓 static_dir 看起來像正式環境的 image：真的有一份建置好的前端在裡面。

    只有目錄存在是不夠的——判斷依據是 index.html（見 app/core/static.py 的
    has_bundled_frontend），這樣一個空的 static/ 目錄不會被誤判成正式部署。
    """
    (tmp_path / "index.html").write_text("<!doctype html>")
    monkeypatch.setattr(settings, "static_dir", str(tmp_path))


def test_frontend_base_url_warn_fires_in_production_image_with_dev_default(caplog, monkeypatch, tmp_path):
    _make_production_image(monkeypatch, tmp_path)
    monkeypatch.setattr(settings, "frontend_base_url", "http://localhost:5173")

    with caplog.at_level(logging.WARNING):
        warn_if_frontend_base_url_is_dev_default()

    assert len(caplog.records) == 1
    assert "FRONTEND_BASE_URL" in caplog.records[0].message


def test_frontend_base_url_warn_noop_when_configured(caplog, monkeypatch, tmp_path):
    _make_production_image(monkeypatch, tmp_path)
    monkeypatch.setattr(settings, "frontend_base_url", "http://files.example.internal")

    with caplog.at_level(logging.WARNING):
        warn_if_frontend_base_url_is_dev_default()

    assert caplog.records == []


def test_jwt_secret_warn_in_native_dev_when_left_at_placeholder(caplog, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "static_dir", str(tmp_path / "does-not-exist"))
    monkeypatch.setattr(settings, "jwt_secret_key", "change-me")

    with caplog.at_level(logging.WARNING):
        check_jwt_secret_key()

    # 原生開發只警告，好讓 `cp .env.example .env` 之後就能直接跑起來。
    assert len(caplog.records) == 1
    assert "JWT_SECRET_KEY" in caplog.records[0].message


def test_jwt_secret_refuses_to_start_the_production_image(monkeypatch, tmp_path):
    _make_production_image(monkeypatch, tmp_path)
    monkeypatch.setattr(settings, "jwt_secret_key", "change-me-to-a-long-random-string")

    # 這個字串簽發站上所有的 JWT，留著公開已知的值等於任何人都能自己簽一張管理員 token。
    # 與 APP_VERSION 同樣是刻意早失敗。
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY"):
        check_jwt_secret_key()


def test_jwt_secret_noop_when_a_real_key_is_set(caplog, monkeypatch, tmp_path):
    _make_production_image(monkeypatch, tmp_path)
    monkeypatch.setattr(settings, "jwt_secret_key", "9f2c1b7e4a6d8f0c3e5a7b9d1f3a5c7e")

    with caplog.at_level(logging.WARNING):
        check_jwt_secret_key()

    assert caplog.records == []
