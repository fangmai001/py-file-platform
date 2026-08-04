from pydantic import BaseModel, ConfigDict


class SmtpSettingUpdate(BaseModel):
    enabled: bool | None = None
    host: str | None = None
    port: int | None = None
    username: str | None = None
    # 只有在 request body 中明確出現時才會更新（見 app/api/smtp_settings.py 的
    # model_fields_set），因此省略它就代表沿用目前存著的密碼。
    password: str | None = None
    from_address: str | None = None
    use_tls: bool | None = None


class SmtpSettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    enabled: bool
    host: str | None
    port: int
    username: str | None
    # 密碼本身永遠不會回傳——只回傳目前是否已設定。
    password_set: bool
    from_address: str
    use_tls: bool
