import { ScrollText } from "lucide-react";
import Callout from "../../components/Callout";
import EmptyState from "../../components/EmptyState";
import SectionTitle from "../../components/SectionTitle";
import { Card, CardContent } from "../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { formatDateTime } from "../../lib/format";
import TableSkeleton from "./TableSkeleton";
import { ALL_ACTIONS, AUDIT_LOG_LIMIT, type useAuditLogsAdmin } from "./useAuditLogsAdmin";

function AuditLogsTab(props: ReturnType<typeof useAuditLogsAdmin>) {
  const { auditLogs, auditLogsError, auditActionFilter, setAuditActionFilter, auditActions, filteredAuditLogs } = props;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 text-left">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionTitle>操作紀錄</SectionTitle>
          <Select value={auditActionFilter} onValueChange={(value) => value && setAuditActionFilter(value)}>
            <SelectTrigger className="w-48" aria-label="依動作類型篩選">
              <SelectValue>{(value: string) => (value === ALL_ACTIONS ? "全部動作" : value)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ACTIONS}>全部動作</SelectItem>
              {auditActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">高權限操作的稽核紀錄，僅顯示最近 {AUDIT_LOG_LIMIT} 筆。</p>
        <Callout>{auditLogsError}</Callout>
        {auditLogs === null && !auditLogsError && <TableSkeleton />}
        {filteredAuditLogs !== null && filteredAuditLogs.length === 0 && (
          <EmptyState icon={ScrollText} title={auditLogs !== null && auditLogs.length > 0 ? "沒有符合條件的操作紀錄" : "目前沒有操作紀錄"} />
        )}
        {filteredAuditLogs !== null && filteredAuditLogs.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>時間</TableHead>
                <TableHead>操作者</TableHead>
                <TableHead>動作</TableHead>
                <TableHead>對象</TableHead>
                <TableHead>詳情</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAuditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(log.created_at)}</TableCell>
                  <TableCell className="whitespace-nowrap">{log.actor_username}</TableCell>
                  <TableCell className="whitespace-nowrap">{log.action}</TableCell>
                  <TableCell>{log.target ?? "—"}</TableCell>
                  <TableCell>{log.detail ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default AuditLogsTab;
