import { NextResponse } from "next/server";
import { getPricingTemplate, savePricingTemplate, type PricingTemplate } from "@/lib/pricing-template";
import { newRequestId } from "@/lib/request-id";
import { getAuthedUser } from "@/lib/server-auth";

export async function GET() {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }
  const template = await getPricingTemplate();
  return NextResponse.json({ ...template, requestId }, { headers: { "X-Request-Id": requestId } });
}

export async function PUT(req: Request) {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }
  try {
    const body = (await req.json()) as Partial<PricingTemplate>;
    const next = await savePricingTemplate(body);
    return NextResponse.json({ ...next, requestId }, { headers: { "X-Request-Id": requestId } });
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json body", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
}
