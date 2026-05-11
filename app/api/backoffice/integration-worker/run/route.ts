import { NextResponse } from "next/server";
import { newRequestId } from "@/lib/request-id";
import { getAuthedUser } from "@/lib/server-auth";
import { runIntegrationWorker } from "@/lib/integration/worker";

/** 已登录后台用户可触发（无需暴露 INTEGRATION_WORKER_KEY）；自动化仍可用 `/api/integrations/worker/run`。 */
export async function POST(req: Request) {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }
  const url = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 16));
  const result = await runIntegrationWorker(Number.isFinite(limit) ? limit : 16);
  return NextResponse.json({ ...result, requestId }, { headers: { "X-Request-Id": requestId } });
}
