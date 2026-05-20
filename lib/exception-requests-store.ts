import fs from "node:fs/promises";
import path from "node:path";
import { getDb } from "@/lib/db/client";
import {
  allowedTransition,
  appendAudit,
  insertException,
  listExceptionsPage,
  selectAllExceptions,
  selectExceptionById,
  selectExceptionsByOrderId,
  updateExceptionWithAudit,
  type ExceptionListRow,
  type ListExceptionsParams,
} from "@/lib/db/exceptions-repository";
import { getOrder } from "@/lib/orders-store";
import type { ExceptionAuditLog, ExceptionRequestRecord, OperatorRole } from "@/lib/types";

const STORE_PATH = process.env.VERCEL ? "/tmp/.exception-requests-store.json" : path.join(process.cwd(), ".exception-requests-store.json");

function newExceptionRequestId(): string {
  const hex = () => Math.random().toString(16).slice(2, 10);
  return `exr_${hex()}${hex()}`;
}

async function readStore(): Promise<Record<string, ExceptionRequestRecord>> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(raw) as Record<string, ExceptionRequestRecord>;
  } catch {
    return {};
  }
}

async function writeStore(data: Record<string, ExceptionRequestRecord>) {
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function createExceptionRequest(
  orderId: string,
  type: ExceptionRequestRecord["type"],
  reason: string,
): Promise<ExceptionRequestRecord> {
  const now = new Date().toISOString();
  const record: ExceptionRequestRecord = {
    exception_request_id: newExceptionRequestId(),
    order_id: orderId,
    type,
    reason,
    status: "submitted",
    created_at: now,
    updated_at: now,
    audit_logs: [
      {
        action: "created",
        from_status: "none",
        to_status: "submitted",
        operator: "system",
        operator_role: "customer_service",
        note: "用户提交异常申请",
        at: now,
      },
    ],
  };

  const db = getDb();
  if (db) {
    await insertException(db, record);
  } else {
    const store = await readStore();
    store[record.exception_request_id] = record;
    await writeStore(store);
  }
  return record;
}

export async function listExceptionRequestsByOrder(
  orderId: string,
): Promise<ExceptionRequestRecord[]> {
  const db = getDb();
  if (db) {
    return selectExceptionsByOrderId(db, orderId);
  }
  const store = await readStore();
  return Object.values(store)
    .filter((e) => e.order_id === orderId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getExceptionRequest(
  exceptionRequestId: string,
): Promise<ExceptionRequestRecord | undefined> {
  const db = getDb();
  if (db) {
    return selectExceptionById(db, exceptionRequestId);
  }
  const store = await readStore();
  return store[exceptionRequestId];
}

export async function updateExceptionRequestStatus(
  exceptionRequestId: string,
  status: ExceptionRequestRecord["status"],
  operator: string,
  operatorRole: OperatorRole,
  note?: string,
): Promise<ExceptionRequestRecord | undefined> {
  const db = getDb();
  if (db) {
    const current = await selectExceptionById(db, exceptionRequestId);
    if (!current) return undefined;
    if (!allowedTransition(current.status, status)) {
      return current;
    }
    const next = appendAudit(current, status, operator, operatorRole, note);
    await updateExceptionWithAudit(db, exceptionRequestId, next);
    return next;
  }

  const store = await readStore();
  const current = store[exceptionRequestId];
  if (!current) return undefined;

  const canTransit =
    (current.status === "submitted" &&
      (status === "processing" || status === "approved" || status === "rejected")) ||
    (current.status === "processing" && (status === "approved" || status === "rejected"));

  if (!canTransit) {
    return current;
  }

  const actionMap: Record<ExceptionRequestRecord["status"], ExceptionAuditLog["action"]> = {
    submitted: "created",
    processing: "to_processing",
    approved: "approved",
    rejected: "rejected",
  };

  const updated: ExceptionRequestRecord = {
    ...current,
    status,
    updated_at: new Date().toISOString(),
    audit_logs: [
      ...(current.audit_logs ?? []),
      {
        action: actionMap[status],
        from_status: current.status,
        to_status: status,
        operator: operator || "unknown",
        operator_role: operatorRole,
        note,
        at: new Date().toISOString(),
      },
    ],
  };
  store[exceptionRequestId] = updated;
  await writeStore(store);
  return updated;
}

export async function listExceptionsBackoffice(
  params: ListExceptionsParams,
): Promise<{ items: ExceptionListRow[]; total: number }> {
  const db = getDb();
  if (db) {
    return listExceptionsPage(db, params);
  }

  const store = await readStore();
  let rows = Object.values(store).sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (params.pendingQueue) {
    rows = rows.filter((e) => e.status === "submitted" || e.status === "processing");
  } else if (params.status?.trim()) {
    rows = rows.filter((e) => e.status === params.status);
  }
  if (params.type?.trim()) {
    rows = rows.filter((e) => e.type === params.type);
  }

  const enriched: ExceptionListRow[] = [];
  for (const e of rows) {
    const order = await getOrder(e.order_id);
    enriched.push({ ...e, order_no: order?.order_no ?? "" });
  }

  let filtered = enriched;
  if (params.orderNo?.trim()) {
    const kw = params.orderNo.trim().toLowerCase();
    filtered = enriched.filter((x) => x.order_no.toLowerCase().includes(kw));
  }

  const total = filtered.length;
  const start = (params.page - 1) * params.pageSize;
  const items = filtered.slice(start, start + params.pageSize);
  return { items, total };
}

/** 审计 CSV 导出：拉平所有异常申请的 audit_logs */
export async function listAllExceptionRequests(): Promise<ExceptionRequestRecord[]> {
  const db = getDb();
  if (db) {
    return selectAllExceptions(db);
  }
  const store = await readStore();
  return Object.values(store).sort((a, b) => b.created_at.localeCompare(a.created_at));
}
