"""排程迴圈的測試。

真正在跑的那條 asyncio 迴圈本身不直接測（它只是「呼叫 _run_once()，睡它回傳的秒數」），
價值全在 _run_once()：讀設定、決定要不要抓、把結果寫回去、回傳下次要等多久。
"""

import pytest

from app.core import feed_scheduler, feeds as feeds_core
from app.core.feed_schedule import get_feed_settings
from app.core.feeds import RawFeed
from app.models import Feed, FeedItem

RSS_XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>test</title>
    <item>
      <title>first</title>
      <link>https://example.com/posts/1</link>
      <guid>https://example.com/posts/1</guid>
    </item>
  </channel>
</rss>
"""


@pytest.fixture
def scheduler_session(db_session, monkeypatch):
    """把排程器自開的 session 換成測試用的那一個。

    排程器刻意用 SessionLocal 開自己的 session（它跑在請求之外，沒有 FastAPI 的依賴注入可用），
    而 SessionLocal 指向的是真正設定的資料庫。close() 在這裡必須是 no-op，否則第一輪就會把測試
    共用的 session 關掉。
    """

    class _SharedSession:
        def __getattr__(self, name):
            return getattr(db_session, name)

        def close(self):
            pass

    monkeypatch.setattr(feed_scheduler, "SessionLocal", _SharedSession)


@pytest.fixture
def fake_fetch(monkeypatch):
    """把網路那一層換掉，測試絕不對外發真的 HTTP 請求。"""

    def _install(raw: RawFeed):
        monkeypatch.setattr(feeds_core, "fetch_feed", lambda *args, **kwargs: raw)

    return _install


def make_feed(db_session, *, title="消息部落格", url="https://example.com/rss", is_active=True):
    feed = Feed(title=title, url=url, is_public=True, is_active=is_active)
    db_session.add(feed)
    db_session.commit()
    db_session.refresh(feed)
    return feed


def test_run_once_does_nothing_while_disabled(db_session, scheduler_session, fake_fetch):
    make_feed(db_session)
    fake_fetch(RawFeed(status="ok", content=RSS_XML))

    delay = feed_scheduler._run_once()

    # 停用時只回頭輪詢，不抓取，也不留下「上次執行」。
    assert delay == feed_scheduler._DISABLED_POLL_SECONDS
    assert db_session.query(FeedItem).count() == 0
    assert get_feed_settings(db_session).last_run_at is None


def test_run_once_fetches_and_records_the_result_when_enabled(db_session, scheduler_session, fake_fetch):
    make_feed(db_session)
    settings_row = get_feed_settings(db_session)
    settings_row.fetch_enabled = True
    settings_row.fetch_interval_minutes = 15
    db_session.commit()
    fake_fetch(RawFeed(status="ok", content=RSS_XML))

    delay = feed_scheduler._run_once()

    assert delay == 15 * 60
    assert db_session.query(FeedItem).count() == 1

    db_session.refresh(settings_row)
    assert settings_row.last_run_status == "ok"
    assert settings_row.last_run_at is not None
    assert "成功 1" in settings_row.last_run_detail


def test_run_once_records_error_status_when_a_feed_fails(db_session, scheduler_session, fake_fetch):
    feed = make_feed(db_session)
    settings_row = get_feed_settings(db_session)
    settings_row.fetch_enabled = True
    db_session.commit()
    fake_fetch(RawFeed(status="error", error="無法連線至來源：ConnectError"))

    feed_scheduler._run_once()

    db_session.refresh(settings_row)
    assert settings_row.last_run_status == "error"
    assert "失敗 1" in settings_row.last_run_detail
    # 失敗原因仍然記在該來源自己那一列上，後台的狀態欄靠它顯示。
    db_session.refresh(feed)
    assert feed.last_status == "error"


def test_run_once_skips_inactive_feeds(db_session, scheduler_session, fake_fetch):
    make_feed(db_session, is_active=False)
    settings_row = get_feed_settings(db_session)
    settings_row.fetch_enabled = True
    db_session.commit()
    fake_fetch(RawFeed(status="ok", content=RSS_XML))

    feed_scheduler._run_once()

    assert db_session.query(FeedItem).count() == 0
    db_session.refresh(settings_row)
    assert "0 個來源" in settings_row.last_run_detail


def test_request_wakeup_is_a_no_op_when_the_scheduler_is_not_running():
    """管理員存檔的路徑會無條件呼叫它，排程器被 FEED_SCHEDULER_ENABLED=false 關掉時不能炸掉。"""
    assert feed_scheduler._task is None
    feed_scheduler.request_wakeup()
