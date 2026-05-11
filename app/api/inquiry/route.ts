import { NextResponse } from "next/server";
import { newRequestId } from "@/lib/request-id";

type InquiryBody = {
  name?: string;
  email?: string;
  company?: string;
  product_type?: string;
  quantity?: string;
  desired_date?: string;
  message?: string;
  locale?: string;
  source?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    const body = (await req.json()) as InquiryBody;
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "お名前・メール・ご用件は必須です。",
          requestId,
        },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "メールアドレスの形式をご確認ください。",
          requestId,
        },
        { status: 422, headers: { "X-Request-Id": requestId } },
      );
    }

    const payload = {
      requestId,
      receivedAt: new Date().toISOString(),
      name,
      email,
      company: String(body.company ?? "").trim() || undefined,
      product_type: String(body.product_type ?? "").trim() || undefined,
      quantity: String(body.quantity ?? "").trim() || undefined,
      desired_date: String(body.desired_date ?? "").trim() || undefined,
      message,
      locale: String(body.locale ?? "").trim() || undefined,
      source: String(body.source ?? "").trim() || "fundamental-inquiry",
    };

    /** Zapier / Make / 自社 HTTP 受け口。JSON ボディでそのまま転送（Slack の raw URL は形式が異なるため要プロキシ） */
    const webhookUrl = process.env.INQUIRY_WEBHOOK_URL;
    if (webhookUrl) {
      const whRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!whRes.ok) {
        return NextResponse.json(
          {
            code: "WEBHOOK_FAILED",
            message: "送信を受け付けられませんでした。しばらくしてから再度お試しください。",
            requestId,
          },
          { status: 502, headers: { "X-Request-Id": requestId } },
        );
      }
    } else {
      // Webhook 未設定時はサーバーログに残す（Vercel の Function logs 等で手動回収可能）
      console.info("[inquiry]", JSON.stringify(payload));
    }

    return NextResponse.json(
      { ok: true, requestId },
      { headers: { "X-Request-Id": requestId } },
    );
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "invalid json body", requestId },
      { status: 400, headers: { "X-Request-Id": requestId } },
    );
  }
}
