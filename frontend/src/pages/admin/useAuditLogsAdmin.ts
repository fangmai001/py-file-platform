import { useEffect, useMemo, useState } from "react";
import { listAuditLogs } from "../../api/admin";
import { ApiError } from "../../api/client";
import type { AuditLogItem } from "../../api/types";

export const AUDIT_LOG_LIMIT = 50;
/** Sentinel for "no action filter" - a Select item cannot carry an empty string as its value. */
export const ALL_ACTIONS = "__all__";

/**
 * State behind the 操作紀錄 tab. Every tab that performs a high-privilege action calls
 * `reload` afterwards, so this is the one hook the others depend on.
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
