/**
 * Stripe redirect / Webhook 回调需要稳定站点根 URL。
 * 优先 NEXT_PUBLIC_APP_URL；否则从请求头推断（反向代理需正确转发 x-forwarded-*）。
 */
export function getRequestOrigin(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (env) return env;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`.replace(/\/$/, "");
  return "http://127.0.0.1:3000";
}
