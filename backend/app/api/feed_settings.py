from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.audit import write_audit_log
from app.core.database import get_db
from app.core.feed_schedule import get_feed_settings
from app.core.feed_scheduler import request_wakeup
from app.models import FeedSetting, User
from app.schemas.feed_setting import FeedSettingResponse, FeedSettingUpdate

router = APIRouter()

_EDITABLE_FIELDS = ("fetch_enabled", "fetch_interval_minutes")


# 這組端點刻意獨立成一個 router，而不是掛在 /api/feeds 底下的 /settings：feeds.py 有
# PATCH /{feed_id}，任何字面路徑都必須註冊在它之前才不會被當成 feed_id，該檔案已經為
# /admin 與 /items 踩過一次這個坑。分開就完全沒有順序問題。
#
# GET 也僅限管理員：抓取排程是維運資訊，訪客與一般使用者用不到，與 /api/ldap-settings、
# /api/smtp-settings 同一個取向（而不是 /api/site-settings 的公開 GET）。
@router.get("", response_model=FeedSettingResponse)
def read_feed_settings(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> FeedSetting:
    del admin
    settings_row = get_feed_settings(db)
    # get_feed_settings 可能剛把這一列建出來，要 commit 才會留下。
    db.commit()
    return settings_row


@router.patch("", response_model=FeedSettingResponse)
def update_feed_settings(
    payload: FeedSettingUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> FeedSetting:
    settings_row = get_feed_settings(db)

    fields_set = payload.model_fields_set
    changes: list[str] = []

    for field_name in _EDITABLE_FIELDS:
        if field_name not in fields_set:
            continue
        value = getattr(payload, field_name)
        # 兩個都是 non-null 欄位；明確傳入 null 時視為「維持原值」，而不是造成 constraint
        # violation，與 app/api/smtp_settings.py 的處理一致。
        if value is None:
            continue
        current = getattr(settings_row, field_name)
        if value != current:
            changes.append(f"{field_name}: {current} -> {value}")
            setattr(settings_row, field_name, value)

    if changes:
        write_audit_log(db, actor_id=admin.id, action="feed_settings.update", detail="; ".join(changes))

    db.commit()
    db.refresh(settings_row)

    # 排程器很可能正睡在上一輪的間隔裡（最長一天），不叫醒它的話這次的修改要等到下一次醒來
    # 才生效——管理員按下儲存卻什麼都沒發生，看起來就像壞掉。
    if changes:
        request_wakeup()

    return settings_row
