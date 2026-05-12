/** PRD §8.5：服务端读取沙箱/生产密钥；勿暴露给浏览器 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}
