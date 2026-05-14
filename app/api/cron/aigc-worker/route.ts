import { NextResponse } from "next/server";
import { runAigcWorkerBatch } from "@/lib/aigc-job-service";
import { newRequestId } from "@/lib/request-id";

export const dynamic = "force-dynamic";

/** Cron / 手动：处理 queued 的 AIGC 任务（多实例下依赖 DB + 本端点） */
export async function GET(req: Request) {
  const requestId = newRequestId();
  const cronSecret = process.env.CRON_SECRET?.trim();
  const workerKey = process.env.INTEGRATION_WORKER_KEY?.trim();
  const auth = req.headers.get("authorization");
  const bearerToken = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const validTokens = [cronSecret, workerKey].filter(Boolean);
  if (validTokens.length > 0 && !validTokens.includes(bearerToken ?? "")) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "invalid cron token", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }
  const result = await runAigcWorkerBatch(25);
  return NextResponse.json({ ok: true, ...result, requestId }, { headers: { "X-Request-Id": requestId } });
}
