import { NextResponse } from "next/server";
import { runIntegrationWorker } from "@/lib/integration/worker";
import { newRequestId } from "@/lib/request-id";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron + 手动触发端点。
 * 鉴权：优先 CRON_SECRET（Vercel 自动注入），回退 INTEGRATION_WORKER_KEY。
 * vercel.json 配置每 10 分钟执行一次，确保 pending/retry 任务被拾起。
 */
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

  const result = await runIntegrationWorker(50);
  return NextResponse.json(
    { ok: true, ...result, requestId },
    { headers: { "X-Request-Id": requestId } },
  );
}
