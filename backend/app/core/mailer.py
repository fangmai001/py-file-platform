import logging
import smtplib
from email.message import EmailMessage

from app.core.smtp_config import SmtpConfig

logger = logging.getLogger(__name__)


def send_email(smtp: SmtpConfig, to_address: str, subject: str, body: str) -> None:
    """Best-effort SMTP send using the admin-configured SMTP settings (see
    app/core/smtp_config.py): never raises, so a background task failure can't surface
    as a crash, and one recipient's bad address/mailbox can't block the rest.

    Not configuring/enabling SMTP is a supported dev/test mode, not an error - it lets
    password reset and upload notifications be exercised locally without a real mail
    server; the message is logged instead of sent.
    """
    if not smtp.enabled or not smtp.host or not to_address:
        logger.info("SMTP not configured/enabled; would send email to %s: %s\n%s", to_address, subject, body)
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = smtp.from_address
    message["To"] = to_address
    message.set_content(body)

    try:
        with smtplib.SMTP(smtp.host, smtp.port, timeout=10) as connection:
            if smtp.use_tls:
                connection.starttls()
            if smtp.username and smtp.password:
                connection.login(smtp.username, smtp.password)
            connection.send_message(message)
    except (smtplib.SMTPException, OSError):
        logger.warning("Failed to send email to %s", to_address, exc_info=True)


def send_upload_notification_emails(smtp: SmtpConfig, recipient_emails: list[str], subject: str, body: str) -> None:
    for address in recipient_emails:
        send_email(smtp, address, subject, body)
