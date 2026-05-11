import { NextResponse } from "next/server";
import { newRequestId } from "@/lib/request-id";
import { runIntegrationWorker } from "@/lib/integration/worker";

function authorizeWorker(req: Request): boolean {
  const expected = process.env.INTEGRATION_WORKER_KEY?.trim();
  if (!expected) return true;
  const got = req.headers.get("x-integration-worker-key")?.trim();
  return got === expected;
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  if (!authorizeWorker(req)) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "invalid or missing X-Integration-Worker-Key", requestId },
      { status: 403, headers: { "X-Request-Id": requestId } },
    );
  }
  const url = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 12));
  const result = await runIntegrationWorker(Number.isFinite(limit) ? limit : 12);
  return NextResponse.json({ ...result, requestId }, { headers: { "X-Request-Id": requestId } });
}
