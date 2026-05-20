import fs from "node:fs/promises";
import path from "node:path";
import type { WorkorderRecord } from "@/lib/types";

const STORE_PATH = process.env.VERCEL ? "/tmp/.workorders-store.json" : path.join(process.cwd(), ".workorders-store.json");

function newWorkorderId(): string {
  const hex = () => Math.random().toString(16).slice(2, 10);
  return `wo_${hex()}${hex()}`;
}

async function readStore(): Promise<Record<string, WorkorderRecord>> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(raw) as Record<string, WorkorderRecord>;
  } catch {
    return {};
  }
}

async function writeStore(data: Record<string, WorkorderRecord>) {
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function createWorkorder(orderId: string): Promise<WorkorderRecord> {
  const now = new Date();
  const slaDue = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const workorder: WorkorderRecord = {
    workorder_id: newWorkorderId(),
    order_id: orderId,
    status: "queued",
    factory_name: "FUNDAMENTAL Demo Factory",
    sla_due_at: slaDue.toISOString(),
    created_at: now.toISOString(),
  };
  const store = await readStore();
  store[workorder.workorder_id] = workorder;
  await writeStore(store);
  return workorder;
}

export async function getWorkorder(workorderId: string): Promise<WorkorderRecord | undefined> {
  const store = await readStore();
  return store[workorderId];
}

export async function listWorkordersByOrder(orderId: string): Promise<WorkorderRecord[]> {
  const store = await readStore();
  return Object.values(store).filter((w) => w.order_id === orderId);
}
