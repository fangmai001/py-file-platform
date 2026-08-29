"""RSS／Atom 訂閱來源的抓取與解析。

這一層刻意只做「取回 feed 本身並解析」這件事，不會追進每則項目的連結去抓原文：那需要對每一篇
文章各發一次請求、各站的 HTML 結構又各不相同，失敗模式與維護成本都完全是另一個量級。

所有網路錯誤都被收斂成帶訊息的結果而不往外拋，取向與 app/core/mailer.py 的 send_email() 相同——
一個掛掉的來源不該讓整批排程抓取變成一次 crash。
"""

import hashlib
import logging
from calendar import timegm
from dataclasses import dataclass
from datetime import UTC, datetime

import feedparser
import httpx
from sqlalchemy.orm import Session

from app.models import Feed, FeedItem

logger = logging.getLogger(__name__)

FETCH_TIMEOUT_SECONDS = 10
# 5 MB。正常的 feed 遠小於這個數字，這道上限是用來擋下設定錯誤的網址（例如指到一個大檔），
# 避免一次抓取把記憶體吃光。
MAX_FEED_BYTES = 5 * 1024 * 1024
# 單次抓取最多寫入的項目數。第一次訂閱一個歷史悠久的來源時，它可能一口氣吐出上千則。
MAX_ITEMS_PER_FETCH = 100
# 對方回 301／302 導向另一個網址是常態（例如 http → https），但不該無限跟下去。
MAX_REDIRECTS = 5

# 欄位長度以資料庫的定義為準，超過就截斷——與其讓一則標題過長的項目害整批寫入失敗，
# 不如存進截斷後的版本。
_MAX_TITLE_LEN = 512
_MAX_GUID_LEN = 512
_MAX_LINK_LEN = 2048
_MAX_AUTHOR_LEN = 255


@dataclass(frozen=True)
class RawFeed:
    """一次 HTTP 抓取的結果。三種狀態互斥：拿到內容、對方回 304、以及失敗。"""

    status: str  # "ok" / "not_modified" / "error"
    content: bytes | None = None
    etag: str | None = None
    last_modified: str | None = None
    error: str | None = None


@dataclass(frozen=True)
class ParsedEntry:
    """把 RSS 2.0／Atom／RDF 的欄位差異抹平之後的單一則項目。"""

    guid: str
    title: str
    link: str | None
    author: str | None
    summary: str | None
    published_at: datetime | None


@dataclass(frozen=True)
class FeedFetchResult:
    """一次 refresh_feed() 的結果，同時是 API 回應與 CLI log 的資料來源。"""

    status: str  # "ok" / "not_modified" / "error"
    created: int = 0
    skipped: int = 0
    error: str | None = None


def _truncate(value: str | None, limit: int) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value[:limit] if value else None


def fetch_feed(url: str, etag: str | None = None, last_modified: str | None = None) -> RawFeed:
    """取回 feed 的原始位元組。帶上上次的 etag／last-modified 做條件式 GET，對方沒更新時回 304，
    我們就完全不必重新解析。"""
    headers = {"User-Agent": "py-file-platform-feed-fetcher"}
    if etag:
        headers["If-None-Match"] = etag
    if last_modified:
        headers["If-Modified-Since"] = last_modified

    try:
        with httpx.Client(
            timeout=FETCH_TIMEOUT_SECONDS,
            follow_redirects=True,
            max_redirects=MAX_REDIRECTS,
            headers=headers,
        ) as http_client:
            with http_client.stream("GET", url) as response:
                if response.status_code == 304:
                    return RawFeed(status="not_modified")
                response.raise_for_status()

                # 串流讀取才擋得住上限：等 response.content 整份載入之後才檢查，
                # 記憶體早就已經被吃掉了。
                chunks: list[bytes] = []
                size = 0
                for chunk in response.iter_bytes():
                    size += len(chunk)
                    if size > MAX_FEED_BYTES:
                        return RawFeed(status="error", error=f"feed 超過 {MAX_FEED_BYTES} bytes 的大小上限")
                    chunks.append(chunk)

                return RawFeed(
                    status="ok",
                    content=b"".join(chunks),
                    etag=_truncate(response.headers.get("ETag"), 255),
                    last_modified=_truncate(response.headers.get("Last-Modified"), 255),
                )
    except httpx.HTTPStatusError as exc:
        return RawFeed(status="error", error=f"HTTP {exc.response.status_code}")
    except httpx.HTTPError as exc:
        return RawFeed(status="error", error=f"無法連線至來源：{exc.__class__.__name__}")


