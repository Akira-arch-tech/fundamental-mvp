import { NextResponse } from "next/server";
import { getAiGuardrailConfig, setAiGuardrailConfig } from "@/lib/ai-guardrail-store";
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
  const config = await getAiGuardrailConfig();
  return NextResponse.json({ config, requestId }, { headers: { "X-Request-Id": requestId } });
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "login required", requestId },
      { status: 401, headers: { "X-Request-Id": requestId } },
    );
  }
  let body: { brand_terms?: unknown; banned_terms?: unknown };
  try {
    body = (await req.json()) as { brand_terms?: unknown; banned_terms?: unknown };
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json body", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
  if (!Array.isArray(body.brand_terms) || !Array.isArray(body.banned_terms)) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "brand_terms and banned_terms must be arrays", requestId },
      { status: 422, headers: { "X-Request-Id": requestId } },
    );
  }
  const config = await setAiGuardrailConfig({
    brand_terms: body.brand_terms.filter((x): x is string => typeof x === "string"),
    banned_terms: body.banned_terms.filter((x): x is string => typeof x === "string"),
  });
  return NextResponse.json({ config, requestId }, { headers: { "X-Request-Id": requestId } });
}
