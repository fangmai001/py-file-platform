from pydantic import BaseModel, ConfigDict


class LdapSettingUpdate(BaseModel):
    enabled: bool | None = None
    server_uri: str | None = None
    bind_dn: str | None = None
    # Only updated when explicitly present in the request body (see model_fields_set in
    # app/api/ldap_settings.py) so omitting it keeps the currently stored password.
    bind_password: str | None = None
    base_dn: str | None = None
    user_search_filter: str | None = None


class LdapSettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    enabled: bool
    server_uri: str | None
    bind_dn: str | None
    # The bind password itself is never returned - only whether one is currently set.
    bind_password_set: bool
    base_dn: str | None
    user_search_filter: str
