import { Resend } from "resend";
import { NextResponse } from "next/server";

const productLabels: Record<string, string> = {
  keyring: "アクリルキーホルダー",
  stand: "アクリルスタンド",
  panel: "アクリルパネル",
  badge: "缶バッジ",
  sticker: "ホログラムステッカー",
  other: "その他・カスタム",
};

const quantityLabels: Record<string, string> = {
  "1-10": "1〜10個",
  "11-50": "11〜50個",
  "51-200": "51〜200個",
  "200+": "200個以上",
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      product?: string;
      quantity?: string;
      message?: string;
    };

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const product = String(body.product ?? "").trim();
    const quantity = String(body.quantity ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!name || !email || !product || !quantity) {
      return NextResponse.json(
        { ok: false, error: "必須項目を入力してください。" },
        { status: 422 },
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    const to = process.env.CONTACT_EMAIL;

    if (!apiKey || !from || !to) {
      return NextResponse.json(
        {
          ok: false,
          error: "メール送信設定が完了していません。管理者にお問い合わせください。",
        },
        { status: 503 },
      );
    }

    const resend = new Resend(apiKey);
    const productJa = productLabels[product] ?? product;
    const quantityJa = quantityLabels[quantity] ?? quantity;

    const html = `
      <h2>FUNDAMENTAL お見積もり依頼</h2>
      <p><strong>お名前：</strong> ${escapeHtml(name)}</p>
      <p><strong>メール：</strong> ${escapeHtml(email)}</p>
      <p><strong>希望商品：</strong> ${escapeHtml(productJa)}</p>
      <p><strong>希望数量：</strong> ${escapeHtml(quantityJa)}</p>
      <p><strong>ご要望・詳細：</strong></p>
      <pre style="white-space:pre-wrap;font-family:inherit;background:#f5f5f5;padding:12px;border-radius:8px;">${escapeHtml(message || "（なし）")}</pre>
    `;

    const { error } = await resend.emails.send({
      from,
      to: [to],
      replyTo: email,
      subject: `[FUNDAMENTAL] お見積もり依頼 — ${name}`,
      html,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: "送信に失敗しました。時間をおいて再度お試しください。" },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "不正なリクエストです。" }, { status: 400 });
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
