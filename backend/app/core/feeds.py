"""RSS／Atom 訂閱來源的抓取與解析。

這一層刻意只做「取回 feed 本身並解析」這件事，不會追進每則項目的連結去抓原文：那需要對每一篇
文章各發一次請求、各站的 HTML 結構又各不相同，失敗模式與維護成本都完全是另一個量級。

所有網路錯誤都被收斂成帶訊息的結果而不往外拋，取向與 app/core/mailer.py 的 send_email() 相同——
一個掛掉的來源不該讓整批排程抓取變成一次 crash。
"""

import hashlib
import logging
from calendar import timegm
from dataclasses import dataclass, field
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

# UA 刻意寫成傳統的 `Mozilla/5.0 (compatible; ...)` 格式，而不是裸的產品名。這不是偽裝成瀏覽器——
# 產品名與版本仍然完整揭露，只是採用 Googlebot 等爬蟲共用的那個慣例格式。實務上有相當多來源站
# 擋在 WAF（例如 AWS WAF／CloudFront）後面，看到不認得的裸 UA 就直接回一個挑戰頁而不是 feed，
# 台電的來源就是這樣被擋掉的。
USER_AGENT = "Mozilla/5.0 (compatible; py-file-platform-feed-fetcher/1.0)"

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


@dataclass(frozen=True)
class BatchFetchResult:
    """一次「抓取全部啟用中來源」的結果。

    排程器、CLI 與管理員的「全部立即抓取」三個入口共用它，畫面上的「上次執行」摘要也由它產生。
    """

    total: int = 0
    ok: int = 0
    not_modified: int = 0
    failed: int = 0
    created: int = 0
    # 每個失敗的來源一則「標題：原因」，供 log 與稽核紀錄使用。刻意與 summary 分開：
    # 摘要是給畫面看的一行字，這裡則是排錯時真正需要的細節。
    errors: list[str] = field(default_factory=list)

    @property
    def summary(self) -> str:
        """給人看的一行摘要，會寫進 feed_settings.last_run_detail。"""
        return (
            f"{self.total} 個來源：成功 {self.ok}、無更新 {self.not_modified}、"
            f"失敗 {self.failed}，新增 {self.created} 則"
        )


def _truncate(value: str | None, limit: int) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value[:limit] if value else None


def fetch_feed(url: str, etag: str | None = None, last_modified: str | None = None) -> RawFeed:
    """取回 feed 的原始位元組。帶上上次的 etag／last-modified 做條件式 GET，對方沒更新時回 304，
    我們就完全不必重新解析。"""
    headers = {"User-Agent": USER_AGENT}
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

                # 2xx 不等於「拿到 feed」。擋在 WAF 後面的站台常以 202 搭配空 body 回一個挑戰，
                # 那不是錯誤碼、raise_for_status() 攔不下來，但裡面一則項目也沒有。放它過去的話
                # 整批抓取會回報「成功、新增 0 則」並把上一次的錯誤訊息清掉，管理員在後台只會看到
                # 一個永遠空白卻顯示正常的來源。
                if response.status_code != 200:
                    return RawFeed(
                        status="error",
                        error=f"來源回應 HTTP {response.status_code} 而非 200，可能被對方的防火牆攔截",
                    )

                # 串流讀取才擋得住上限：等 response.content 整份載入之後才檢查，
                # 記憶體早就已經被吃掉了。
                chunks: list[bytes] = []
                size = 0
                for chunk in response.iter_bytes():
                    size += len(chunk)
                    if size > MAX_FEED_BYTES:
                        return RawFeed(status="error", error=f"feed 超過 {MAX_FEED_BYTES} bytes 的大小上限")
                    chunks.append(chunk)

                content = b"".join(chunks)
                if not content:
                    return RawFeed(status="error", error="來源回應了空白內容")

                return RawFeed(
                    status="ok",
                    content=content,
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


def _parse(raw: bytes) -> tuple[list[ParsedEntry], str]:
    """實際的解析工作，額外回傳 feedparser 判定的格式版本（例如 "rss20"／"atom10"）。

    格式版本是「這份內容到底是不是 feed」唯一可靠的判準，見 refresh_feed() 的說明。
    """
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
    return entries, parsed.get("version") or ""


def parse_feed(raw: bytes) -> list[ParsedEntry]:
    """解析 feed 的位元組內容。feedparser 本身很寬容：格式有瑕疵時它會設 bozo 旗標但仍盡量解析，
    所以這裡不把 bozo 當成錯誤——真實世界的 feed 幾乎沒有完全合規的。"""
    entries, _ = _parse(raw)
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

    entries, version = _parse(raw.content)
    # feedparser 對任何位元組都會回傳一個結果物件，即使餵給它的是 HTML 錯誤頁或防火牆的挑戰頁
    # 也一樣——那種情況下它解析不出格式版本，version 會是空字串。少了這道檢查，一個回 200 卻塞了
    # 網頁給我們的來源會被記成「成功、新增 0 則」，與真正抓到一個當下沒有新項目的 feed 無從分辨。
    if not version:
        message = "來源回應的內容不是 RSS／Atom feed"
        feed.last_status = "error"
        feed.last_error = message
        return FeedFetchResult(status="error", error=message)

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


def refresh_all_feeds(db: Session) -> BatchFetchResult:
    """抓取所有啟用中的來源。

    與 refresh_feed() 的契約刻意不同：這個函式**會 commit，而且是每個來源各自 commit**。
    一個來源失敗（連不上、格式壞掉）不該讓同一批裡其他來源已經抓好的項目跟著被回滾，而
    per-feed 的交易邊界正是這個批次入口存在的理由。呼叫端因此不必、也不應該再包一層交易。
    """
    feeds = db.query(Feed).filter(Feed.is_active.is_(True)).order_by(Feed.id.asc()).all()

    ok = 0
    not_modified = 0
    failed = 0
    created = 0
    errors: list[str] = []

    for feed in feeds:
        result = refresh_feed(db, feed)
        db.commit()

        if result.status == "error":
            failed += 1
            errors.append(f"{feed.title}：{result.error}")
        elif result.status == "not_modified":
            not_modified += 1
        else:
            ok += 1
            created += result.created

    return BatchFetchResult(
        total=len(feeds),
        ok=ok,
        not_modified=not_modified,
        failed=failed,
        created=created,
        errors=errors,
    )
