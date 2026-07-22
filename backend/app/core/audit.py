from sqlalchemy.orm import Session

from app.models import AuditLog


def write_audit_log(
    db: Session, *, actor_id: int, action: str, target: str | None = None, detail: str | None = None
) -> None:
    db.add(AuditLog(actor_id=actor_id, action=action, target=target, detail=detail))
