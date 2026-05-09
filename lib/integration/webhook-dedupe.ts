import fs from "node:fs/promises";
import path from "node:path";

const FILE_PATH = path.join(process.cwd(), ".erp-webhook-dedupe.json");
const MAX_IDS = 8000;

async function readIds(): Promise<string[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf-8");
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function writeIds(ids: string[]) {
  await fs.writeFile(FILE_PATH, JSON.stringify(ids.slice(-MAX_IDS), null, 2), "utf-8");
}

export async function isWebhookEventDuplicate(eventId: string | undefined): Promise<boolean> {
  if (!eventId?.trim()) return false;
  const ids = await readIds();
  return ids.includes(eventId.trim());
}

export async function markWebhookEventProcessed(eventId: string | undefined): Promise<void> {
  if (!eventId?.trim()) return;
  const id = eventId.trim();
  const ids = await readIds();
  if (ids.includes(id)) return;
  ids.push(id);
  await writeIds(ids);
}
