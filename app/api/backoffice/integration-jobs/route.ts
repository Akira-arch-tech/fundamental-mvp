import { NextResponse } from "next/server";
import { listIntegrationJobs } from "@/lib/integration/jobs-store";
import { newRequestId } from "@/lib/request-id";
import { getAuthedUser } from "@/lib/server-auth";
import type { IntegrationJobStatus } from "@/lib/integration/types";

function parsePositiveInt(v: string | null, fallback: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min) return fallback;
  return Math.min(n, max);
}

export async function GET(req: Request) {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }
  const url = new URL(req.url);
  const page = parsePositiveInt(url.searchParams.get("page"), 1, 1, 10_000);
  const pageSize = parsePositiveInt(url.searchParams.get("page_size"), 20, 1, 100);
  const status = url.searchParams.get("status") as IntegrationJobStatus | null;
  const valid: IntegrationJobStatus[] = [
    "pending",
    "processing",
    "success",
    "failed",
    "dead_letter",
  ];
  const st = status && valid.includes(status) ? status : undefined;
  const { items, total } = await listIntegrationJobs({ page, pageSize, status: st });
  return NextResponse.json(
    { items, page, page_size: pageSize, total, requestId },
    { headers: { "X-Request-Id": requestId } },
  );
}
