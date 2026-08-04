import { useEffect, useMemo, useState } from "react";
import { listAuditLogs } from "../../api/admin";
import { ApiError } from "../../api/client";
import type { AuditLogItem } from "../../api/types";

export const AUDIT_LOG_LIMIT = 50;
/** 代表「不篩選操作類型」的哨符值——Select item 的 value 不能是空字串。 */
export const ALL_ACTIONS = "__all__";

/**
 * 操作紀錄分頁背後的狀態。每個會執行高權限操作的分頁事後都會呼叫 `reload`，
 * 因此這是其他分頁都依賴的那個 hook。
 */
export function useAuditLogsAdmin() {
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[] | null>(null);
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null);
  const [auditActionFilter, setAuditActionFilter] = useState(ALL_ACTIONS);

  async function loadAuditLogs() {
    try {
      setAuditLogs(await listAuditLogs(AUDIT_LOG_LIMIT));
      setAuditLogsError(null);
    } catch (err) {
      setAuditLogsError(err instanceof ApiError ? err.message : "無法載入操作紀錄");
    }
  }

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const auditActions = useMemo(() => {
    if (!auditLogs) {
      return [];
    }
    return Array.from(new Set(auditLogs.map((log) => log.action))).sort();
  }, [auditLogs]);

  const filteredAuditLogs = useMemo(() => {
    if (!auditLogs) {
      return auditLogs;
    }
    if (auditActionFilter === ALL_ACTIONS) {
      return auditLogs;
    }
    return auditLogs.filter((log) => log.action === auditActionFilter);
  }, [auditLogs, auditActionFilter]);

  return {
    auditLogs,
    auditLogsError,
    auditActionFilter,
    setAuditActionFilter,
    auditActions,
    filteredAuditLogs,
    reload: loadAuditLogs,
  };
}
