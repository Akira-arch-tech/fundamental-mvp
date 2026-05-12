import fs from "node:fs/promises";
import path from "node:path";
import type { ShipmentEvent } from "@/lib/types";

const STORE_PATH = path.join(process.cwd(), ".shipment-events-store.json");

function newShipmentEventId(): string {
  const hex = () => Math.random().toString(16).slice(2, 10);
  return `se_${hex()}${hex()}`;
}

async function readStore(): Promise<Record<string, ShipmentEvent>> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(raw) as Record<string, ShipmentEvent>;
  } catch {
    return {};
  }
}

async function writeStore(data: Record<string, ShipmentEvent>) {
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function addShipmentEvent(
  event: Omit<ShipmentEvent, "shipment_event_id" | "occurred_at"> & {
    occurred_at?: string;
  },
): Promise<ShipmentEvent> {
  const record: ShipmentEvent = {
    shipment_event_id: newShipmentEventId(),
    occurred_at: event.occurred_at ?? new Date().toISOString(),
    ...event,
  };
  const store = await readStore();
  store[record.shipment_event_id] = record;
  await writeStore(store);
  return record;
}

export async function listShipmentEventsByOrder(orderId: string): Promise<ShipmentEvent[]> {
  const store = await readStore();
  return Object.values(store)
    .filter((e) => e.order_id === orderId)
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
}
