from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_optional, require_admin
from app.core.audit import write_audit_log
from app.core.database import get_db
from app.core.feeds import refresh_feed
from app.models import Feed, FeedItem, Folder, User
from app.schemas.feed import (
    FeedAdminResponse,
    FeedCreate,
    FeedFetchResultResponse,
    FeedItemResponse,
    FeedResponse,
    FeedUpdate,
)

router = APIRouter()


@router.get("", response_model=list[FeedResponse])
def list_feeds(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> list[Feed]:
    """公開的訂閱來源清單。停用中的來源這裡一律看不到——它們的文章也不會出現在
    /api/feeds/items，列出來只會變成一個永遠沒有內容的篩選項。管理員要看完整清單請走
    /api/feeds/admin。"""
    del current_user  # 這份清單對所有人都一樣；帶不帶 token 的差別在 /api/feeds/admin
    return (
        db.query(Feed)
        .filter(Feed.is_public.is_(True), Feed.is_active.is_(True))
        .order_by(Feed.title.asc())
        .all()
    )


# 字面路徑必須排在任何 /{feed_id} 之前，否則 "admin" 與 "items" 會被當成 feed_id。
@router.get("/admin", response_model=list[FeedAdminResponse])
def list_feeds_for_admin(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[Feed]:
    del admin
    return db.query(Feed).order_by(Feed.title.asc()).all()


@router.get("/items", response_model=list[FeedItemResponse])
def list_feed_items(
    feed_id: int | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> list[FeedItem]:
    query = db.query(FeedItem).join(Feed, FeedItem.feed_id == Feed.id)

    # 可見度是由來源決定的，與 files／link_cards 一致：管理員看得到全部，其他人（含訪客）
    # 只看得到公開且啟用中的來源。
    if current_user is None or current_user.role != "admin":
        query = query.filter(Feed.is_public.is_(True), Feed.is_active.is_(True))

    if feed_id is not None:
        query = query.filter(FeedItem.feed_id == feed_id)

    # 有些 feed 根本不給日期，published_at 會是 NULL；用 fetched_at 決勝，讓它們排在
    # 有日期的項目之間而不是全部沉底。id 是最後的決勝條件，確保分頁時順序穩定。
    return (
        query.order_by(FeedItem.published_at.desc().nullslast(), FeedItem.fetched_at.desc(), FeedItem.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.post("", response_model=FeedAdminResponse, status_code=status.HTTP_201_CREATED)
def create_feed(
    payload: FeedCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Feed:
    if payload.folder_id is not None and db.get(Folder, payload.folder_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="所屬資料夾不存在")

    url = str(payload.url)
    if db.query(Feed).filter(Feed.url == url).first() is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="這個訂閱來源已經存在")

    feed = Feed(
        title=payload.title,
        description=payload.description,
        url=url,
        folder_id=payload.folder_id,
        is_public=payload.is_public,
        is_active=payload.is_active,
    )
    db.add(feed)
    db.flush()

    write_audit_log(db, actor_id=admin.id, action="feed.create", target=feed.title)
    db.commit()
    db.refresh(feed)
    return feed


@router.patch("/{feed_id}", response_model=FeedAdminResponse)
def update_feed(
    feed_id: int,
    payload: FeedUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Feed:
    feed = db.get(Feed, feed_id)
    if feed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="訂閱來源不存在")

    fields_set = payload.model_fields_set
    changes: list[str] = []

    if "title" in fields_set and payload.title is not None and payload.title != feed.title:
        changes.append(f"title: {feed.title} -> {payload.title}")
        feed.title = payload.title

    if "description" in fields_set and payload.description != feed.description:
        changes.append("description updated")
        feed.description = payload.description

    if "url" in fields_set and payload.url is not None and str(payload.url) != feed.url:
        if db.query(Feed).filter(Feed.url == str(payload.url), Feed.id != feed.id).first() is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="這個訂閱來源已經存在")
        changes.append("url updated")
        feed.url = str(payload.url)
        # 換了網址，上一個網址的條件式 GET 標頭就沒有意義了——留著會讓對方回一個
        # 與新內容無關的 304，看起來像是「抓過了但什麼都沒有」。
        feed.etag = None
        feed.last_modified = None

    if "folder_id" in fields_set and payload.folder_id != feed.folder_id:
        if payload.folder_id is not None and db.get(Folder, payload.folder_id) is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="所屬資料夾不存在")
        changes.append("folder_id updated")
        feed.folder_id = payload.folder_id

    if "is_public" in fields_set and payload.is_public is not None and payload.is_public != feed.is_public:
        changes.append(f"is_public -> {payload.is_public}")
        feed.is_public = payload.is_public

    if "is_active" in fields_set and payload.is_active is not None and payload.is_active != feed.is_active:
        changes.append(f"is_active -> {payload.is_active}")
        feed.is_active = payload.is_active

    if changes:
        write_audit_log(db, actor_id=admin.id, action="feed.update", target=feed.title, detail="; ".join(changes))

    db.commit()
    db.refresh(feed)
    return feed


@router.delete("/{feed_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_feed(
    feed_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> None:
    feed = db.get(Feed, feed_id)
    if feed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="訂閱來源不存在")

    write_audit_log(db, actor_id=admin.id, action="feed.delete", target=feed.title)
    # 它的 feed_items 由資料庫的 ON DELETE CASCADE 帶走，見 app/models/feed_item.py。
    db.delete(feed)
    db.commit()


@router.post("/{feed_id}/fetch", response_model=FeedFetchResultResponse)
def fetch_feed_now(
    feed_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> FeedFetchResultResponse:
    """管理員的「立即抓取」。同步執行而不是丟進 BackgroundTasks：新增一個來源之後，
    管理員需要當場知道網址對不對，而背景工作沒有任何管道把失敗原因送回畫面上。
    抓取本身有 FETCH_TIMEOUT_SECONDS 的上限，不會讓請求無限期掛著。"""
    feed = db.get(Feed, feed_id)
    if feed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="訂閱來源不存在")

    result = refresh_feed(db, feed)
    write_audit_log(
        db,
        actor_id=admin.id,
        action="feed.fetch",
        target=feed.title,
        detail=result.error or f"status: {result.status}; created: {result.created}",
    )
    db.commit()

    return FeedFetchResultResponse(
        status=result.status, created=result.created, skipped=result.skipped, error=result.error
    )
