import { NextResponse } from "next/server";
import { newRequestId } from "@/lib/request-id";
import { getAuthedUser } from "@/lib/server-auth";

export async function GET() {
  const requestId = newRequestId();
  const session = await getAuthedUser();
  if (!session) {
    return NextResponse.json(
      { authenticated: false, requestId },
      { headers: { "X-Request-Id": requestId } },
    );
  }
  return NextResponse.json(
    { authenticated: true, ...session, requestId },
    { headers: { "X-Request-Id": requestId } },
  );
}
