from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.audit import write_audit_log
from app.core.database import get_db
from app.core.smtp_config import get_smtp_settings
from app.models import SmtpSetting, User
from app.schemas.smtp_setting import SmtpSettingResponse, SmtpSettingUpdate

router = APIRouter()


def _to_response(settings_row: SmtpSetting) -> SmtpSettingResponse:
    return SmtpSettingResponse(
        enabled=settings_row.enabled,
        host=settings_row.host,
        port=settings_row.port,
        username=settings_row.username,
        password_set=bool(settings_row.password),
        from_address=settings_row.from_address,
        use_tls=settings_row.use_tls,
    )


# SMTP config includes infra details and credentials that guests/regular users
# shouldn't see, so unlike /api/site-settings this endpoint is admin-only for GET too
# (same reasoning as /api/ldap-settings).
@router.get("", response_model=SmtpSettingResponse)
def read_smtp_settings(db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> SmtpSettingResponse:
    return _to_response(get_smtp_settings(db))


@router.patch("", response_model=SmtpSettingResponse)
def update_smtp_settings(
    payload: SmtpSettingUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SmtpSettingResponse:
    settings_row = get_smtp_settings(db)

    fields_set = payload.model_fields_set
    changes: list[str] = []

    for field in ("enabled", "host", "port", "username", "from_address", "use_tls"):
        if field in fields_set:
            value = getattr(payload, field)
            # port/from_address are required non-null columns; an explicit null in the
            # request is treated as "leave unchanged" rather than a constraint violation.
            if field in ("port", "from_address") and value is None:
                continue
            if value != getattr(settings_row, field):
                changes.append(f"{field} updated")
                setattr(settings_row, field, value)

    if "password" in fields_set and payload.password != settings_row.password:
        changes.append("password updated")
        settings_row.password = payload.password

    if changes:
        write_audit_log(db, actor_id=admin.id, action="smtp_settings.update", detail="; ".join(changes))

    db.commit()
    db.refresh(settings_row)
    return _to_response(settings_row)
