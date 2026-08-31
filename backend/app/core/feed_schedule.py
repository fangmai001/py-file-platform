"""RSS 定時抓取排程設定的存取層。

設定存放在單列的 feed_settings 資料表，由管理員在後台「RSS 訂閱」分頁編輯——與
app/core/ldap_config.py、app/core/smtp_config.py 是同一個 get-or-create 模式。差別在這裡沒有
環境變數初始值：排程從一開始就只由管理後台管理，`.env` 只有一個是否要啟動排程器本身的
總開關（settings.feed_scheduler_enabled）。
"""

import logging
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.feeds import BatchFetchResult
from app.models import FeedSetting

logger = logging.getLogger(__name__)

_SETTINGS_ROW_ID = 1

# 間隔的合理範圍，schema 驗證與後台輸入框都以此為準。下限 5 分鐘是為了避免有人填 1 去騷擾
# 來源站台；超過一天等同於沒有排程，那個意思用停用開關表達更清楚。
MIN_FETCH_INTERVAL_MINUTES = 5
MAX_FETCH_INTERVAL_MINUTES = 1440


def get_feed_settings(db: Session) -> FeedSetting:
    """取出單列的抓取排程設定，不存在時以 model 的預設值建立。

    刻意只 flush 不 commit，交易邊界留給呼叫端——與 get_ldap_settings() 一致。
    """
    settings_row = db.get(FeedSetting, _SETTINGS_ROW_ID)
    if settings_row is None:
        settings_row = FeedSetting(id=_SETTINGS_ROW_ID)
        db.add(settings_row)
        db.flush()
    return settings_row


def record_run_result(db: Session, result: BatchFetchResult) -> FeedSetting:
    """把一次整批抓取的結果寫進設定列，供後台顯示「上次執行」。

    排程器與管理員的「全部立即抓取」共用這一個欄位組：對管理員來說兩者都是「整批跑了一次」，
    拆成兩份紀錄只會讓畫面上要解釋的東西變多。同樣不 commit。
    """
    settings_row = get_feed_settings(db)
    settings_row.last_run_at = datetime.now(tz=UTC)
    settings_row.last_run_status = "error" if result.failed else "ok"
    settings_row.last_run_detail = result.summary
    return settings_row
