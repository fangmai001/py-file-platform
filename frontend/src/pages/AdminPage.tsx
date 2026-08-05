import { FileText, Users } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { Card, CardContent } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import AuditLogsTab from "./admin/AuditLogsTab";
import FilesTab from "./admin/FilesTab";
import FoldersTab from "./admin/FoldersTab";
import HighlightsTab from "./admin/HighlightsTab";
import LdapSettingsTab from "./admin/LdapSettingsTab";
import LinkCardsTab from "./admin/LinkCardsTab";
import SiteSettingsTab from "./admin/SiteSettingsTab";
import SmtpSettingsTab from "./admin/SmtpSettingsTab";
import UsersTab from "./admin/UsersTab";
import { useAuditLogsAdmin } from "./admin/useAuditLogsAdmin";
import { useFilesAdmin } from "./admin/useFilesAdmin";
import { useFoldersAdmin } from "./admin/useFoldersAdmin";
import { useHighlightsAdmin } from "./admin/useHighlightsAdmin";
import { useLdapSettingsAdmin } from "./admin/useLdapSettingsAdmin";
import { useLinkCardsAdmin } from "./admin/useLinkCardsAdmin";
import { useSiteSettingsAdmin } from "./admin/useSiteSettingsAdmin";
import { useSmtpSettingsAdmin } from "./admin/useSmtpSettingsAdmin";
import { useUsersAdmin } from "./admin/useUsersAdmin";

function AdminPage() {
  // 每個分頁的狀態都放在這裡呼叫的 hook 裡，而不是分頁元件內部，原因有三：下方的統計卡片
  // 位在 <Tabs> 之外，需要使用者與檔案的總數；分頁之間彼此相依（連結卡片的 folder 選單要讀
  // folder 列表、資料異動後要刷新操作紀錄、刪除 folder 後要重新列出檔案）；而且 Radix 會把
  // 未啟用的 TabsContent unmount，狀態若放在分頁內，管理員每次切走再切回來都會弄丟尚未儲存的
  // LDAP／SMTP 編輯內容與篩選條件。
  const auditLogs = useAuditLogsAdmin();
  const files = useFilesAdmin({ reloadAuditLogs: auditLogs.reload });
  const users = useUsersAdmin({ reloadAuditLogs: auditLogs.reload });
  const linkCards = useLinkCardsAdmin({ reloadAuditLogs: auditLogs.reload });
  // 必須排在 linkCards 之後：刪掉資料夾會讓檔案與連結卡片兩邊的引用同時失效。
  const folders = useFoldersAdmin({
    reloadFiles: files.reload,
    reloadLinkCards: linkCards.reload,
    reloadAuditLogs: auditLogs.reload,
  });
  const highlights = useHighlightsAdmin({ reloadAuditLogs: auditLogs.reload });
  const siteSettings = useSiteSettingsAdmin({ reloadAuditLogs: auditLogs.reload });
  const ldapSettings = useLdapSettingsAdmin({ reloadAuditLogs: auditLogs.reload });
  const smtpSettings = useSmtpSettingsAdmin({ reloadAuditLogs: auditLogs.reload });

  return (
    <div className="page">
      <PageHeader title="管理後台" description="管理使用者帳號與所有人上傳的檔案。" />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 sm:max-w-lg">
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5">
              {users.users === null ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-3xl font-semibold text-foreground tabular-nums">
                  {users.users.length}
                </span>
              )}
              <span className="text-sm text-muted-foreground">使用者總數</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5">
              {files.totalFiles === null ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-3xl font-semibold text-foreground tabular-nums">
                  {files.totalFiles}
                </span>
              )}
              <span className="text-sm text-muted-foreground">檔案總數</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        {/* line 變體加上 flex-none：九個中文標籤硬塞進預設的帶內距凹槽會被擠扁，
            因為原本的 trigger 是 flex-1。 */}
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="users" className="h-9 flex-none px-3">
            使用者
          </TabsTrigger>
          <TabsTrigger value="folders" className="h-9 flex-none px-3">
            資料夾
          </TabsTrigger>
          <TabsTrigger value="link-cards" className="h-9 flex-none px-3">
            連結卡片
          </TabsTrigger>
          <TabsTrigger value="highlights" className="h-9 flex-none px-3">
            首頁特色
          </TabsTrigger>
          <TabsTrigger value="files" className="h-9 flex-none px-3">
            檔案
          </TabsTrigger>
          <TabsTrigger value="audit-logs" className="h-9 flex-none px-3">
            操作紀錄
          </TabsTrigger>
          <TabsTrigger value="site-settings" className="h-9 flex-none px-3">
            站台設定
          </TabsTrigger>
          <TabsTrigger value="ldap-settings" className="h-9 flex-none px-3">
            LDAP 設定
          </TabsTrigger>
          <TabsTrigger value="smtp-settings" className="h-9 flex-none px-3">
            Email SMTP 設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="flex flex-col gap-6 pt-4">
          <UsersTab {...users} />
        </TabsContent>

        <TabsContent value="folders" className="flex flex-col gap-6 pt-4">
          <FoldersTab {...folders} />
        </TabsContent>

        <TabsContent value="link-cards" className="flex flex-col gap-6 pt-4">
          <LinkCardsTab {...linkCards} folders={folders.folders} />
        </TabsContent>

        <TabsContent value="highlights" className="flex flex-col gap-6 pt-4">
          <HighlightsTab {...highlights} />
        </TabsContent>

        <TabsContent value="files" className="pt-4">
          <FilesTab {...files} />
        </TabsContent>

        <TabsContent value="audit-logs" className="pt-4">
          <AuditLogsTab {...auditLogs} />
        </TabsContent>

        <TabsContent value="site-settings" className="pt-4">
          <SiteSettingsTab {...siteSettings} />
        </TabsContent>

        <TabsContent value="ldap-settings" className="pt-4">
          <LdapSettingsTab {...ldapSettings} />
        </TabsContent>

        <TabsContent value="smtp-settings" className="pt-4">
          <SmtpSettingsTab {...smtpSettings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminPage;