def _to_datetime(struct_time) -> datetime | None:
    """feedparser 給的是 UTC 的 time.struct_time；轉成帶時區的 datetime 以對上
    DateTime(timezone=True) 欄位。"""
    if struct_time is None:
        return None
    try:
        return datetime.fromtimestamp(timegm(struct_time), tz=UTC)
    except (TypeError, ValueError, OverflowError):
        return None


def _entry_guid(entry, title: str, published_at: datetime | None) -> str:
    """去重用的鍵。多數 feed 有 <guid>／<id>，沒有的話退回連結；連兩者都沒有的（確實存在）
    就以標題加時間湊一個穩定的雜湊，才不會每抓一次就重複新增同一則。"""
    for candidate in (entry.get("id"), entry.get("link")):
        if candidate:
            return str(candidate)[:_MAX_GUID_LEN]
    seed = f"{title}|{published_at.isoformat() if published_at else ''}"
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()


def parse_feed(raw: bytes) -> list[ParsedEntry]:
    """解析 feed 的位元組內容。feedparser 本身很寬容：格式有瑕疵時它會設 bozo 旗標但仍盡量解析，
    所以這裡不把 bozo 當成錯誤——真實世界的 feed 幾乎沒有完全合規的。"""
    parsed = feedparser.parse(raw)

    entries: list[ParsedEntry] = []
    for entry in parsed.entries[:MAX_ITEMS_PER_FETCH]:
        title = _truncate(entry.get("title"), _MAX_TITLE_LEN) or "（無標題）"
        published_at = _to_datetime(entry.get("published_parsed")) or _to_datetime(entry.get("updated_parsed"))
        entries.append(
            ParsedEntry(
                guid=_entry_guid(entry, title, published_at),
                title=title,
                link=_truncate(entry.get("link"), _MAX_LINK_LEN),
                author=_truncate(entry.get("author"), _MAX_AUTHOR_LEN),
                summary=entry.get("summary") or None,
                published_at=published_at,
            )
        )
    return entries


def refresh_feed(db: Session, feed: Feed) -> FeedFetchResult:
    """抓取單一來源並把沒見過的項目寫進資料庫，同時更新該來源的抓取狀態。

    刻意不 commit：交易邊界留給呼叫端決定（API 端點一次一個來源，CLI 則是每個來源各自 commit，
    好讓其中一個壞掉不影響其他來源），與 app/core/notifications.py 的分工一致。
    """
    raw = fetch_feed(feed.url, feed.etag, feed.last_modified)
    feed.last_fetched_at = datetime.now(tz=UTC)
    feed.last_status = raw.status

    if raw.status == "not_modified":
        feed.last_error = None
        return FeedFetchResult(status="not_modified")

    if raw.status == "error" or raw.content is None:
        feed.last_error = raw.error
        return FeedFetchResult(status="error", error=raw.error)

    entries = parse_feed(raw.content)
    # 一次撈出既有的 guid，而不是每則項目各查一次；同時也讓「新增幾則、略過幾則」算得出來。
    known_guids = {row[0] for row in db.query(FeedItem.guid).filter(FeedItem.feed_id == feed.id).all()}

    created = 0
    skipped = 0
    for entry in entries:
        if entry.guid in known_guids:
            skipped += 1
            continue
        known_guids.add(entry.guid)
        db.add(
            FeedItem(
                feed_id=feed.id,
                guid=entry.guid,
                title=entry.title,
                link=entry.link,
                author=entry.author,
                summary=entry.summary,
                published_at=entry.published_at,
            )
        )
        created += 1

    feed.etag = raw.etag
    feed.last_modified = raw.last_modified
    feed.last_error = None
    return FeedFetchResult(status="ok", created=created, skipped=skipped)
