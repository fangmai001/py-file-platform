from pydantic import BaseModel, ConfigDict


class LdapSettingUpdate(BaseModel):
    enabled: bool | None = None
    server_uri: str | None = None
    bind_dn: str | None = None
    # 只有在 request body 中明確出現時才會更新（見 app/api/ldap_settings.py 的
    # model_fields_set），因此省略它就代表沿用目前存著的密碼。
    bind_password: str | None = None
    base_dn: str | None = None
    user_search_filter: str | None = None


class LdapSettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    enabled: bool
    server_uri: str | None
    bind_dn: str | None
    # bind 密碼本身永遠不會回傳——只回傳目前是否已設定。
    bind_password_set: bool
    base_dn: str | None
    user_search_filter: str
