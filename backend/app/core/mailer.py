import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(to_address: str, subject: str, body: str) -> None:
    """Best-effort SMTP send: never raises, so a background task failure can't surface
    as a crash, and one recipient's bad address/mailbox can't block the rest."""
    if not settings.smtp_host or not to_address:
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from
    message["To"] = to_address
    message.set_content(body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except (smtplib.SMTPException, OSError):
        logger.warning("Failed to send notification email to %s", to_address, exc_info=True)


def send_upload_notification_emails(recipient_emails: list[str], subject: str, body: str) -> None:
    for address in recipient_emails:
        send_email(address, subject, body)
