import fs from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { integrationAlerts } from "@/lib/db/schema";
import type { IntegrationAlertLevel, IntegrationAlertRecord } from "@/lib/integration/types";

const FILE_PATH = process.env.VERCEL ? "/tmp/.integration-alerts.json" : path.join(process.cwd(), ".integration-alerts.json");
const MAX_FILE_ALERTS = 500;

type FileShape = { alerts: IntegrationAlertRecord[] };

async function readFileStore(): Promise<FileShape> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf-8");
    return JSON.parse(raw) as FileShape;
  } catch {
    return { alerts: [] };
  }
}

async function writeFileStore(data: FileShape) {
  const trimmed = { alerts: data.alerts.slice(-MAX_FILE_ALERTS) };
  await fs.writeFile(FILE_PATH, JSON.stringify(trimmed, null, 2), "utf-8");
}

function newAlertId(): string {
  return `alt_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
}

export async function recordIntegrationAlert(input: {
  level: IntegrationAlertLevel;
  code: string;
  message: string;
  requestId?: string | null;
  meta?: unknown;
}): Promise<IntegrationAlertRecord> {
  const rec: IntegrationAlertRecord = {
    id: newAlertId(),
    level: input.level,
    code: input.code,
    message: input.message,
    request_id: input.requestId ?? null,
    meta: input.meta ?? null,
    created_at: new Date().toISOString(),
  };

  const db = getDb();
  if (db) {
    await db.insert(integrationAlerts).values({
      id: rec.id,
      level: rec.level,
      code: rec.code,
      message: rec.message,
      requestId: rec.request_id,
      meta: rec.meta as object | null,
      createdAt: new Date(rec.created_at),
    });
    return rec;
  }

  const store = await readFileStore();
  store.alerts.push(rec);
  await writeFileStore(store);
  return rec;
}

export async function listIntegrationAlerts(params: {
  limit: number;
}): Promise<IntegrationAlertRecord[]> {
  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(integrationAlerts)
      .orderBy(desc(integrationAlerts.createdAt))
      .limit(params.limit);
    return rows.map((r) => ({
      id: r.id,
      level: r.level as IntegrationAlertLevel,
      code: r.code,
      message: r.message,
      request_id: r.requestId,
      meta: r.meta,
      created_at: r.createdAt.toISOString(),
    }));
  }
  const store = await readFileStore();
  return [...store.alerts].reverse().slice(0, params.limit);
}

export async function countAlertsByCodeSince(
  code: string,
  sinceMs: number,
): Promise<number> {
  const db = getDb();
  if (db) {
    const rows = await db
      .select({ n: integrationAlerts.id })
      .from(integrationAlerts)
      .where(
        and(eq(integrationAlerts.code, code), gte(integrationAlerts.createdAt, new Date(sinceMs))),
      );
    return rows.length;
  }
  const since = new Date(sinceMs).toISOString();
  const store = await readFileStore();
  return store.alerts.filter((a) => a.code === code && a.created_at >= since).length;
}
