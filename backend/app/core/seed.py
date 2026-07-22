from sqlalchemy.orm import Session

from app.core.audit import write_audit_log
from app.core.config import settings
from app.core.security import hash_password
from app.models import User


def seed_initial_admin(db: Session) -> None:
    if not settings.initial_admin_username or not settings.initial_admin_password:
        return
    if db.query(User).filter(User.role == "admin").first() is not None:
        return
    if db.query(User).filter(User.username == settings.initial_admin_username).first() is not None:
        return

    user = User(
        username=settings.initial_admin_username,
        password_hash=hash_password(settings.initial_admin_password),
        role="admin",
    )
    db.add(user)
    db.flush()
    write_audit_log(db, actor_id=user.id, action="user.create", target=user.username, detail="bootstrap initial admin")
    db.commit()
