from unittest.mock import MagicMock, patch

from app.core.config import settings
from app.models import Notification
from tests.conftest import auth_headers, make_user
from tests.test_files import _upload


def test_public_upload_notifies_other_active_users_not_uploader(client, db_session):
    uploader = make_user(db_session, username="uploader")
    other = make_user(db_session, username="other")
    inactive = make_user(db_session, username="ghost", is_active=False)

    response = _upload(client, uploader, is_public=True)
    assert response.status_code == 201
    file_id = response.json()["id"]

    notifications = db_session.query(Notification).all()
    assert len(notifications) == 1
    assert notifications[0].recipient_id == other.id
    assert notifications[0].file_id == file_id
    assert "uploader" in notifications[0].message

    assert db_session.query(Notification).filter(Notification.recipient_id == uploader.id).first() is None
    assert db_session.query(Notification).filter(Notification.recipient_id == inactive.id).first() is None


def test_private_upload_creates_no_notifications(client, db_session):
    uploader = make_user(db_session, username="uploader")
    make_user(db_session, username="other")

    response = _upload(client, uploader, is_public=False)
    assert response.status_code == 201

    assert db_session.query(Notification).count() == 0


def test_new_version_upload_also_notifies(client, db_session):
    uploader = make_user(db_session, username="uploader")
    make_user(db_session, username="other")

    _upload(client, uploader, is_public=True)
    _upload(client, uploader, is_public=True)  # same filename -> new version of same file

    assert db_session.query(Notification).count() == 2


def test_list_notifications_only_own_newest_first(client, db_session):
    uploader = make_user(db_session, username="uploader")
    alice = make_user(db_session, username="alice")
    bob = make_user(db_session, username="bob")

    _upload(client, uploader, filename="a.pdf", is_public=True)
    _upload(client, uploader, filename="b.pdf", is_public=True)

    response = client.get("/api/notifications", headers=auth_headers(alice))
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert body[0]["created_at"] >= body[1]["created_at"]

    bob_response = client.get("/api/notifications", headers=auth_headers(bob))
    assert len(bob_response.json()) == 2


def test_notifications_require_auth(client):
    response = client.get("/api/notifications")
    assert response.status_code == 401


def test_mark_notification_read(client, db_session):
    uploader = make_user(db_session, username="uploader")
    alice = make_user(db_session, username="alice")
    _upload(client, uploader, is_public=True)

    notification = db_session.query(Notification).filter(Notification.recipient_id == alice.id).one()
    assert notification.is_read is False

    response = client.patch(
        f"/api/notifications/{notification.id}", headers=auth_headers(alice), json={"is_read": True}
    )
    assert response.status_code == 200
    assert response.json()["is_read"] is True


def test_cannot_mark_others_notification_read(client, db_session):
    uploader = make_user(db_session, username="uploader")
    alice = make_user(db_session, username="alice")
    bob = make_user(db_session, username="bob")
    _upload(client, uploader, is_public=True)

    notification = db_session.query(Notification).filter(Notification.recipient_id == alice.id).one()

    response = client.patch(
        f"/api/notifications/{notification.id}", headers=auth_headers(bob), json={"is_read": True}
    )
    assert response.status_code == 404


def test_upload_sends_email_only_to_recipients_with_email_on_file(client, db_session, monkeypatch):
    monkeypatch.setattr(settings, "smtp_host", "smtp.example.internal")
    uploader = make_user(db_session, username="uploader")
    make_user(db_session, username="with-email", email="with-email@example.com")
    make_user(db_session, username="no-email")

    mock_smtp_instance = MagicMock()
    mock_smtp_instance.__enter__ = MagicMock(return_value=mock_smtp_instance)
    mock_smtp_instance.__exit__ = MagicMock(return_value=False)

    with patch("app.core.mailer.smtplib.SMTP", return_value=mock_smtp_instance) as mock_smtp_cls:
        response = _upload(client, uploader, is_public=True)

    assert response.status_code == 201
    mock_smtp_cls.assert_called_once()
    mock_smtp_instance.send_message.assert_called_once()
    sent_message = mock_smtp_instance.send_message.call_args[0][0]
    assert sent_message["To"] == "with-email@example.com"


def test_upload_skips_email_when_smtp_not_configured(client, db_session):
    assert settings.smtp_host is None
    uploader = make_user(db_session, username="uploader")
    make_user(db_session, username="with-email", email="with-email@example.com")

    with patch("app.core.mailer.smtplib.SMTP") as mock_smtp_cls:
        response = _upload(client, uploader, is_public=True)

    assert response.status_code == 201
    mock_smtp_cls.assert_not_called()
    # In-app notification still gets written even though email is skipped.
    assert db_session.query(Notification).count() == 1


def test_upload_succeeds_even_if_email_send_raises(client, db_session, monkeypatch):
    monkeypatch.setattr(settings, "smtp_host", "smtp.example.internal")
    uploader = make_user(db_session, username="uploader")
    make_user(db_session, username="with-email", email="with-email@example.com")

    with patch("app.core.mailer.smtplib.SMTP", side_effect=OSError("connection refused")):
        response = _upload(client, uploader, is_public=True)

    assert response.status_code == 201
    assert db_session.query(Notification).count() == 1
