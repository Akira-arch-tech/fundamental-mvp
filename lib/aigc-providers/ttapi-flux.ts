/**
 * TTAPI Flux：文生图 `POST /flux/generate`；带参考图时 `POST /flux/edits`（multipart，支持多图）。
 * 文档：https://docs.ttapi.io/api/en/flux/generate.md · https://docs.ttapi.io/api/en/flux/edits.md · https://docs.ttapi.io/grids/cn/start/introduction
 */
import type { AigcCandidate } from "@/lib/aigc-types";
import type { AigcModelProvider, AigcProviderGenerateInput, AigcProviderResult } from "@/lib/aigc-provider-contract";

const TTAPI_BASE = "https://api.ttapi.io";

const TTAPI_ASPECT_RATIOS = new Set([
  "21:9",
  "16:9",
  "4:3",
  "3:2",
  "1:1",
  "2:3",
  "3:4",
  "9:16",
  "9:21",
]);

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type GenerateJson = {
  status?: string;
  message?: string;
  data?: { job_id?: string; jobId?: string };
};

type FetchJson = {
  status?: string;
  message?: string;
  jobId?: string;
  data?: {
    imageUrl?: string;
    image_url?: string;
    width?: number;
    height?: number;
    size?: string;
  };
};

async function referenceUrlToBlob(url: string): Promise<Blob> {
  if (url.startsWith("data:")) {
    const m = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(url);
    if (!m) throw new Error("ttapi: invalid data URL for reference image");
    const mime = m[1] || "image/png";
    const isB64 = Boolean(m[2]);
    const payload = m[3] ?? "";
    const buf = isB64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
    return new Blob([buf], { type: mime });
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ttapi: failed to fetch reference image ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  return new Blob([buf], { type: mime });
}

function mapTtapiAspectRatio(aspect: string | null): string | undefined {
  if (!aspect?.trim()) return undefined;
  const a = aspect.trim();
  return TTAPI_ASPECT_RATIOS.has(a) ? a : undefined;
}

export class TtapiFluxAigcModelProvider implements AigcModelProvider {
  constructor(
    private readonly apiKey: string,
    /** Flux mode enum，如 flux1-dev、flux-kontext-pro（edits 与 generate 共用） */
    private readonly fluxMode: string,
  ) {}

  async generate(input: AigcProviderGenerateInput): Promise<AigcProviderResult> {
    const n = Math.min(4, Math.max(1, Math.floor(input.candidate_count)));
    const warnings: string[] = [`ttapi: mode=${this.fluxMode} candidates=${n}`];
    const candidates: AigcCandidate[] = [];
    const jobIds: string[] = [];

    const hasRefs = input.reference_data_urls.length > 0;

    if (input.mode === "txt2img") {
      if (!input.prompt?.trim()) {
        throw new Error("ttapi: prompt required for txt2img");
      }
      if (hasRefs) {
        warnings.push("ttapi: txt2img ignores reference images; use img2img or multi_ref.");
      }
      for (let i = 0; i < n; i++) {
        const jobId = await this.submitGenerate(input.prompt!.trim(), input.aspect_ratio);
        jobIds.push(jobId);
        const { url, width, height } = await this.pollFetch(jobId);
        candidates.push({ index: i, url, width, height });
      }
    } else if (input.mode === "img2img" || input.mode === "multi_ref") {
      const prompt = input.prompt?.trim() || "Refine the image based on the references.";
      const urls =
        input.mode === "img2img"
          ? input.reference_data_urls.slice(0, 1)
          : input.reference_data_urls;
      if (urls.length === 0) {
        throw new Error("ttapi: reference images required for img2img / multi_ref");
      }
      if (input.mode === "img2img" && input.reference_data_urls.length > 1) {
        warnings.push("ttapi: img2img uses first reference only; use multi_ref for multiple images.");
      }
      warnings.push(
        input.mode === "multi_ref"
          ? `ttapi: flux/edits with ${urls.length} reference image(s).`
          : "ttapi: flux/edits with 1 reference (img2img).",
      );
      for (let i = 0; i < n; i++) {
        const jobId = await this.submitEdits(prompt, urls, input.aspect_ratio);
        jobIds.push(jobId);
        const { url, width, height } = await this.pollFetch(jobId);
        candidates.push({ index: i, url, width, height });
      }
    } else {
      throw new Error(`ttapi: unsupported mode ${input.mode}`);
    }

    return {
      candidates,
      provider_request_id: jobIds.join(","),
      warnings,
    };
  }

  private async submitGenerate(prompt: string, aspectRatio: string | null): Promise<string> {
    const body: Record<string, unknown> = {
      prompt,
      mode: this.fluxMode,
    };
    if (process.env.TTAPI_FLUX_SIZE?.trim()) {
      body.size = process.env.TTAPI_FLUX_SIZE.trim();
    }
    const ar = mapTtapiAspectRatio(aspectRatio);
    if (ar) body.aspect_ratio = ar;

    const res = await fetch(`${TTAPI_BASE}/flux/generate`, {
      method: "POST",
      headers: {
        "TT-API-KEY": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`ttapi flux generate failed ${res.status}: ${text.slice(0, 500)}`);
    }
    const json = JSON.parse(text) as GenerateJson;
    if (json.status && json.status !== "SUCCESS") {
      throw new Error(`ttapi flux generate status ${json.status}: ${json.message ?? text.slice(0, 300)}`);
    }
    const jobId = json.data?.job_id ?? json.data?.jobId;
    if (!jobId) {
      throw new Error(`ttapi flux generate missing job id: ${text.slice(0, 400)}`);
    }
    return jobId;
  }

  private async submitEdits(
    prompt: string,
    imageUrls: readonly string[],
    aspectRatio: string | null,
  ): Promise<string> {
    const form = new FormData();
    let idx = 0;
    for (const u of imageUrls) {
      const blob = await referenceUrlToBlob(u);
      form.append("image", blob, `ref_${idx++}.png`);
    }
    form.append("prompt", prompt);
    form.append("mode", this.fluxMode);
    const ar = mapTtapiAspectRatio(aspectRatio);
    if (ar) form.append("aspect_ratio", ar);

    const res = await fetch(`${TTAPI_BASE}/flux/edits`, {
      method: "POST",
      headers: { "TT-API-KEY": this.apiKey },
      body: form,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`ttapi flux edits failed ${res.status}: ${text.slice(0, 500)}`);
    }
    const json = JSON.parse(text) as GenerateJson;
    if (json.status && json.status !== "SUCCESS") {
      throw new Error(`ttapi flux edits status ${json.status}: ${json.message ?? text.slice(0, 300)}`);
    }
    const jobId = json.data?.job_id ?? json.data?.jobId;
    if (!jobId) {
      throw new Error(`ttapi flux edits missing job id: ${text.slice(0, 400)}`);
    }
    return jobId;
  }

  private async pollFetch(jobId: string): Promise<{ url: string; width: number; height: number }> {
    const maxWaitMs = 6 * 60 * 1000;
    const started = Date.now();

    while (Date.now() - started < maxWaitMs) {
      const url = `${TTAPI_BASE}/flux/fetch?jobId=${encodeURIComponent(jobId)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { "TT-API-KEY": this.apiKey },
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`ttapi flux fetch failed ${res.status}: ${text.slice(0, 400)}`);
      }
      const json = JSON.parse(text) as FetchJson;
      const st = (json.status ?? "").trim();
      if (st === "FAILED") {
        throw new Error(`ttapi flux task failed: ${json.message ?? text.slice(0, 300)}`);
      }
      if (st === "SUCCESS" && json.data) {
        const imageUrl = json.data.imageUrl ?? json.data.image_url;
        if (!imageUrl) {
          throw new Error(`ttapi flux success but no imageUrl: ${text.slice(0, 400)}`);
        }
        let width = typeof json.data.width === "number" ? json.data.width : 1024;
        let height = typeof json.data.height === "number" ? json.data.height : 1024;
        const size = json.data.size;
        if (typeof size === "string" && size.includes("x")) {
          const [w, h] = size.split("x").map((x) => parseInt(x, 10));
          if (Number.isFinite(w) && Number.isFinite(h)) {
            width = w;
            height = h;
          }
        }
        return { url: imageUrl, width, height };
      }
      await sleep(2000);
    }
    throw new Error(`ttapi flux fetch timeout for jobId=${jobId}`);
  }
}
