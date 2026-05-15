import fs from "node:fs/promises";
import path from "node:path";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { crmTimelineEntries } from "@/lib/db/schema";
import type { CrmTimelineEntry } from "@/lib/integration/types";

const FILE_PATH = process.env.VERCEL ? "/tmp/.crm-timeline.json" : path.join(process.cwd(), ".crm-timeline.json");

async function readFile(): Promise<CrmTimelineEntry[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf-8");
    return JSON.parse(raw) as CrmTimelineEntry[];
  } catch {
    return [];
  }
}

async function writeFile(rows: CrmTimelineEntry[]) {
  await fs.writeFile(FILE_PATH, JSON.stringify(rows.slice(-2000), null, 2), "utf-8");
}

function newId(): string {
  return `crm_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
}

function rowToEntry(r: typeof crmTimelineEntries.$inferSelect): CrmTimelineEntry {
  return {
    id: r.id,
    order_id: r.orderId,
    order_no: r.orderNo,
    exception_request_id: r.exceptionRequestId,
    event_type: r.eventType,
    summary: r.summary,
    payload: r.payload,
    request_id: r.requestId,
    created_at: r.createdAt.toISOString(),
  };
}

export async function appendCrmTimelineEntry(input: {
  order_id: string | null;
  order_no: string;
  exception_request_id: string | null;
  event_type: string;
  summary: string;
  payload: unknown;
  request_id: string | null;
}): Promise<CrmTimelineEntry> {
  const rec: CrmTimelineEntry = {
    id: newId(),
    order_id: input.order_id,
    order_no: input.order_no,
    exception_request_id: input.exception_request_id,
    event_type: input.event_type,
    summary: input.summary,
    payload: input.payload,
    request_id: input.request_id,
    created_at: new Date().toISOString(),
  };

  const db = getDb();
  if (db) {
    await db.insert(crmTimelineEntries).values({
      id: rec.id,
      orderId: rec.order_id,
      orderNo: rec.order_no,
      exceptionRequestId: rec.exception_request_id,
      eventType: rec.event_type,
      summary: rec.summary,
      payload: rec.payload as object | null,
      requestId: rec.request_id,
      createdAt: new Date(rec.created_at),
    });
    return rec;
  }

  const all = await readFile();
  all.push(rec);
  await writeFile(all);
  return rec;
}

export async function listCrmTimeline(params: { order_no?: string; limit: number }): Promise<CrmTimelineEntry[]> {
  const db = getDb();
  if (db) {
    const whereClause = params.order_no?.trim()
      ? eq(crmTimelineEntries.orderNo, params.order_no.trim())
      : undefined;
    const rows = await db
      .select()
      .from(crmTimelineEntries)
      .where(whereClause)
      .orderBy(desc(crmTimelineEntries.createdAt))
      .limit(params.limit);
    return rows.map(rowToEntry);
  }
  let rows = await readFile();
  if (params.order_no?.trim()) {
    rows = rows.filter((r) => r.order_no.includes(params.order_no!.trim()));
  }
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, params.limit);
}
