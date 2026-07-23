from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.core.mailer import send_upload_notification_emails
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
    db.commit()

    recipient_emails = [r.email for r in recipients if r.email]
    if recipient_emails:
        background_tasks.add_task(
            send_upload_notification_emails,
            recipient_emails,
            "新檔案上傳通知",
            message,
        )
