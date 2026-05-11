import { getDashScopeBaseUrl, getDashScopeTimeoutMs } from "@/lib/image-generation/config";

const GENERATION_PATH = "/api/v1/services/aigc/multimodal-generation/generation";

export type DashScopeHttpError = {
  ok: false;
  status: number;
  code?: string;
  message: string;
  request_id?: string;
  body_text?: string;
};

export type DashScopeHttpOk = {
  ok: true;
  status: number;
  json: unknown;
};

export async function dashScopePostGeneration(body: unknown, apiKey: string): Promise<DashScopeHttpOk | DashScopeHttpError> {
  const base = getDashScopeBaseUrl();
  const url = `${base}${GENERATION_PATH}`;
  const timeoutMs = getDashScopeTimeoutMs();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const o = json as { code?: string; message?: string; request_id?: string } | null;
      return {
        ok: false,
        status: res.status,
        code: o?.code,
        message: o?.message || text.slice(0, 500) || `HTTP ${res.status}`,
        request_id: o?.request_id,
        body_text: text.slice(0, 2000),
      };
    }
    return { ok: true, status: res.status, json };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      status: 0,
      message: msg.includes("abort") ? "DASHSCOPE_TIMEOUT" : msg,
    };
  } finally {
    clearTimeout(t);
  }
}
