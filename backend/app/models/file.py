from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import User


class File(Base):
    __tablename__ = "files"

    id: Mapped[int] = mapped_column(primary_key=True)
    # 與其他所有指向 users.id 的 FK 不同，這裡刻意不加 ondelete=：刪除帳號不該連帶把它的上傳檔
    # （以及磁碟上的位元組）一起無聲帶走，因此只要還有檔案掛在這個擁有者底下，
    # app/api/admin.py 的 delete_user 就會以 409 拒絕。
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    folder_id: Mapped[int | None] = mapped_column(ForeignKey("folders.id"), nullable=True, index=True)
    announced_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    size: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # 純粹讓 FileResponse 取得擁有者的帳號名稱（見 app/schemas/file.py），不產生任何 DDL。
    # 因為 owner_id 是 nullable=False 且刪除帳號時會被 409 擋下，這一端永遠指得到人，
    # 不需要 audit_logs 那種「已刪除的使用者」fallback。
    owner: Mapped[User] = relationship()
