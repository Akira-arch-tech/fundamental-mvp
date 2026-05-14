/**
 * fal.ai Queue API（REST）：submit → poll status → GET result。
 * 文档：https://docs.fal.ai/model-endpoints/queue
 */
import type { AigcCandidate } from "@/lib/aigc-types";
import type { AigcModelProvider, AigcProviderGenerateInput, AigcProviderResult } from "@/lib/aigc-provider-contract";

const FAL_QUEUE_BASE = "https://queue.fal.run";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function mapAspectToImageSize(aspect: string | null): string {
  if (!aspect) return "landscape_4_3";
  const a = aspect.trim();
  const m: Record<string, string> = {
    "1:1": "square_hd",
    "4:3": "landscape_4_3",
    "3:4": "portrait_4_3",
    "16:9": "landscape_16_9",
    "9:16": "portrait_16_9",
    square: "square_hd",
    square_hd: "square_hd",
    landscape_4_3: "landscape_4_3",
    portrait_4_3: "portrait_4_3",
    landscape_16_9: "landscape_16_9",
    portrait_16_9: "portrait_16_9",
  };
  return m[a] ?? "landscape_4_3";
}

type FalSubmitResponse = {
  request_id: string;
  status_url?: string;
  response_url?: string;
};

type FalStatusBody = {
  status: string;
  request_id?: string;
  response_url?: string;
  error?: string;
  error_type?: string;
};

function statusUrl(modelId: string, requestId: string): string {
  return `${FAL_QUEUE_BASE}/${modelId}/requests/${requestId}/status`;
}

function resultUrl(modelId: string, requestId: string): string {
  return `${FAL_QUEUE_BASE}/${modelId}/requests/${requestId}`;
}

function extractImages(payload: unknown): { url: string; width: number; height: number }[] {
  const o = payload as Record<string, unknown>;
  const root = (o.data ?? o) as Record<string, unknown>;
  const images = root.images as Array<{ url: string; width?: number; height?: number }> | undefined;
  if (!Array.isArray(images) || images.length === 0) return [];
  return images.map((im) => ({
    url: im.url,
    width: typeof im.width === "number" ? im.width : 1024,
    height: typeof im.height === "number" ? im.height : 1024,
  }));
}

export class FalQueueAigcModelProvider implements AigcModelProvider {
  constructor(
    private readonly apiKey: string,
    private readonly modelId: string,
  ) {}

  async generate(input: AigcProviderGenerateInput): Promise<AigcProviderResult> {
    if (input.mode !== "txt2img") {
      throw new Error(`fal provider: mode ${input.mode} not supported yet (txt2img only)`);
    }
    if (!input.prompt?.trim()) {
      throw new Error("fal provider: prompt required");
    }
    if (input.reference_data_urls.length > 0) {
      throw new Error("fal provider: reference images not supported in this adapter yet");
    }

    const num_images = Math.min(4, Math.max(1, Math.floor(input.candidate_count)));
    const body: Record<string, unknown> = {
      prompt: input.prompt.trim(),
      num_images,
      image_size: mapAspectToImageSize(input.aspect_ratio),
      enable_safety_checker: true,
    };
    if (input.seed) {
      const n = parseInt(input.seed, 10);
      if (Number.isFinite(n)) body.seed = n;
    }

    const submitRes = await fetch(`${FAL_QUEUE_BASE}/${this.modelId}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const submitText = await submitRes.text();
    if (!submitRes.ok) {
      throw new Error(`fal submit failed ${submitRes.status}: ${submitText.slice(0, 500)}`);
    }
    let submitJson: FalSubmitResponse;
    try {
      submitJson = JSON.parse(submitText) as FalSubmitResponse;
    } catch {
      throw new Error(`fal submit invalid JSON: ${submitText.slice(0, 200)}`);
    }
    const requestId = submitJson.request_id;
    if (!requestId) {
      throw new Error(`fal submit missing request_id: ${submitText.slice(0, 300)}`);
    }

    const pollUrlBase = submitJson.status_url ?? statusUrl(this.modelId, requestId);
    const pollUrl = new URL(pollUrlBase);
    pollUrl.searchParams.set("logs", "0");
    const maxWaitMs = 5 * 60 * 1000;
    const started = Date.now();
    let lastStatus = "";

    while (Date.now() - started < maxWaitMs) {
      const stRes = await fetch(pollUrl.toString(), {
        headers: { Authorization: `Key ${this.apiKey}` },
      });
      const stText = await stRes.text();
      if (!stRes.ok) {
        throw new Error(`fal status failed ${stRes.status}: ${stText.slice(0, 400)}`);
      }
      const st = JSON.parse(stText) as FalStatusBody;
      lastStatus = st.status;
      if (st.status === "FAILED") {
        throw new Error(`fal queue failed: ${st.error ?? stText.slice(0, 300)}`);
      }
      if (st.status === "COMPLETED") {
        if (st.error) {
          throw new Error(`fal completed with error: ${st.error}${st.error_type ? ` (${st.error_type})` : ""}`);
        }
        const resUrl = st.response_url ?? resultUrl(this.modelId, requestId);
        const resRes = await fetch(resUrl, { headers: { Authorization: `Key ${this.apiKey}` } });
        const resText = await resRes.text();
        if (!resRes.ok) {
          throw new Error(`fal result failed ${resRes.status}: ${resText.slice(0, 400)}`);
        }
        const resJson = JSON.parse(resText) as unknown;
        const imgs = extractImages(resJson);
        if (imgs.length === 0) {
          throw new Error(`fal result has no images: ${resText.slice(0, 400)}`);
        }
        const candidates: AigcCandidate[] = imgs.map((im, i) => ({
          index: i,
          url: im.url,
          width: im.width,
          height: im.height,
        }));
        const warnings: string[] = [
          `fal_queue: model=${this.modelId} request_id=${requestId} num_images=${num_images}`,
        ];
        return { candidates, provider_request_id: requestId, warnings };
      }
      await sleep(1500);
    }

    throw new Error(`fal queue timeout after ${maxWaitMs}ms (last status: ${lastStatus})`);
  }
}
