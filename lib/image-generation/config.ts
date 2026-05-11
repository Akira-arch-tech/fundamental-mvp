/**
 * Mock：显式 IMAGE_GENERATION_MOCK=1 | true，或未配置 DASHSCOPE_API_KEY 时走 Mock（不写密钥进仓库）。
 */
export function shouldUseMockImageGeneration(): boolean {
  const mock = process.env.IMAGE_GENERATION_MOCK?.trim().toLowerCase();
  if (mock === "1" || mock === "true" || mock === "yes") return true;
  const key = process.env.DASHSCOPE_API_KEY?.trim();
  if (!key) return true;
  return false;
}

export function getDashScopeRegion(): "intl" | "cn" {
  const r = process.env.DASHSCOPE_REGION?.trim().toLowerCase();
  return r === "cn" ? "cn" : "intl";
}

export function getDashScopeBaseUrl(): string {
  return getDashScopeRegion() === "cn"
    ? "https://dashscope.aliyuncs.com"
    : "https://dashscope-intl.aliyuncs.com";
}

export function getDashScopeT2IModel(): string {
  return process.env.DASHSCOPE_T2I_MODEL?.trim() || "qwen-image-2.0";
}

export function getDashScopeEditModel(): string {
  return process.env.DASHSCOPE_EDIT_MODEL?.trim() || "qwen-image-2.0-pro";
}

export function getMultiRefMax(): number {
  const raw = Number(process.env.DASHSCOPE_MULTI_REF_MAX);
  if (Number.isFinite(raw) && raw >= 2) return Math.min(Math.floor(raw), 6);
  return 3;
}

export function getDashScopeTimeoutMs(): number {
  const raw = Number(process.env.DASHSCOPE_TIMEOUT_MS);
  if (Number.isFinite(raw) && raw >= 5000) return Math.min(raw, 300_000);
  return 120_000;
}

export function getDemoStoreId(): string {
  return process.env.FUNDAMENTAL_DEMO_STORE_ID?.trim() || "store-demo";
}

/**
 * 轻 MVP 模式默认不做持久化，避免 Serverless 只读文件系统导致 EROFS。
 * 如需恢复持久化，可设置 IMAGE_GENERATION_PERSIST=true。
 */
export function shouldPersistGeneration(): boolean {
  const raw = process.env.IMAGE_GENERATION_PERSIST?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
