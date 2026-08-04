from sqlalchemy import Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SiteSetting(Base):
    """單列的資料表（id 永遠是 1），存放全站的品牌文字與設定。"""

    __tablename__ = "site_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    # NULL 代表「尚未設定」，此時退回 MAX_UPLOAD_SIZE_MB 環境變數；
    # 這一列會在管理員第一次讀取設定時，以該環境變數回填
    # （見 app/api/site_settings.py 的 _get_or_create_settings）。
    max_upload_size_mb: Mapped[int | None] = mapped_column(nullable=True)
    brand_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    browser_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    hero_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    hero_subtitle: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 只存檔名，絕不存路徑——品牌圖片目錄由伺服器端決定，
    # 這樣從 DB 讀出來的值就逃不出那個目錄。
    favicon_filename: Mapped[str | None] = mapped_column(Text, nullable=True)
    hero_image_filename: Mapped[str | None] = mapped_column(Text, nullable=True)
