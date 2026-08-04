import logging
import smtplib
from email.message import EmailMessage

from app.core.smtp_config import SmtpConfig

logger = logging.getLogger(__name__)


def send_email(smtp: SmtpConfig, to_address: str, subject: str, body: str) -> None:
    """以管理員設定的 SMTP 設定（見 app/core/smtp_config.py）盡力寄出：永不拋出例外，
    因此背景工作失敗不會表現成一次 crash，某位收件者的錯誤地址或信箱也擋不住其他人。

    不設定／不啟用 SMTP 是受支援的開發與測試模式，不是錯誤——它讓重設密碼與上傳通知
    在沒有真正郵件伺服器的情況下也能在本機跑過一遍；訊息會被記錄下來而不是寄出。
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
