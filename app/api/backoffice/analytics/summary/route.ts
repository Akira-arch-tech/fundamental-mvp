import { NextResponse } from "next/server";
import { newRequestId } from "@/lib/request-id";
import { getAuthedUser } from "@/lib/server-auth";
import { getBackofficeAnalyticsSummary } from "@/lib/backoffice-analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }
  const summary = await getBackofficeAnalyticsSummary();
  return NextResponse.json({ ...summary, requestId }, { headers: { "X-Request-Id": requestId } });
}
