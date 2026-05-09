import { and, count, desc, eq, ilike, inArray } from "drizzle-orm";
import type { DrizzleDb } from "@/lib/db/client";
import { exceptionRequests, orders } from "@/lib/db/schema";
import type { ExceptionAuditLog, ExceptionRequestRecord, OperatorRole } from "@/lib/types";

function rowToException(row: typeof exceptionRequests.$inferSelect): ExceptionRequestRecord {
  return {
    exception_request_id: row.exceptionRequestId,
    order_id: row.orderId,
    type: row.type as ExceptionRequestRecord["type"],
    reason: row.reason,
    status: row.status as ExceptionRequestRecord["status"],
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    audit_logs: row.auditLogs ?? [],
  };
}

export async function insertException(
  db: DrizzleDb,
  record: ExceptionRequestRecord,
): Promise<void> {
  await db.insert(exceptionRequests).values({
    exceptionRequestId: record.exception_request_id,
    orderId: record.order_id,
    type: record.type,
    reason: record.reason,
    status: record.status,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
    auditLogs: record.audit_logs ?? [],
  });
}

export async function selectExceptionById(
  db: DrizzleDb,
  id: string,
): Promise<ExceptionRequestRecord | undefined> {
  const [row] = await db
    .select()
    .from(exceptionRequests)
    .where(eq(exceptionRequests.exceptionRequestId, id))
    .limit(1);
  return row ? rowToException(row) : undefined;
}

export async function selectExceptionsByOrderId(
  db: DrizzleDb,
  orderId: string,
): Promise<ExceptionRequestRecord[]> {
  const rows = await db
    .select()
    .from(exceptionRequests)
    .where(eq(exceptionRequests.orderId, orderId))
    .orderBy(desc(exceptionRequests.createdAt));
  return rows.map(rowToException);
}

export async function selectAllExceptions(db: DrizzleDb): Promise<ExceptionRequestRecord[]> {
  const rows = await db.select().from(exceptionRequests).orderBy(desc(exceptionRequests.createdAt));
  return rows.map(rowToException);
}

export async function updateExceptionWithAudit(
  db: DrizzleDb,
  exceptionRequestId: string,
  next: ExceptionRequestRecord,
): Promise<void> {
  await db
    .update(exceptionRequests)
    .set({
      status: next.status,
      updatedAt: new Date(next.updated_at),
      auditLogs: next.audit_logs ?? [],
    })
    .where(eq(exceptionRequests.exceptionRequestId, exceptionRequestId));
}

export type ListExceptionsParams = {
  page: number;
  pageSize: number;
  /** 为 true 时筛选 submitted + processing，忽略单值 status */
  pendingQueue?: boolean;
  status?: string;
  type?: string;
  orderNo?: string;
};

export type ExceptionListRow = ExceptionRequestRecord & { order_no: string };

export async function listExceptionsPage(
  db: DrizzleDb,
  params: ListExceptionsParams,
): Promise<{ items: ExceptionListRow[]; total: number }> {
  const offset = (params.page - 1) * params.pageSize;
  const conditions = [];
  if (params.pendingQueue) {
    conditions.push(inArray(exceptionRequests.status, ["submitted", "processing"]));
  } else if (params.status?.trim()) {
    conditions.push(eq(exceptionRequests.status, params.status.trim()));
  }
  if (params.type?.trim()) {
    conditions.push(eq(exceptionRequests.type, params.type.trim()));
  }
  if (params.orderNo?.trim()) {
    const kw = `%${params.orderNo.trim()}%`;
    conditions.push(ilike(orders.orderNo, kw));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({
      ex: exceptionRequests,
      orderNo: orders.orderNo,
    })
    .from(exceptionRequests)
    .innerJoin(orders, eq(exceptionRequests.orderId, orders.orderId))
    .where(where)
    .orderBy(desc(exceptionRequests.createdAt))
    .limit(params.pageSize)
    .offset(offset);

  const [cnt] = await db
    .select({ n: count() })
    .from(exceptionRequests)
    .innerJoin(orders, eq(exceptionRequests.orderId, orders.orderId))
    .where(where);

  const items: ExceptionListRow[] = rows.map((r) => ({
    ...rowToException(r.ex),
    order_no: r.orderNo,
  }));
  return { items, total: cnt?.n ?? 0 };
}

export function allowedTransition(
  current: ExceptionRequestRecord["status"],
  target: ExceptionRequestRecord["status"],
): boolean {
  return (
    (current === "submitted" &&
      (target === "processing" || target === "approved" || target === "rejected")) ||
    (current === "processing" && (target === "approved" || target === "rejected"))
  );
}

export function appendAudit(
  current: ExceptionRequestRecord,
  status: ExceptionRequestRecord["status"],
  operator: string,
  operatorRole: OperatorRole,
  note?: string,
): ExceptionRequestRecord {
  const actionMap: Record<ExceptionRequestRecord["status"], ExceptionAuditLog["action"]> = {
    submitted: "created",
    processing: "to_processing",
    approved: "approved",
    rejected: "rejected",
  };
  const now = new Date().toISOString();
  return {
    ...current,
    status,
    updated_at: now,
    audit_logs: [
      ...(current.audit_logs ?? []),
      {
        action: actionMap[status],
        from_status: current.status,
        to_status: status,
        operator,
        operator_role: operatorRole,
        note,
        at: now,
      },
    ],
  };
}
