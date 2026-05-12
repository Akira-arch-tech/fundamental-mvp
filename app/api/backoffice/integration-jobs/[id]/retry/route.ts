import { NextResponse } from "next/server";
import { resetJobForManualRetry } from "@/lib/integration/jobs-store";
import { newRequestId } from "@/lib/request-id";
import { getAuthedUser } from "@/lib/server-auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "admin only", requestId },
      { status: 403, headers: { "X-Request-Id": requestId } },
    );
  }
  const { id } = await params;
  const job = await resetJobForManualRetry(id);
  if (!job) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "job not found or not retryable", requestId },
      { status: 404, headers: { "X-Request-Id": requestId } },
    );
  }
  return NextResponse.json({ job, requestId }, { headers: { "X-Request-Id": requestId } });
}
