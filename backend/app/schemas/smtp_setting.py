from pydantic import BaseModel, ConfigDict


class SmtpSettingUpdate(BaseModel):
    enabled: bool | None = None
    host: str | None = None
    port: int | None = None
    username: str | None = None
    # Only updated when explicitly present in the request body (see model_fields_set in
    # app/api/smtp_settings.py) so omitting it keeps the currently stored password.
    password: str | None = None
    from_address: str | None = None
    use_tls: bool | None = None


class SmtpSettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    enabled: bool
    host: str | None
    port: int
    username: str | None
    # The password itself is never returned - only whether one is currently set.
    password_set: bool
    from_address: str
    use_tls: bool
