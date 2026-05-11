import { dashScopePostGeneration } from "@/lib/image-generation/dashscope-client";
import type { GenerationMode } from "@/lib/image-generation/types";
import { getDashScopeEditModel, getDashScopeT2IModel } from "@/lib/image-generation/config";

type DashScopeGenResult = {
  outputs: { image_url: string; width: number | null; height: number | null }[];
  provider_request_id: string | null;
};

function buildMessages(mode: GenerationMode, prompt: string, referenceUrls: string[]) {
  if (mode === "t2i") {
    return [
      {
        role: "user",
        content: [{ text: prompt }],
      },
    ];
  }
  const content: { image?: string; text?: string }[] = [];
  for (const url of referenceUrls) {
    content.push({ image: url });
  }
  content.push({ text: prompt });
  return [{ role: "user", content }];
}

function buildBody(input: {
  mode: GenerationMode;
  model: string;
  prompt: string;
  negative_prompt: string | null;
  referenceUrls: string[];
}) {
  const messages = buildMessages(input.mode, input.prompt, input.referenceUrls);
  return {
    model: input.model,
    input: { messages },
    parameters: {
      n: 1,
      negative_prompt: input.negative_prompt?.trim() || " ",
      prompt_extend: true,
      watermark: false,
      size: input.mode === "t2i" ? "1024*1024" : "1024*1024",
    },
  };
}

function parseSuccessPayload(json: unknown): DashScopeGenResult {
  const root = json as {
    output?: {
      choices?: Array<{
        message?: { content?: Array<{ image?: string }> };
      }>;
    };
    usage?: { width?: number; height?: number; image_count?: number };
    request_id?: string;
  };
  const choice0 = root.output?.choices?.[0];
  const content = choice0?.message?.content;
  const urls: string[] = [];
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block && typeof block.image === "string" && block.image.length > 0) {
        urls.push(block.image);
      }
    }
  }
  const uw = root.usage?.width;
  const uh = root.usage?.height;
  const w = typeof uw === "number" && Number.isFinite(uw) ? uw : null;
  const h = typeof uh === "number" && Number.isFinite(uh) ? uh : null;
  const outputs = urls.map((image_url) => ({
    image_url,
    width: w,
    height: h,
  }));
  if (outputs.length === 0) {
    throw new Error("DASHSCOPE_EMPTY_OUTPUT");
  }
  return {
    outputs,
    provider_request_id: root.request_id ?? null,
  };
}

export function pickModelForMode(mode: GenerationMode, override?: string | null): string {
  const o = override?.trim();
  if (o) return o;
  return mode === "t2i" ? getDashScopeT2IModel() : getDashScopeEditModel();
}

/**
 * 唯一调用 DashScope multimodal-generation 的路径（T2I / I2I / Multi-ref）。
 */
export async function runDashScopeGeneration(input: {
  apiKey: string;
  mode: GenerationMode;
  model: string;
  prompt: string;
  negative_prompt: string | null;
  referenceUrls: string[];
}): Promise<DashScopeGenResult> {
  const body = buildBody(input);
  const res = await dashScopePostGeneration(body, input.apiKey);
  if (!res.ok) {
    const code = res.code || "PROVIDER_ERROR";
    const msg = res.message || "dashscope request failed";
    const err = new Error(`${code}:${msg}`);
    (err as Error & { providerStatus?: number }).providerStatus = res.status;
    throw err;
  }
  return parseSuccessPayload(res.json);
}
