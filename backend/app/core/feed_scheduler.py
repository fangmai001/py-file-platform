"""應用程式內建的 RSS 定時抓取排程。

用來取代部署主機上的 crontab：頻率與開關存在 feed_settings 資料列，管理員在後台改完當下就生效
（見 app/api/feed_settings.py 呼叫的 request_wakeup()）。scripts/fetch-feeds.sh 與
app/cli/fetch_feeds.py 仍然保留，作為手動觸發與排錯的路徑；三個入口共用 app/core/feeds.py 的
refresh_all_feeds()，不會有第二份批次邏輯跟著漂移。

刻意不引入 APScheduler 之類的排程套件。這裡只有一個工作，而「跑完才睡」的序列迴圈天生不會重疊、
也沒有「錯過的觸發時點」需要補償——那兩件事正是排程套件的主要賣點，在這個模型下根本不存在。

正式環境的 app 是單一 container、單一 uvicorn process（根目錄 Dockerfile 沒有 --workers），
所以不需要處理多個副本同時抓取的問題。日後若真的要橫向擴充，請改以 FEED_SCHEDULER_ENABLED
只在其中一個副本啟用，而不是在這裡加分散式鎖。
"""

import asyncio
import logging
from datetime import UTC, datetime

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.feed_schedule import get_feed_settings, record_run_result
from app.core.feeds import refresh_all_feeds

logger = logging.getLogger(__name__)

# 排程停用時的輪詢間隔。管理員按下啟用時會立刻 request_wakeup()，所以這個值只影響
# 「設定被其他途徑改掉」（例如直接改資料庫）的情況，不需要更短。
_DISABLED_POLL_SECONDS = 60
# 迴圈本身發生非預期例外時的退避時間。
_ERROR_BACKOFF_SECONDS = 60

_task: asyncio.Task | None = None
_wakeup: asyncio.Event | None = None
_event_loop: asyncio.AbstractEventLoop | None = None


def request_wakeup() -> None:
    """打斷目前的等待，讓迴圈立刻重讀設定。

    管理員改了間隔或啟用了排程之後呼叫；沒有它的話，新設定要等這一輪睡完（最長可達一天）
    才會生效。

    這個函式是從 FastAPI 的 threadpool（同步端點跑在那裡）呼叫的，而 asyncio.Event.set()
    不是 thread-safe 的，因此必須繞回 event loop 執行。排程器沒在跑時是安全的 no-op。
    """
    if _event_loop is None or _wakeup is None:
        return
    _event_loop.call_soon_threadsafe(_wakeup.set)


def _run_once() -> float:
    """讀設定，啟用中就跑一整批並把摘要寫回。回傳下次醒來前要等的秒數。

    整個函式是同步的，由迴圈丟進 asyncio.to_thread() 執行——refresh_feed() 用的是同步的 httpx
    與 SQLAlchemy，直接在 event loop 裡跑會讓整個應用程式在抓取期間停止回應（每個來源最多
    FETCH_TIMEOUT_SECONDS 秒，乘上來源數量）。
    """
    db = SessionLocal()
    try:
        settings_row = get_feed_settings(db)
        if not settings_row.fetch_enabled:
            # get_feed_settings 可能剛把這一列建出來，要 commit 才不會每次醒來都重建一次。
            db.commit()
            return _DISABLED_POLL_SECONDS

        interval_seconds = settings_row.fetch_interval_minutes * 60
        result = refresh_all_feeds(db)
        record_run_result(db, result)
        db.commit()

        if result.errors:
            logger.warning("定時抓取完成，但有來源失敗：%s", "；".join(result.errors))
        else:
            logger.info("定時抓取完成：%s", result.summary)
        return interval_seconds
    finally:
        db.close()


async def _sleep(seconds: float) -> None:
    """睡指定秒數，但可被 request_wakeup() 提前打斷。"""
    if _wakeup is None:
        await asyncio.sleep(seconds)
        return
    try:
        await asyncio.wait_for(_wakeup.wait(), timeout=seconds)
    except TimeoutError:
        # 時間到，這是正常路徑而不是錯誤。
        pass
    finally:
        _wakeup.clear()


async def _loop_forever() -> None:
    while True:
        try:
            delay = await asyncio.to_thread(_run_once)
        except asyncio.CancelledError:
            # 關機。必須讓它往外傳，否則 stop() 會等不到這個 task 結束。
            raise
        except Exception:
            # 其餘一律攔下來繼續跑：資料庫短暫斷線之類的問題不該讓排程永久停擺。一次意外若
            # 終結了這個 task，之後就再也不會抓取，而且平台上沒有任何地方看得出來。
            logger.exception("定時抓取發生非預期錯誤，%d 秒後重試", _ERROR_BACKOFF_SECONDS)
            delay = _ERROR_BACKOFF_SECONDS
        await _sleep(delay)


def start() -> None:
    """啟動排程器。由 app/main.py 的 lifespan 呼叫。"""
    global _task, _wakeup, _event_loop

    if not settings.feed_scheduler_enabled:
        logger.info("內建的 RSS 抓取排程已由 FEED_SCHEDULER_ENABLED=false 關閉")
        return
    if _task is not None:
        return

    _event_loop = asyncio.get_running_loop()
    _wakeup = asyncio.Event()
    _task = _event_loop.create_task(_loop_forever(), name="feed-scheduler")
    logger.info("內建的 RSS 抓取排程已啟動")


async def stop() -> None:
    """停止排程器並等它收尾。由 app/main.py 的 lifespan 呼叫。

    若取消時剛好有一批抓取正在 to_thread 的執行緒裡跑，那個執行緒無法被中斷，關機會等到它跑完
    （每個來源最多 FETCH_TIMEOUT_SECONDS 秒）。這是可接受的：抓取本來就有時間上限，而中途強行
    砍掉執行緒會留下寫到一半的交易。
    """
    global _task, _wakeup, _event_loop

    if _task is None:
        return

    _task.cancel()
    try:
        await _task
    except asyncio.CancelledError:
        pass

    _task = None
    _wakeup = None
    _event_loop = None
