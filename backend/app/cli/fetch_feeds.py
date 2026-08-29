"""定時抓取所有啟用中的訂閱來源。

    python -m app.cli.fetch_feeds

由 scripts/fetch-feeds.sh 在容器內呼叫，讓 cron 不必先取得 JWT 就能觸發抓取。管理後台的
「立即抓取」走的是另一條路（POST /api/feeds/{id}/fetch），兩者共用 app/core/feeds.py 的
refresh_feed()。
"""

import logging
import sys

from app.core.database import SessionLocal
from app.core.feeds import refresh_feed
from app.models import Feed


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    logger = logging.getLogger("fetch_feeds")

    db = SessionLocal()
    failed = 0
    try:
        feeds = db.query(Feed).filter(Feed.is_active.is_(True)).order_by(Feed.id.asc()).all()
        logger.info("開始抓取 %d 個訂閱來源", len(feeds))

        for feed in feeds:
            # 每個來源各自 commit：一個來源失敗（連不上、格式壞掉）不該讓同一批裡其他來源
            # 已經抓好的項目跟著被回滾。
            result = refresh_feed(db, feed)
            db.commit()

            if result.status == "error":
                failed += 1
                logger.error("%s（%s）抓取失敗：%s", feed.title, feed.url, result.error)
            else:
                logger.info(
                    "%s：%s，新增 %d 則、略過 %d 則", feed.title, result.status, result.created, result.skipped
                )
    finally:
        db.close()

    # 有任何來源失敗就以非零結束碼結束，讓 cron 的輸出真的能被當成警訊——與 scripts/backup.sh
    # 「大聲失敗」的取向一致。
    if failed:
        logger.error("共有 %d 個訂閱來源抓取失敗", failed)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
