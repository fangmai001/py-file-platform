from app.core.config import settings
from app.core.security import verify_password
from app.core.seed import seed_initial_admin
from app.models import AuditLog, User
from tests.conftest import make_user


def test_seed_creates_admin_when_configured_and_none_exists(db_session, monkeypatch):
    monkeypatch.setattr(settings, "initial_admin_username", "root")
    monkeypatch.setattr(settings, "initial_admin_password", "s3cret-pw")

    seed_initial_admin(db_session)

    user = db_session.query(User).filter(User.username == "root").one()
    assert user.role == "admin"
    assert verify_password("s3cret-pw", user.password_hash)

    audit = db_session.query(AuditLog).filter(AuditLog.actor_id == user.id).one()
    assert audit.action == "user.create"


def test_seed_noop_when_not_configured(db_session):
    assert settings.initial_admin_username is None
    assert settings.initial_admin_password is None

    seed_initial_admin(db_session)

    assert db_session.query(User).count() == 0


def test_seed_noop_when_admin_already_exists(db_session, monkeypatch):
    make_user(db_session, username="existing-admin", role="admin")
    monkeypatch.setattr(settings, "initial_admin_username", "root")
    monkeypatch.setattr(settings, "initial_admin_password", "s3cret-pw")

    seed_initial_admin(db_session)

    assert db_session.query(User).count() == 1
    assert db_session.query(User).filter(User.username == "root").first() is None


def test_seed_noop_when_username_taken_by_non_admin(db_session, monkeypatch):
    make_user(db_session, username="root", role="user")
    monkeypatch.setattr(settings, "initial_admin_username", "root")
    monkeypatch.setattr(settings, "initial_admin_password", "s3cret-pw")

    seed_initial_admin(db_session)

    user = db_session.query(User).filter(User.username == "root").one()
    assert user.role == "user"


def test_seed_is_idempotent_across_calls(db_session, monkeypatch):
    monkeypatch.setattr(settings, "initial_admin_username", "root")
    monkeypatch.setattr(settings, "initial_admin_password", "s3cret-pw")

    seed_initial_admin(db_session)
    seed_initial_admin(db_session)

    assert db_session.query(User).count() == 1
