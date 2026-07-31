from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import SiteSetting

_SETTINGS_ROW_ID = 1

# Upper bound an admin can set the per-file limit to. The admin UI validates against the
# same number (MAX_UPLOAD_SIZE_MB_CEILING in
# frontend/src/pages/admin/useSiteSettingsAdmin.ts) - change both together. No reverse
# proxy caps the request body any more, so these two are the only ceiling.
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
