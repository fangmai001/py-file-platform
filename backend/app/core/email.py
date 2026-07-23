import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> None:
    """Send a plain-text email, or log it if SMTP isn't configured.

    Not configuring SMTP is a supported dev/test mode, not an error - it lets password
    reset (and future upload notifications) be exercised locally without a real mail
    server.
    """
    if not settings.smtp_host:
        logger.info("SMTP not configured; would send email to %s: %s\n%s", to, subject, body)
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from_address or settings.smtp_username or "no-reply@localhost"
    message["To"] = to
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_username and settings.smtp_password:
            server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)
