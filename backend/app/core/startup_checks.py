import logging
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)

# Kept in sync with the Settings default it is checking for (app/core/config.py).
_FRONTEND_BASE_URL_DEV_DEFAULT = "http://localhost:5173"


def warn_if_frontend_base_url_is_dev_default() -> None:
    """Log a warning when a production image is still using the dev FRONTEND_BASE_URL.

    Password reset links are built from this value (app/api/password_reset.py), and
    production serves the frontend from the app itself - there is no :5173 there, so
    every reset email would ship a link pointing at the recipient's own machine. The
    catch is that it is invisible in dev, where 5173 is exactly right; it only surfaces
    when a real user forgets their password on a real deployment, and reaches the
    operator as "the link does nothing".

    static_dir existing is the marker for "running inside the production image" - the
    Dockerfile builds the frontend into it, and native dev has no such directory (see
    app/core/static.py, which skips the mount for the same reason).
    """
    if not Path(settings.static_dir).is_dir():
        return
    if settings.frontend_base_url != _FRONTEND_BASE_URL_DEV_DEFAULT:
        return
    logger.warning(
        "FRONTEND_BASE_URL is still the development default (%s), but this looks like a "
        "production deployment. Password reset emails will contain links nobody can open - "
        "set FRONTEND_BASE_URL in .env to the address users actually reach this site at "
        "(e.g. http://files.example.internal).",
        _FRONTEND_BASE_URL_DEV_DEFAULT,
    )
