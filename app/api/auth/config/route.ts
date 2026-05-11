import { NextResponse } from "next/server";
import { newRequestId } from "@/lib/request-id";
import { isDatabaseEnabled } from "@/lib/runtime";

export async function GET() {
  const requestId = newRequestId();
  return NextResponse.json(
    {
      auth_mode: isDatabaseEnabled() ? "database" : "mock",
      requestId,
    },
    { headers: { "X-Request-Id": requestId } },
  );
}
