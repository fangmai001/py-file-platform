import Callout from "../../components/Callout";
import SectionTitle from "../../components/SectionTitle";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import type { useSmtpSettingsAdmin } from "./useSmtpSettingsAdmin";

function SmtpSettingsTab(props: ReturnType<typeof useSmtpSettingsAdmin>) {
  const { smtpSettings, smtpSettingsError, smtpDraft, setSmtpDraft, isSavingSmtpSettings, handleSaveSmtpSettings } =
    props;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 text-left">
        <SectionTitle>Email SMTP 設定</SectionTitle>
        <p className="text-sm text-muted-foreground">
          設定後，系統會透過此 SMTP 伺服器寄送重設密碼信件與上傳通知信；未啟用或未設定時，信件內容僅會寫入後端日誌。
          密碼欄位留空表示不變更目前已儲存的密碼。
        </p>
        <Callout>{smtpSettingsError}</Callout>
        <form className="flex max-w-lg flex-col gap-4" onSubmit={handleSaveSmtpSettings}>
          <div className="flex items-center gap-2">
            <Checkbox
              id="smtp-enabled"
              checked={smtpDraft.enabled}
              onCheckedChange={(checked) =>
                setSmtpDraft((draft) => ({ ...draft, enabled: checked === true }))
              }
            />
            <Label htmlFor="smtp-enabled">啟用 SMTP 寄信</Label>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="smtp-host">伺服器位址</Label>
            <Input
              id="smtp-host"
              type="text"
              placeholder="smtp.example.com"
              value={smtpDraft.host}
              onChange={(e) => setSmtpDraft((draft) => ({ ...draft, host: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="smtp-port">連接埠</Label>
            <Input
              id="smtp-port"
              type="number"
              placeholder="587"
              value={smtpDraft.port}
              onChange={(e) => setSmtpDraft((draft) => ({ ...draft, port: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="smtp-username">帳號</Label>
            <Input
              id="smtp-username"
              type="text"
              value={smtpDraft.username}
              onChange={(e) => setSmtpDraft((draft) => ({ ...draft, username: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="smtp-password">密碼</Label>
            <Input
              id="smtp-password"
              type="password"
              placeholder={smtpSettings?.password_set ? "已設定，留空表示不變更" : "尚未設定"}
              value={smtpDraft.password}
              onChange={(e) => setSmtpDraft((draft) => ({ ...draft, password: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="smtp-from-address">寄件人地址</Label>
            <Input
              id="smtp-from-address"
              type="text"
              placeholder="noreply@example.com"
              value={smtpDraft.fromAddress}
              onChange={(e) => setSmtpDraft((draft) => ({ ...draft, fromAddress: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="smtp-use-tls"
              checked={smtpDraft.useTls}
              onCheckedChange={(checked) =>
                setSmtpDraft((draft) => ({ ...draft, useTls: checked === true }))
              }
            />
            <Label htmlFor="smtp-use-tls">使用 TLS</Label>
          </div>
          <Button type="submit" className="self-start" disabled={isSavingSmtpSettings}>
            {isSavingSmtpSettings ? "儲存中…" : "儲存"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default SmtpSettingsTab;
