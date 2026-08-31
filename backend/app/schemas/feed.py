from datetime import datetime

from pydantic import BaseModel, ConfigDict, HttpUrl


class FeedCreate(BaseModel):
    title: str
    description: str | None = None
    url: HttpUrl
    folder_id: int | None = None
    is_public: bool = True
    is_active: bool = True


class FeedUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    url: HttpUrl | None = None
    folder_id: int | None = None
    is_public: bool | None = None
    is_active: bool | None = None


class FeedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    url: str
    folder_id: int | None
    is_public: bool
    is_active: bool
    last_fetched_at: datetime | None
    last_status: str | None
    created_at: datetime


class FeedAdminResponse(FeedResponse):
    """管理員專用的版本，多出抓取失敗的原因。

    公開的 FeedResponse 刻意不揭露 last_error（它可能包含對方主機或內部網路的細節），
    與 app/api/ldap_settings.py「永不回傳 bind 密碼」是同一個考量。etag／last_modified
    純屬抓取機制的內部狀態，兩邊都不回傳。
    """

    last_error: str | None


class FeedItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    feed_id: int
    title: str
    link: str | None
    author: str | None
    summary: str | None
    published_at: datetime | None
    fetched_at: datetime


class FeedFetchResultResponse(BaseModel):
    """POST /api/feeds/{id}/fetch 的回應——這是管理員按下「立即抓取」之後唯一的回饋。"""

    status: str
    created: int
    skipped: int
    error: str | None = None


class BatchFetchResultResponse(BaseModel):
    """POST /api/feeds/fetch-all 的回應。

    errors 只給管理員看，理由與 FeedAdminResponse.last_error 相同：失敗訊息可能帶有對方主機
    或內部網路的細節。這個端點本來就僅限管理員。
    """

    total: int
    ok: int
    not_modified: int
    failed: int
    created: int
    errors: list[str]
    summary: str
