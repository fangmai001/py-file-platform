import threading
from datetime import UTC, datetime
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from app.core import feeds as feeds_core
from app.core.feed_schedule import get_feed_settings
from app.core.feeds import RawFeed, fetch_feed, parse_feed, refresh_all_feeds, refresh_feed
from app.models import AuditLog, Feed, FeedItem, Folder
from tests.conftest import auth_headers, make_user

RSS_XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>\xe7\xa4\xbe\xe5\x9c\x98\xe9\x83\xa8\xe8\x90\xbd\xe6\xa0\xbc</title>
    <item>
      <title>\xe7\xac\xac\xe4\xb8\x80\xe7\xaf\x87</title>
      <link>https://example.com/posts/1</link>
      <guid>https://example.com/posts/1</guid>
      <author>alice@example.com</author>
      <description>\xe7\xac\xac\xe4\xb8\x80\xe7\xaf\x87\xe7\x9a\x84\xe6\x91\x98\xe8\xa6\x81</description>
      <pubDate>Mon, 03 Mar 2025 08:00:00 GMT</pubDate>
    </item>
    <item>
      <title>\xe7\xac\xac\xe4\xba\x8c\xe7\xaf\x87</title>
      <link>https://example.com/posts/2</link>
      <guid>https://example.com/posts/2</guid>
      <pubDate>Tue, 04 Mar 2025 08:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
"""

ATOM_XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom \xe4\xbe\x86\xe6\xba\x90</title>
  <entry>
    <title>Atom \xe7\xaf\x87</title>
    <link href="https://example.org/a"/>
    <id>tag:example.org,2025:a</id>
    <updated>2025-03-05T09:30:00Z</updated>
    <summary>Atom \xe6\x91\x98\xe8\xa6\x81</summary>
  </entry>
</feed>
"""

# 連 guid 與 link 都沒有的 feed 確實存在，這時去重只能靠標題與日期湊出來的雜湊。
NO_GUID_XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>no guid</title>
    <item>
      <title>\xe7\x84\xa1 guid \xe7\x9a\x84\xe9\xa0\x85\xe7\x9b\xae</title>
      <pubDate>Mon, 03 Mar 2025 08:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
