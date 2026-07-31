import Callout from "../../components/Callout";
import SectionTitle from "../../components/SectionTitle";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import type { useLdapSettingsAdmin } from "./useLdapSettingsAdmin";

function LdapSettingsTab(props: ReturnType<typeof useLdapSettingsAdmin>) {
  const { ldapSettings, ldapSettingsError, ldapDraft, setLdapDraft, isSavingLdapSettings, handleSaveLdapSettings } =
    props;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 text-left">
        <SectionTitle>LDAP 設定</SectionTitle>
        <p className="text-sm text-muted-foreground">
          設定後，使用者可用 LDAP 帳號密碼登入（本機帳號優先，找不到本機帳號時才會嘗試 LDAP 驗證）。
          密碼欄位留空表示不變更目前已儲存的密碼。
        </p>
        <Callout>{ldapSettingsError}</Callout>
        <form className="flex max-w-lg flex-col gap-4" onSubmit={handleSaveLdapSettings}>
          <div className="flex items-center gap-2">
            <Checkbox
              id="ldap-enabled"
              checked={ldapDraft.enabled}
              onCheckedChange={(checked) =>
                setLdapDraft((draft) => ({ ...draft, enabled: checked === true }))
              }
            />
            <Label htmlFor="ldap-enabled">啟用 LDAP 登入</Label>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ldap-server-uri">伺服器位址</Label>
            <Input
              id="ldap-server-uri"
              type="text"
              placeholder="ldap://ldap.example.internal"
              value={ldapDraft.serverUri}
              onChange={(e) => setLdapDraft((draft) => ({ ...draft, serverUri: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ldap-bind-dn">服務帳號 DN</Label>
            <Input
              id="ldap-bind-dn"
              type="text"
              placeholder="cn=service-account,dc=example,dc=internal"
              value={ldapDraft.bindDn}
              onChange={(e) => setLdapDraft((draft) => ({ ...draft, bindDn: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ldap-bind-password">服務帳號密碼</Label>
            <Input
              id="ldap-bind-password"
              type="password"
              placeholder={ldapSettings?.bind_password_set ? "已設定，留空表示不變更" : "尚未設定"}
              value={ldapDraft.bindPassword}
              onChange={(e) => setLdapDraft((draft) => ({ ...draft, bindPassword: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ldap-base-dn">搜尋起始 DN</Label>
            <Input
              id="ldap-base-dn"
              type="text"
              placeholder="ou=people,dc=example,dc=internal"
              value={ldapDraft.baseDn}
              onChange={(e) => setLdapDraft((draft) => ({ ...draft, baseDn: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ldap-user-search-filter">使用者搜尋條件</Label>
            <Input
              id="ldap-user-search-filter"
              type="text"
              placeholder="(uid={username})"
              value={ldapDraft.userSearchFilter}
              onChange={(e) => setLdapDraft((draft) => ({ ...draft, userSearchFilter: e.target.value }))}
            />
          </div>
          <Button type="submit" className="self-start" disabled={isSavingLdapSettings}>
            {isSavingLdapSettings ? "儲存中…" : "儲存"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default LdapSettingsTab;
