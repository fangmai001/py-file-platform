from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.audit import write_audit_log
from app.core.database import get_db
from app.models import SiteSetting, User
from app.schemas.site_setting import SiteSettingResponse, SiteSettingUpdate

router = APIRouter()

_SETTINGS_ROW_ID = 1


def _get_or_create_settings(db: Session) -> SiteSetting:
    settings_row = db.get(SiteSetting, _SETTINGS_ROW_ID)
    if settings_row is None:
        settings_row = SiteSetting(id=_SETTINGS_ROW_ID)
        db.add(settings_row)
        db.flush()
    return settings_row


@router.get("", response_model=SiteSettingResponse)
def get_site_settings(db: Session = Depends(get_db)) -> SiteSetting:
    return _get_or_create_settings(db)


@router.patch("", response_model=SiteSettingResponse)
def update_site_settings(
    payload: SiteSettingUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SiteSetting:
    settings_row = _get_or_create_settings(db)

    fields_set = payload.model_fields_set
    changes: list[str] = []

    for field in ("brand_name", "browser_title", "hero_title", "hero_subtitle"):
        if field in fields_set:
            value = getattr(payload, field)
            if value != getattr(settings_row, field):
                changes.append(f"{field} updated")
                setattr(settings_row, field, value)

    if changes:
        write_audit_log(db, actor_id=admin.id, action="site_settings.update", detail="; ".join(changes))

    db.commit()
    db.refresh(settings_row)
    return settings_row