"""


def make_feed(db_session, *, title="消息部落格", url="https://example.com/rss", is_public=True, is_active=True):
    feed = Feed(title=title, url=url, is_public=is_public, is_active=is_active)
    db_session.add(feed)
    db_session.commit()
    db_session.refresh(feed)
    return feed


@pytest.fixture
def fake_fetch(monkeypatch):
    """把網路那一層換掉。測試絕不對外發真的 HTTP 請求——那會讓測試在離線的 CI 上變成擲骰子。"""

    def _install(raw: RawFeed):
        monkeypatch.setattr(feeds_core, "fetch_feed", lambda *args, **kwargs: raw)

    return _install


def test_parse_rss_normalises_fields():
    entries = parse_feed(RSS_XML)

    assert [entry.title for entry in entries] == ["第一篇", "第二篇"]
    first = entries[0]
    assert first.guid == "https://example.com/posts/1"
    assert first.link == "https://example.com/posts/1"
    assert first.author == "alice@example.com"
    assert first.summary == "第一篇的摘要"
    assert first.published_at == datetime(2025, 3, 3, 8, 0, tzinfo=UTC)


def test_parse_atom_normalises_fields():
    entries = parse_feed(ATOM_XML)

    assert len(entries) == 1
    entry = entries[0]
    assert entry.title == "Atom 篇"
    assert entry.guid == "tag:example.org,2025:a"
    assert entry.link == "https://example.org/a"
    # published 缺席時退回 updated。
    assert entry.published_at == datetime(2025, 3, 5, 9, 30, tzinfo=UTC)


def test_parse_entry_without_guid_falls_back_to_stable_hash():
    first = parse_feed(NO_GUID_XML)
    second = parse_feed(NO_GUID_XML)

    assert first[0].guid == second[0].guid


def test_refresh_feed_creates_items_then_deduplicates(db_session, fake_fetch):
    feed = make_feed(db_session)
    fake_fetch(RawFeed(status="ok", content=RSS_XML, etag='W/"abc"', last_modified="Mon, 03 Mar 2025 08:00:00 GMT"))

    first = refresh_feed(db_session, feed)
    db_session.commit()
    assert (first.status, first.created, first.skipped) == ("ok", 2, 0)
    assert feed.etag == 'W/"abc"'
    assert feed.last_status == "ok"

    second = refresh_feed(db_session, feed)
    db_session.commit()
    assert (second.status, second.created, second.skipped) == ("ok", 0, 2)
    assert db_session.query(FeedItem).count() == 2


def test_refresh_feed_handles_not_modified(db_session, fake_fetch):
    feed = make_feed(db_session)
    fake_fetch(RawFeed(status="ok", content=RSS_XML))
    refresh_feed(db_session, feed)
    db_session.commit()

    fake_fetch(RawFeed(status="not_modified"))
    result = refresh_feed(db_session, feed)
    db_session.commit()

    assert result.status == "not_modified"
    assert result.created == 0
    assert feed.last_status == "not_modified"
    assert feed.last_fetched_at is not None
    assert db_session.query(FeedItem).count() == 2


def test_refresh_feed_records_error_and_keeps_existing_items(db_session, fake_fetch):
    feed = make_feed(db_session)
    fake_fetch(RawFeed(status="ok", content=RSS_XML))
    refresh_feed(db_session, feed)
    db_session.commit()

    fake_fetch(RawFeed(status="error", error="HTTP 500"))
    result = refresh_feed(db_session, feed)
    db_session.commit()

    assert result.status == "error"
    assert result.error == "HTTP 500"
    assert feed.last_status == "error"
    assert feed.last_error == "HTTP 500"
    assert db_session.query(FeedItem).count() == 2


def test_refresh_feed_rejects_content_that_is_not_a_feed(db_session, fake_fetch):
    """回 200 卻塞了一個網頁給我們的來源（防火牆挑戰頁、錯誤頁）必須記成失敗。

    這是最難察覺的一種壞法：沒有錯誤碼、沒有例外，只是永遠 0 則。少了這道檢查，它與「抓到了一個
    當下沒有新項目的 feed」在後台看起來一模一樣。
    """
    feed = make_feed(db_session)
    fake_fetch(RawFeed(status="ok", content=b"<html><body>Access denied</body></html>"))

    result = refresh_feed(db_session, feed)
    db_session.commit()

    assert result.status == "error"
    assert result.created == 0
    assert feed.last_status == "error"
    assert feed.last_error is not None
    assert db_session.query(FeedItem).count() == 0


@pytest.fixture
def stub_origin():
    """在 loopback 上跑一個真的 HTTP server，用來測 fetch_feed 自己那層 httpx。

    這一層過去完全沒有測試——測試都把 fetch_feed 整個換掉——而防火牆的挑戰回應正是從這個縫隙
    溜過去的。綁在 127.0.0.1 上，離線的 CI 一樣跑得動。
    """
    responses: dict[str, tuple[int, bytes, str]] = {}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            status, body, content_type = responses[self.path]
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if body:
                self.wfile.write(body)

        def log_message(self, *args):
            pass

    server = HTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()

    def _register(path: str, status: int, body: bytes, content_type: str = "application/xml") -> str:
        responses[path] = (status, body, content_type)
        return f"http://127.0.0.1:{server.server_port}{path}"

    yield _register
    server.shutdown()


def test_fetch_feed_reads_a_normal_response(stub_origin):
    url = stub_origin("/rss", 200, RSS_XML)

    raw = fetch_feed(url)

    assert raw.status == "ok"
    assert raw.content == RSS_XML


def test_fetch_feed_treats_non_200_success_as_error(stub_origin):
    """AWS WAF 擋下請求時回的是 202 加上空 body，不是錯誤碼——raise_for_status() 攔不到它。"""
    url = stub_origin("/challenge", 202, b"", content_type="text/html")

    raw = fetch_feed(url)

    assert raw.status == "error"
    assert "202" in raw.error


def test_fetch_feed_treats_empty_body_as_error(stub_origin):
    url = stub_origin("/empty", 200, b"")

    raw = fetch_feed(url)

    assert raw.status == "error"
    assert raw.error is not None


def test_guest_only_sees_public_and_active_feeds(client, db_session):
    make_feed(db_session, title="公開來源", url="https://example.com/a")
    make_feed(db_session, title="私密來源", url="https://example.com/b", is_public=False)
    make_feed(db_session, title="停用來源", url="https://example.com/c", is_active=False)

    response = client.get("/api/feeds")
    assert response.status_code == 200
    assert {feed["title"] for feed in response.json()} == {"公開來源"}
    # 公開的回應不揭露抓取失敗的內部訊息。
    assert "last_error" not in response.json()[0]


def test_admin_list_includes_private_feeds_and_last_error(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    feed = make_feed(db_session, title="私密來源", is_public=False)
    feed.last_error = "HTTP 500"
    db_session.commit()

    response = client.get("/api/feeds/admin", headers=auth_headers(admin))
    assert response.status_code == 200
    body = response.json()
    assert {f["title"] for f in body} == {"私密來源"}
    assert body[0]["last_error"] == "HTTP 500"


def test_non_admin_cannot_list_feeds_for_admin(client, db_session):
    user = make_user(db_session)

    assert client.get("/api/feeds/admin").status_code == 401
    assert client.get("/api/feeds/admin", headers=auth_headers(user)).status_code == 403


def test_guest_cannot_see_items_of_private_feed(client, db_session):
    public_feed = make_feed(db_session, title="公開來源", url="https://example.com/a")
    private_feed = make_feed(db_session, title="私密來源", url="https://example.com/b", is_public=False)
    db_session.add_all(
        [
            FeedItem(feed_id=public_feed.id, guid="p1", title="公開文章"),
            FeedItem(feed_id=private_feed.id, guid="s1", title="私密文章"),
        ]
    )
    db_session.commit()

    response = client.get("/api/feeds/items")
    assert response.status_code == 200
    assert {item["title"] for item in response.json()} == {"公開文章"}


def test_admin_sees_items_of_private_feed(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    private_feed = make_feed(db_session, title="私密來源", is_public=False)
    db_session.add(FeedItem(feed_id=private_feed.id, guid="s1", title="私密文章"))
    db_session.commit()

    response = client.get("/api/feeds/items", headers=auth_headers(admin))
    assert response.status_code == 200
    assert {item["title"] for item in response.json()} == {"私密文章"}


def test_items_are_sorted_newest_first_and_can_be_filtered(client, db_session):
    feed_a = make_feed(db_session, title="來源 A", url="https://example.com/a")
    feed_b = make_feed(db_session, title="來源 B", url="https://example.com/b")
    db_session.add_all(
        [
            FeedItem(
                feed_id=feed_a.id, guid="a1", title="舊文章", published_at=datetime(2025, 1, 1, tzinfo=UTC)
            ),
            FeedItem(
                feed_id=feed_a.id, guid="a2", title="新文章", published_at=datetime(2025, 6, 1, tzinfo=UTC)
            ),
            FeedItem(feed_id=feed_b.id, guid="b1", title="別的來源"),
        ]
    )
    db_session.commit()

    response = client.get(f"/api/feeds/items?feed_id={feed_a.id}")
    assert response.status_code == 200
    assert [item["title"] for item in response.json()] == ["新文章", "舊文章"]


def test_items_can_be_filtered_by_folder(client, db_session):
    folder = Folder(name="技術文章")
    db_session.add(folder)
    db_session.commit()
    db_session.refresh(folder)

    in_folder = make_feed(db_session, title="來源 A", url="https://example.com/a")
    in_folder.folder_id = folder.id
    uncategorised = make_feed(db_session, title="來源 B", url="https://example.com/b")
    db_session.add_all(
        [
            FeedItem(feed_id=in_folder.id, guid="a1", title="技術文章一則"),
            FeedItem(feed_id=uncategorised.id, guid="b1", title="未分類的一則"),
        ]
    )
    db_session.commit()

    response = client.get(f"/api/feeds/items?folder_id={folder.id}")
    assert response.status_code == 200
    assert {item["title"] for item in response.json()} == {"技術文章一則"}


def test_folder_filter_does_not_leak_items_of_private_feeds(client, db_session):
    """分類篩選不能繞過可見度。它只是多加一個條件，不是換一套規則。"""
    folder = Folder(name="技術文章")
    db_session.add(folder)
    db_session.commit()
    db_session.refresh(folder)

    private_feed = make_feed(db_session, title="私密來源", url="https://example.com/a", is_public=False)
    private_feed.folder_id = folder.id
    db_session.add(FeedItem(feed_id=private_feed.id, guid="s1", title="私密文章"))
    db_session.commit()

    response = client.get(f"/api/feeds/items?folder_id={folder.id}")
    assert response.status_code == 200
    assert response.json() == []


def test_non_admin_cannot_write_feeds(client, db_session):
    user = make_user(db_session)
    feed = make_feed(db_session)

    payload = {"title": "新來源", "url": "https://example.net/rss"}
    assert client.post("/api/feeds", headers=auth_headers(user), json=payload).status_code == 403
    assert client.patch(f"/api/feeds/{feed.id}", headers=auth_headers(user), json={"title": "x"}).status_code == 403
    assert client.delete(f"/api/feeds/{feed.id}", headers=auth_headers(user)).status_code == 403
    assert client.post(f"/api/feeds/{feed.id}/fetch", headers=auth_headers(user)).status_code == 403


def test_admin_can_create_feed_and_audit_log_is_written(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.post(
        "/api/feeds",
        headers=auth_headers(admin),
        json={"title": "消息部落格", "description": "每週更新", "url": "https://example.com/rss"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "消息部落格"
    assert body["is_public"] is True
    assert body["is_active"] is True
    assert body["last_status"] is None

    log = db_session.query(AuditLog).filter(AuditLog.action == "feed.create").one()
    assert log.target == "消息部落格"


def test_creating_duplicate_url_is_rejected(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    make_feed(db_session, url="https://example.com/rss")

    response = client.post(
        "/api/feeds",
        headers=auth_headers(admin),
        json={"title": "重複的來源", "url": "https://example.com/rss"},
    )
    assert response.status_code == 400


def test_creating_feed_with_unknown_folder_is_rejected(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.post(
        "/api/feeds",
        headers=auth_headers(admin),
        json={"title": "消息部落格", "url": "https://example.com/rss", "folder_id": 999},
    )
    assert response.status_code == 400


def test_admin_can_update_feed_and_changing_url_clears_cache_headers(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    feed = make_feed(db_session)
    feed.etag = 'W/"abc"'
    feed.last_modified = "Mon, 03 Mar 2025 08:00:00 GMT"
    db_session.commit()

    response = client.patch(
        f"/api/feeds/{feed.id}",
        headers=auth_headers(admin),
        json={"url": "https://example.com/new-rss", "is_active": False},
    )
    assert response.status_code == 200
    db_session.refresh(feed)
    assert feed.url == "https://example.com/new-rss"
    assert feed.is_active is False
    assert feed.etag is None
    assert feed.last_modified is None
    assert db_session.query(AuditLog).filter(AuditLog.action == "feed.update").count() == 1


def test_deleting_feed_removes_its_items(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    feed = make_feed(db_session)
    db_session.add(FeedItem(feed_id=feed.id, guid="a1", title="文章"))
    db_session.commit()

    response = client.delete(f"/api/feeds/{feed.id}", headers=auth_headers(admin))
    assert response.status_code == 204
    assert db_session.query(FeedItem).count() == 0
    assert db_session.query(AuditLog).filter(AuditLog.action == "feed.delete").count() == 1


def test_admin_can_fetch_feed_now(client, db_session, fake_fetch):
    admin = make_user(db_session, username="root", role="admin")
    feed = make_feed(db_session)
    fake_fetch(RawFeed(status="ok", content=RSS_XML))

    response = client.post(f"/api/feeds/{feed.id}/fetch", headers=auth_headers(admin))
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["created"] == 2
    assert body["error"] is None
    assert db_session.query(FeedItem).count() == 2
    assert db_session.query(AuditLog).filter(AuditLog.action == "feed.fetch").count() == 1


def test_fetch_now_reports_failure_without_raising(client, db_session, fake_fetch):
    admin = make_user(db_session, username="root", role="admin")
    feed = make_feed(db_session)
    fake_fetch(RawFeed(status="error", error="無法連線至來源：ConnectError"))

    response = client.post(f"/api/feeds/{feed.id}/fetch", headers=auth_headers(admin))
    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert response.json()["error"] == "無法連線至來源：ConnectError"


def test_fetch_unknown_feed_returns_404(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    assert client.post("/api/feeds/999/fetch", headers=auth_headers(admin)).status_code == 404


def test_deleting_folder_resets_feed_folder_id(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    folder = Folder(name="技術文章")
    db_session.add(folder)
    db_session.commit()
    db_session.refresh(folder)

    feed = make_feed(db_session)
    feed.folder_id = folder.id
    db_session.commit()

    response = client.delete(f"/api/folders/{folder.id}", headers=auth_headers(admin))
    assert response.status_code == 204
    db_session.refresh(feed)
    assert feed.folder_id is None


def test_refresh_all_feeds_skips_inactive_and_summarises(db_session, fake_fetch):
    make_feed(db_session, title="啟用 A", url="https://example.com/a")
    make_feed(db_session, title="啟用 B", url="https://example.com/b")
    make_feed(db_session, title="停用", url="https://example.com/c", is_active=False)
    fake_fetch(RawFeed(status="ok", content=RSS_XML))

    result = refresh_all_feeds(db_session)

    assert result.total == 2
    assert result.ok == 2
    assert result.failed == 0
    assert result.created == 4
    assert db_session.query(FeedItem).count() == 4
    assert "2 個來源" in result.summary


def test_refresh_all_feeds_keeps_going_after_one_source_fails(db_session, monkeypatch):
    """一個來源壞掉不該讓同一批裡其他來源已經抓好的項目跟著消失——這正是 per-feed commit 的理由。"""
    ok_feed = make_feed(db_session, title="正常來源", url="https://example.com/ok")
    make_feed(db_session, title="壞掉的來源", url="https://example.com/bad")

    def _fake_fetch(url, *args, **kwargs):
        if url == "https://example.com/bad":
            return RawFeed(status="error", error="無法連線至來源：ConnectError")
        return RawFeed(status="ok", content=RSS_XML)

    monkeypatch.setattr(feeds_core, "fetch_feed", _fake_fetch)

    result = refresh_all_feeds(db_session)

    assert result.ok == 1
    assert result.failed == 1
    assert result.errors == ["壞掉的來源：無法連線至來源：ConnectError"]
    assert db_session.query(FeedItem).filter(FeedItem.feed_id == ok_feed.id).count() == 2


def test_admin_can_fetch_all_feeds_and_result_is_recorded(client, db_session, fake_fetch):
    admin = make_user(db_session, username="root", role="admin")
    make_feed(db_session)
    fake_fetch(RawFeed(status="ok", content=RSS_XML))

    response = client.post("/api/feeds/fetch-all", headers=auth_headers(admin))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["ok"] == 1
    assert body["created"] == 2
    assert body["errors"] == []
    assert db_session.query(AuditLog).filter(AuditLog.action == "feed.fetch_all").count() == 1

    # 手動的整批抓取同樣算「上次執行」，後台不必為它多開一組欄位。
    settings_row = get_feed_settings(db_session)
    assert settings_row.last_run_status == "ok"
    assert settings_row.last_run_at is not None


def test_non_admin_cannot_fetch_all_feeds(client, db_session):
    user = make_user(db_session)

    assert client.post("/api/feeds/fetch-all").status_code == 401
    assert client.post("/api/feeds/fetch-all", headers=auth_headers(user)).status_code == 403
