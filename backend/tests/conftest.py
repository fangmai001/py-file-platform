import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models import LdapSetting, SmtpSetting, User

_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


# SQLite 除非連線明確開啟，否則會忽略 foreign key constraint。Postgres（真正的目標資料庫）
# 一律強制執行，所以這樣設定能讓 FK 違規的 bug（例如在子資料列之前先刪掉父資料列）
# 在測試中同樣重現得出來。
@event.listens_for(_engine, "connect")
def _enable_sqlite_fk(dbapi_connection, _):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


_TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


@pytest.fixture(autouse=True)
def _reset_db():
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)


@pytest.fixture(autouse=True)
def _isolated_upload_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))


# client fixture 是以 with TestClient(app) 進入的，因此每個測試都會跑一次 lifespan——包含啟動
# 內建的 RSS 抓取排程器。那條迴圈會用 SessionLocal 連向真正設定的資料庫（而非這裡的 in-memory
# SQLite），並可能真的對外發出 HTTP 請求，所以測試裡一律關掉它。排程器本身的邏輯改為直接測
# _run_once()，見 tests/test_feed_scheduler.py。
@pytest.fixture(autouse=True)
def _disable_feed_scheduler(monkeypatch):
    monkeypatch.setattr(settings, "feed_scheduler_enabled", False)


@pytest.fixture
def db_session():
    session = _TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def make_user(
    db_session,
    username="alice",
    password="s3cret-pw",
    role="user",
    is_active=True,
    email=None,
    full_name=None,
    notify_by_email=True,
) -> User:
    user = User(
        username=username,
        email=email,
        full_name=full_name,
        password_hash=hash_password(password),
        role=role,
        is_active=is_active,
        notify_by_email=notify_by_email,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def make_ldap_user(db_session, username="alice", role="user", is_active=True) -> User:
    user = User(username=username, password_hash=None, auth_source="ldap", role=role, is_active=is_active)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def configure_ldap(
    db_session,
    *,
    enabled=True,
    server_uri="ldap://ldap.example.internal",
    bind_dn="cn=service,dc=example",
    bind_password="service-pw",
    base_dn="ou=people,dc=example",
    user_search_filter="(uid={username})",
) -> LdapSetting:
    settings_row = LdapSetting(
        id=1,
        enabled=enabled,
        server_uri=server_uri,
        bind_dn=bind_dn,
        bind_password=bind_password,
        base_dn=base_dn,
        user_search_filter=user_search_filter,
    )
    db_session.add(settings_row)
    db_session.commit()
    db_session.refresh(settings_row)
    return settings_row


def configure_smtp(
    db_session,
    *,
    enabled=True,
    host="smtp.example.internal",
    port=587,
    username=None,
    password=None,
    from_address="noreply@example.com",
    use_tls=True,
) -> SmtpSetting:
    settings_row = SmtpSetting(
        id=1,
        enabled=enabled,
        host=host,
        port=port,
        username=username,
        password=password,
        from_address=from_address,
        use_tls=use_tls,
    )
    db_session.add(settings_row)
    db_session.commit()
    db_session.refresh(settings_row)
    return settings_row


def auth_headers(user: User) -> dict[str, str]:
    token = create_access_token(subject=user.username)
    return {"Authorization": f"Bearer {token}"}
