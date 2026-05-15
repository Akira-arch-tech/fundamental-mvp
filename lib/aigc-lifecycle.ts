/**
 * PRD v0.3 存储生命周期 — 演示仓挂钩点（订单发货后审计 / 扩展清理）。
 * 生产可在此对接对象存储 TTL、删除 confirmed 临时 URL 等。
 */
import fs from "node:fs/promises";
import path from "node:path";

const LOG = process.env.VERCEL ? "/tmp/.aigc-lifecycle-events.jsonl" : path.join(process.cwd(), ".aigc-lifecycle-events.jsonl");
const MAX_LINES = 500;

export type AigcLifecycleEvent = {
  at: string;
  order_id: string;
  kind: "order_shipped";
  note: string;
};

export async function recordAigcLifecycleEvent(ev: Omit<AigcLifecycleEvent, "at">): Promise<void> {
  const line = JSON.stringify({ ...ev, at: new Date().toISOString() } satisfies AigcLifecycleEvent) + "\n";
  try {
    await fs.appendFile(LOG, line, "utf-8");
    const raw = await fs.readFile(LOG, "utf-8");
    const lines = raw.split("\n").filter(Boolean);
    if (lines.length > MAX_LINES) {
      const tail = lines.slice(-MAX_LINES).join("\n") + "\n";
      await fs.writeFile(LOG, tail, "utf-8");
    }
  } catch {
    /* 演示环境无写权限时静默跳过 */
  }
}
