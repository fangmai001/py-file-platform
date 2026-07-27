from unittest.mock import MagicMock, patch

from app.models import Notification
from tests.conftest import auth_headers, configure_smtp, make_user
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


def test_list_notifications_paginates_with_skip_and_limit(client, db_session):
    uploader = make_user(db_session, username="uploader")
    alice = make_user(db_session, username="alice")
    file_id = _upload(client, uploader, is_public=True).json()["id"]

    # test_public_upload_notifies_other_active_users_not_uploader already covers the
    # notification created by that one upload; add more directly so a full 60-row page
    # doesn't require 60 real uploads.
    for _ in range(59):
        db_session.add(Notification(recipient_id=alice.id, file_id=file_id, message="another upload"))
    db_session.commit()

    first_page = client.get("/api/notifications?limit=50", headers=auth_headers(alice))
    assert first_page.status_code == 200
    assert len(first_page.json()) == 50

    second_page = client.get("/api/notifications?skip=50&limit=50", headers=auth_headers(alice))
    assert second_page.status_code == 200
    assert len(second_page.json()) == 10

    assert {n["id"] for n in first_page.json()}.isdisjoint({n["id"] for n in second_page.json()})


def test_list_notifications_clamps_out_of_range_limit(client, db_session):
    uploader = make_user(db_session, username="uploader")
    alice = make_user(db_session, username="alice")
    _upload(client, uploader, is_public=True)

    response = client.get("/api/notifications?skip=-5&limit=1000", headers=auth_headers(alice))
    assert response.status_code == 200
    assert len(response.json()) == 1


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


def test_mark_all_notifications_read_only_affects_own_unread(client, db_session):
    uploader = make_user(db_session, username="uploader")
    alice = make_user(db_session, username="alice")
    bob = make_user(db_session, username="bob")
    _upload(client, uploader, filename="a.pdf", is_public=True)
    _upload(client, uploader, filename="b.pdf", is_public=True)

    response = client.patch("/api/notifications/read-all", headers=auth_headers(alice))
    assert response.status_code == 200
    assert response.json()["updated"] == 2

    alice_notifications = db_session.query(Notification).filter(Notification.recipient_id == alice.id).all()
    assert all(n.is_read for n in alice_notifications)

    bob_notifications = db_session.query(Notification).filter(Notification.recipient_id == bob.id).all()
    assert all(not n.is_read for n in bob_notifications)


def test_mark_all_notifications_read_is_idempotent(client, db_session):
    uploader = make_user(db_session, username="uploader")
    alice = make_user(db_session, username="alice")
    _upload(client, uploader, is_public=True)

    first = client.patch("/api/notifications/read-all", headers=auth_headers(alice))
    assert first.json()["updated"] == 1

    second = client.patch("/api/notifications/read-all", headers=auth_headers(alice))
    assert second.json()["updated"] == 0


def test_mark_all_notifications_read_requires_auth(client):
    response = client.patch("/api/notifications/read-all")
    assert response.status_code == 401


def test_upload_sends_email_only_to_recipients_with_email_on_file(client, db_session):
    configure_smtp(db_session)
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
    uploader = make_user(db_session, username="uploader")
    make_user(db_session, username="with-email", email="with-email@example.com")

    with patch("app.core.mailer.smtplib.SMTP") as mock_smtp_cls:
        response = _upload(client, uploader, is_public=True)

    assert response.status_code == 201
    mock_smtp_cls.assert_not_called()
    # In-app notification still gets written even though email is skipped.
    assert db_session.query(Notification).count() == 1


def test_upload_succeeds_even_if_email_send_raises(client, db_session):
    configure_smtp(db_session)
    uploader = make_user(db_session, username="uploader")
    make_user(db_session, username="with-email", email="with-email@example.com")

    with patch("app.core.mailer.smtplib.SMTP", side_effect=OSError("connection refused")):
        response = _upload(client, uploader, is_public=True)

    assert response.status_code == 201
    assert db_session.query(Notification).count() == 1
