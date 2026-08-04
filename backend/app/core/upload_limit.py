from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import SiteSetting

_SETTINGS_ROW_ID = 1

# 管理員能把每檔上限設到的天花板。管理後台 UI 驗證時對照的是同一個數字
# （frontend/src/pages/admin/useSiteSettingsAdmin.ts 中的 MAX_UPLOAD_SIZE_MB_CEILING）
# ——兩處必須一起修改。現在已經沒有反向代理會限制 request body，所以這兩處就是唯一的上限。
MAX_UPLOAD_SIZE_MB_CEILING = 512


def get_max_upload_size_mb(db: Session) -> int:
    """目前每檔的上傳上限（MB），管理員可透過站台設定 API 編輯。

    刻意採用單純讀取（而非 get-or-create）：它每次上傳都會執行，填入初始值的邏輯
    應該放在管理員的讀取路徑，而不是這條熱路徑。在該資料列被填值之前，
    一律退回 MAX_UPLOAD_SIZE_MB 環境變數。
    """
    settings_row = db.get(SiteSetting, _SETTINGS_ROW_ID)
    if settings_row is None or settings_row.max_upload_size_mb is None:
        return settings.max_upload_size_mb
    return settings_row.max_upload_size_mb
