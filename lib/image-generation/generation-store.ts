import fs from "node:fs/promises";
import path from "node:path";
import { getDb } from "@/lib/db/client";
import {
  insertGenerationRecord,
  listGenerationRecords,
  selectGenerationById,
  updateGenerationRecord,
} from "@/lib/db/generations-repository";
import type { GenerationRecord } from "@/lib/image-generation/types";

const FILE = path.join(process.cwd(), ".fdm-generations.json");

type FileShape = { items: GenerationRecord[] };

async function readAll(): Promise<GenerationRecord[]> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    const data = JSON.parse(raw) as FileShape;
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

async function writeAll(items: GenerationRecord[]) {
  const payload: FileShape = { items };
  await fs.writeFile(FILE, JSON.stringify(payload, null, 2), "utf-8");
}

export async function insertGeneration(rec: GenerationRecord): Promise<void> {
  const db = getDb();
  if (db) {
    await insertGenerationRecord(db, rec);
    return;
  }
  const items = await readAll();
  items.unshift(rec);
  await writeAll(items.slice(0, 500));
}

export async function updateGeneration(
  generationId: string,
  patch: Partial<Pick<GenerationRecord, "status" | "outputs" | "error_code" | "message" | "provider_request_id" | "updated_at">>,
): Promise<GenerationRecord | null> {
  const db = getDb();
  if (db) {
    return updateGenerationRecord(db, generationId, patch);
  }
  const items = await readAll();
  const idx = items.findIndex((x) => x.generation_id === generationId);
  if (idx < 0) return null;
  const next = { ...items[idx], ...patch, updated_at: new Date().toISOString() };
  items[idx] = next;
  await writeAll(items);
  return next;
}

export async function getGeneration(generationId: string): Promise<GenerationRecord | null> {
  const db = getDb();
  if (db) {
    return selectGenerationById(db, generationId);
  }
  const items = await readAll();
  return items.find((x) => x.generation_id === generationId) ?? null;
}

export async function listGenerations(limit: number): Promise<GenerationRecord[]> {
  const db = getDb();
  if (db) {
    return listGenerationRecords(db, limit);
  }
  const items = await readAll();
  return items.slice(0, Math.min(Math.max(limit, 1), 100));
}
