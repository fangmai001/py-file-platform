from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.core.mailer import send_upload_notification_emails
from app.core.smtp_config import get_smtp_settings, to_smtp_config
from app.models import File, Notification, User


def notify_file_uploaded(db: Session, background_tasks: BackgroundTasks, file_row: File, uploader: User) -> None:
    """Broadcast an in-app (+ best-effort email) notification about a new upload to
    every other active user. Private files are skipped entirely - they're only visible
    to their owner/admins (see #6), so announcing them here would leak their existence
    to everyone else."""
    if not file_row.is_public:
        return

    recipients = db.query(User).filter(User.is_active.is_(True), User.id != uploader.id).all()
    if not recipients:
        return

    display_name = file_row.display_name or file_row.filename
    message = f"{uploader.username} 上傳了新檔案：{display_name}"

    for recipient in recipients:
        db.add(Notification(recipient_id=recipient.id, file_id=file_row.id, message=message))

    recipient_emails = [r.email for r in recipients if r.email]
    # Fetched before the commit below so a first-time seed of the smtp_settings row
    # (see app/core/smtp_config.py) is persisted together with the notifications,
    # rather than left flushed-but-uncommitted at the end of the request.
    smtp_config = to_smtp_config(get_smtp_settings(db)) if recipient_emails else None
    db.commit()

    if recipient_emails:
        background_tasks.add_task(
            send_upload_notification_emails,
            smtp_config,
            recipient_emails,
            "新檔案上傳通知",
            message,
        )
