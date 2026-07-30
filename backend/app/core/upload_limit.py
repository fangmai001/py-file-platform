from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import SiteSetting

_SETTINGS_ROW_ID = 1

# Upper bound an admin can set the per-file limit to. nginx can't follow a DB value, so
# nginx/nginx.conf pins client_max_body_size to this same number - change both together.
MAX_UPLOAD_SIZE_MB_CEILING = 512


def get_max_upload_size_mb(db: Session) -> int:
    """Current per-file upload limit in MB, admin-editable via the site settings API.

    Deliberately a plain read (no get-or-create): this runs on every upload, and the
    seeding belongs on the admin read path, not the hot path. Falls back to the
    MAX_UPLOAD_SIZE_MB env var until the row has been seeded.
    """
    settings_row = db.get(SiteSetting, _SETTINGS_ROW_ID)
    if settings_row is None or settings_row.max_upload_size_mb is None:
        return settings.max_upload_size_mb
    return settings_row.max_upload_size_mb
