"""定時抓取所有啟用中的訂閱來源。

    python -m app.cli.fetch_feeds

由 scripts/fetch-feeds.sh 在容器內呼叫，讓 cron 不必先取得 JWT 就能觸發抓取。

自從排程搬進應用程式內部（見 app/core/feed_scheduler.py）之後，這條路徑不再是定時抓取的
主要方式，而是保留給手動觸發與排錯——它會把每個來源的結果印出來，且結束碼直接反映成敗，
在沒有瀏覽器的離線主機上比後台好用。管理後台的「立即抓取」與「全部立即抓取」走 HTTP API，
三個入口共用 app/core/feeds.py 的 refresh_all_feeds()。
"""

import logging
import sys

from app.core.database import SessionLocal
from app.core.feed_schedule import record_run_result
from app.core.feeds import refresh_all_feeds


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    logger = logging.getLogger("fetch_feeds")

    db = SessionLocal()
    try:
        result = refresh_all_feeds(db)
        # 手動跑的這一批同樣算「上次執行」，後台才不會在有人剛用 CLI 抓過之後還顯示舊資料。
        record_run_result(db, result)
        db.commit()
    finally:
        db.close()

    logger.info("抓取完成：%s", result.summary)
    for message in result.errors:
        logger.error("抓取失敗：%s", message)

    # 有任何來源失敗就以非零結束碼結束，讓 cron 的輸出真的能被當成警訊——與 scripts/backup.sh
    # 「大聲失敗」的取向一致。
    if result.failed:
        logger.error("共有 %d 個訂閱來源抓取失敗", result.failed)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
