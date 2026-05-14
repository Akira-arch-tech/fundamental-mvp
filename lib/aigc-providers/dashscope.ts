/**
 * 阿里云 DashScope — Qwen Image（multimodal-generation）统一入口。
 * 文档：https://www.alibabacloud.com/help/en/model-studio/qwen-image-api
 * 密钥仅服务端；无密钥时由 getAigcModelProvider 回退 mock。
 */
import type { AigcCandidate } from "@/lib/aigc-types";
import type { AigcModelProvider, AigcProviderGenerateInput, AigcProviderResult } from "@/lib/aigc-provider-contract";

function dashBaseUrl(region: string): string {
  const r = region.trim().toLowerCase();
  if (r === "cn" || r === "beijing") {
    return "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
  }
  return "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
}

function mapSize(aspect: string | null): string {
  if (!aspect?.trim()) return "1024*1024";
  const a = aspect.trim();
  const m: Record<string, string> = {
    "1:1": "1024*1024",
    "4:3": "1024*768",
    "3:4": "768*1024",
    "16:9": "1280*720",
    "9:16": "720*1280",
  };
  return m[a] ?? "1024*1024";
}

function extractOutputImages(payload: unknown): string[] {
  const urls: string[] = [];
  const root = payload as Record<string, unknown>;
  const output = root.output as Record<string, unknown> | undefined;
  const choices = output?.choices as unknown[] | undefined;
  if (!Array.isArray(choices)) return urls;
  for (const ch of choices) {
    const c = ch as Record<string, unknown>;
    const msg = c.message as Record<string, unknown> | undefined;
    const content = msg?.content as unknown[] | undefined;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const p = part as Record<string, unknown>;
      if (typeof p.image === "string" && p.image.startsWith("http")) urls.push(p.image);
      if (typeof p.image === "string" && p.image.startsWith("data:")) urls.push(p.image);
    }
  }
  return urls;
}

function parseSeed(seed: string | null): number | undefined {
  if (!seed?.trim()) return undefined;
  const n = Number.parseInt(seed.trim(), 10);
  return Number.isFinite(n) ? n : undefined;
}

export class DashScopeAigcModelProvider implements AigcModelProvider {
  constructor(
    private readonly apiKey: string,
    private readonly region: string,
    private readonly t2iModel: string,
    private readonly editModel: string,
    private readonly multiRefMax: number,
    private readonly timeoutMs: number,
  ) {}

  async generate(input: AigcProviderGenerateInput): Promise<AigcProviderResult> {
    const warnings: string[] = [];
    const url = dashBaseUrl(this.region);
    const n = Math.min(4, Math.max(1, Math.floor(input.candidate_count)));
    const size = mapSize(input.aspect_ratio);
    const timeoutMs = Math.min(300_000, Math.max(30_000, this.timeoutMs));

    let model = this.t2iModel;
    let body: Record<string, unknown>;

    if (input.mode === "txt2img") {
      if (!input.prompt?.trim()) throw new Error("dashscope: prompt required for txt2img");
      body = {
        model,
        input: {
          messages: [
            {
              role: "user",
              content: [{ text: input.prompt.trim() }],
            },
          ],
        },
        parameters: {
          negative_prompt: input.negative_prompt?.trim() || undefined,
          size,
          n,
          seed: parseSeed(input.seed),
          watermark: false,
        },
      };
    } else if (input.mode === "img2img" || input.mode === "multi_ref") {
      model = this.editModel;
      const refs = input.reference_data_urls;
      if (refs.length === 0) throw new Error("dashscope: reference images required for edit");
      let maxRefs = input.mode === "multi_ref" ? this.multiRefMax : 1;
      if (input.mode === "img2img" && refs.length > 1) {
        warnings.push("dashscope: img2img uses first reference only; use multi_ref for multiple images.");
        maxRefs = 1;
      }
      const slice = refs.slice(0, maxRefs);
      const content: Array<Record<string, string>> = [];
      for (const u of slice) {
        content.push({ image: u });
      }
      const promptText = input.prompt?.trim() || "Refine the image according to the references.";
      content.push({ text: promptText });
      body = {
        model,
        input: {
          messages: [{ role: "user", content }],
        },
        parameters: {
          negative_prompt: input.negative_prompt?.trim() || undefined,
          n,
          size,
          seed: parseSeed(input.seed),
          watermark: false,
        },
      };
    } else {
      throw new Error(`dashscope: unsupported mode ${input.mode}`);
    }

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const rawText = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      throw new Error(`dashscope: non-JSON response (${res.status})`);
    }

    if (!res.ok) {
      const j = json as Record<string, unknown>;
      const msg =
        (j.message as string) ||
        (j.error as { message?: string } | undefined)?.message ||
        rawText.slice(0, 400);
      throw new Error(`dashscope: HTTP ${res.status} — ${msg}`);
    }

    const j = json as Record<string, unknown>;
    const requestId = (j.request_id as string) || (j.requestId as string) || `ds_${Date.now().toString(36)}`;
    const imgs = extractOutputImages(json);
    if (imgs.length === 0) {
      throw new Error("dashscope: no image URLs in response (check model & region)");
    }

    const candidates: AigcCandidate[] = imgs.slice(0, n).map((u, i) => ({
      index: i,
      url: u,
      width: 1024,
      height: 1024,
    }));

    warnings.push(`dashscope: model=${model} region=${this.region}`);
    return { candidates, provider_request_id: requestId, warnings };
  }
}

export function createDashScopeProviderFromEnv(): DashScopeAigcModelProvider | null {
  const key = process.env.DASHSCOPE_API_KEY?.trim();
  if (!key) return null;
  const region = process.env.DASHSCOPE_REGION?.trim() || "intl";
  const t2i = process.env.DASHSCOPE_T2I_MODEL?.trim() || "qwen-image-plus";
  const edit = process.env.DASHSCOPE_EDIT_MODEL?.trim() || "qwen-image-edit-plus";
  const multiMax = Math.min(8, Math.max(2, Number.parseInt(process.env.DASHSCOPE_MULTI_REF_MAX ?? "3", 10) || 3));
  const timeout = Number.parseInt(process.env.DASHSCOPE_TIMEOUT_MS ?? "120000", 10) || 120_000;
  return new DashScopeAigcModelProvider(key, region, t2i, edit, multiMax, timeout);
}
