import { localDayEndIso, localDayStartIso, todayYmdLocal } from "@/lib/backoffice-date-range";
import { listExceptionsBackoffice } from "@/lib/exception-requests-store";
import { listIntegrationAlerts } from "@/lib/integration/alerts-store";
import { listIntegrationJobs } from "@/lib/integration/jobs-store";
import { listOrdersBackoffice } from "@/lib/orders-store";

export type BackofficeSummary = {
  orders_total: number;
  orders_today: number;
  exceptions_pending: number;
  integration_pending: number;
  integration_failed: number;
  integration_dead_letter: number;
  alerts_recent_count: number;
};

/** 管理后台看板 KPI（聚合多次轻量 count 查询，仅服务端使用） */
export async function getBackofficeSummary(): Promise<BackofficeSummary> {
  const ymd = todayYmdLocal();
  const createdFrom = localDayStartIso(ymd);
  const createdTo = localDayEndIso(ymd);

  const [
    ordersAll,
    ordersToday,
    exPending,
    jPending,
    jFailed,
    jDl,
    alerts,
  ] = await Promise.all([
    listOrdersBackoffice({ page: 1, pageSize: 1 }),
    listOrdersBackoffice({ page: 1, pageSize: 1, createdFrom, createdTo }),
    listExceptionsBackoffice({ page: 1, pageSize: 1, pendingQueue: true }),
    listIntegrationJobs({ page: 1, pageSize: 1, status: "pending" }),
    listIntegrationJobs({ page: 1, pageSize: 1, status: "failed" }),
    listIntegrationJobs({ page: 1, pageSize: 1, status: "dead_letter" }),
    listIntegrationAlerts({ limit: 50 }),
  ]);

  return {
    orders_total: ordersAll.total,
    orders_today: ordersToday.total,
    exceptions_pending: exPending.total,
    integration_pending: jPending.total,
    integration_failed: jFailed.total,
    integration_dead_letter: jDl.total,
    alerts_recent_count: alerts.length,
  };
}
