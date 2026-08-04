from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.core.mailer import send_upload_notification_emails
from app.core.smtp_config import get_smtp_settings, to_smtp_config
from app.models import File, Notification, User


def notify_file_uploaded(db: Session, background_tasks: BackgroundTasks, file_row: File, uploader: User) -> None:
    """把新上傳的通知廣播給其他每一位啟用中的使用者，形式是站內通知（外加盡力而為的 email）。
    私密檔案會被完全略過——它們只有擁有者與管理員看得到（見 #6），在這裡宣告等於
    向所有人洩漏它的存在。"""
    if not file_row.is_public:
        return

    recipients = db.query(User).filter(User.is_active.is_(True), User.id != uploader.id).all()
    if not recipients:
        return

    display_name = file_row.display_name or file_row.filename
    message = f"{uploader.username} 上傳了新檔案：{display_name}"

    for recipient in recipients:
        db.add(Notification(recipient_id=recipient.id, file_id=file_row.id, message=message))

    recipient_emails = [r.email for r in recipients if r.email and r.notify_by_email]
    # 在下方 commit 之前先取出，這樣 smtp_settings 資料列第一次被填入初始值時
    # （見 app/core/smtp_config.py）能與通知一起被寫進資料庫，
    # 而不是在請求結束時停留在 flush 過但未 commit 的狀態。
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
