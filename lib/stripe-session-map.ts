import fs from "node:fs/promises";
import path from "node:path";

/** checkout.session.id → order_id（幂等与 Webhook / 成功页去重） */
const MAP_PATH = path.join(process.cwd(), ".stripe-checkout-map.json");

type MapFile = Record<string, string>;

async function readMap(): Promise<MapFile> {
  try {
    const raw = await fs.readFile(MAP_PATH, "utf-8");
    return JSON.parse(raw) as MapFile;
  } catch {
    return {};
  }
}

async function writeMap(data: MapFile) {
  await fs.writeFile(MAP_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function getOrderIdForStripeSession(sessionId: string): Promise<string | undefined> {
  const map = await readMap();
  return map[sessionId];
}

export async function linkStripeSessionToOrder(sessionId: string, orderId: string): Promise<void> {
  const map = await readMap();
  map[sessionId] = orderId;
  await writeMap(map);
}
