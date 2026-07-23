from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.audit import write_audit_log
from app.core.database import get_db
from app.core.ldap_config import get_ldap_settings
from app.models import LdapSetting, User
from app.schemas.ldap_setting import LdapSettingResponse, LdapSettingUpdate

router = APIRouter()


def _to_response(settings_row: LdapSetting) -> LdapSettingResponse:
    return LdapSettingResponse(
        enabled=settings_row.enabled,
        server_uri=settings_row.server_uri,
        bind_dn=settings_row.bind_dn,
        bind_password_set=bool(settings_row.bind_password),
        base_dn=settings_row.base_dn,
        user_search_filter=settings_row.user_search_filter,
    )


# LDAP config includes infra details (server URI, bind DN) that guests/regular users
# shouldn't see, so unlike /api/site-settings this endpoint is admin-only for GET too.
@router.get("", response_model=LdapSettingResponse)
def read_ldap_settings(db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> LdapSettingResponse:
    return _to_response(get_ldap_settings(db))


@router.patch("", response_model=LdapSettingResponse)
def update_ldap_settings(
    payload: LdapSettingUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> LdapSettingResponse:
    settings_row = get_ldap_settings(db)

    fields_set = payload.model_fields_set
    changes: list[str] = []

    for field in ("enabled", "server_uri", "bind_dn", "base_dn", "user_search_filter"):
        if field in fields_set:
            value = getattr(payload, field)
            # user_search_filter is a required non-null column; an explicit null in the
            # request is treated as "leave unchanged" rather than a constraint violation.
            if field == "user_search_filter" and value is None:
                continue
            if value != getattr(settings_row, field):
                changes.append(f"{field} updated")
                setattr(settings_row, field, value)

    if "bind_password" in fields_set and payload.bind_password != settings_row.bind_password:
        changes.append("bind_password updated")
        settings_row.bind_password = payload.bind_password

    if changes:
        write_audit_log(db, actor_id=admin.id, action="ldap_settings.update", detail="; ".join(changes))

    db.commit()
    db.refresh(settings_row)
    return _to_response(settings_row)
