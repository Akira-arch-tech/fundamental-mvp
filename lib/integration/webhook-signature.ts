import { createHmac, timingSafeEqual } from "node:crypto";

/** ERP 回调验签：`X-Signature: t=<unix>,v1=<hex>`，签名为 HMAC-SHA256(secret, `${t}.${rawBody}`) */
export function verifyErpWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader?.trim() || !secret) return false;
  const parts: Record<string, string> = {};
  for (const seg of signatureHeader.split(",")) {
    const [k, ...rest] = seg.split("=");
    if (!k || rest.length === 0) continue;
    parts[k.trim()] = rest.join("=").trim();
  }
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected, "utf-8"), Buffer.from(v1, "utf-8"));
  } catch {
    return false;
  }
}

/** 供验收脚本 / 联调生成合法签名 */
export function signErpWebhookBody(rawBody: string, secret: string): string {
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return `t=${t},v1=${v1}`;
}
