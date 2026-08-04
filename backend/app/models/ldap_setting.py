from sqlalchemy import Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LdapSetting(Base):
    """單列的資料表（id 永遠是 1），存放管理員可編輯的 LDAP 驗證設定。

    第一次被讀取時以 LDAP_* 環境變數填入初始值（見 app/core/ldap_config.py），
    讓既有那些靠 .env 設定的部署維持運作，直到管理員透過管理後台 UI 修改這些值為止。
    """

    __tablename__ = "ldap_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    server_uri: Mapped[str | None] = mapped_column(Text, nullable=True)
    bind_dn: Mapped[str | None] = mapped_column(Text, nullable=True)
    bind_password: Mapped[str | None] = mapped_column(Text, nullable=True)
    base_dn: Mapped[str | None] = mapped_column(Text, nullable=True)
    # {username} 會被代換成登入用的 username（已做 filter escape）。
    user_search_filter: Mapped[str] = mapped_column(Text, nullable=False, default="(uid={username})")
