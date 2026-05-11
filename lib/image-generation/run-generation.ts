import { newRequestId } from "@/lib/request-id";
import { resolveReferenceUrls } from "@/lib/image-generation/asset-resolver";
import {
  shouldUseMockImageGeneration,
  getDemoStoreId,
  getMultiRefMax,
  shouldPersistGeneration,
} from "@/lib/image-generation/config";
import { pickModelForMode, runDashScopeGeneration } from "@/lib/image-generation/dashscope-adapter";
import { getGeneration, insertGeneration, updateGeneration } from "@/lib/image-generation/generation-store";
import { runMockGeneration } from "@/lib/image-generation/mock-generation";
import type { CreateGenerationBody, GenerationRecord, GenerationOutput } from "@/lib/image-generation/types";

function newGenerationId(): string {
  return `gen_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function validateCreateBody(body: CreateGenerationBody): {
  ok: true;
  refs: string[];
} | { ok: false; code: string; message: string } {
  const mode = body.mode;
  if (mode !== "t2i" && mode !== "i2i" && mode !== "multi_ref") {
    return { ok: false, code: "VALIDATION_ERROR", message: "invalid mode" };
  }
  const prompt = body.prompt?.trim();
  if (!prompt) return { ok: false, code: "VALIDATION_ERROR", message: "prompt is required" };
  const refs = Array.isArray(body.reference_asset_ids) ? body.reference_asset_ids.map((x) => String(x).trim()).filter(Boolean) : [];
  if (mode === "t2i" && refs.length > 0) {
    return { ok: false, code: "VALIDATION_ERROR", message: "t2i must not include reference_asset_ids" };
  }
  if (mode === "i2i" && refs.length !== 1) {
    return { ok: false, code: "VALIDATION_ERROR", message: "i2i requires exactly one reference_asset_id" };
  }
  const maxRef = getMultiRefMax();
  if (mode === "multi_ref") {
    if (refs.length < 2) {
      return { ok: false, code: "VALIDATION_ERROR", message: "multi_ref requires at least 2 reference_asset_ids" };
    }
    if (refs.length > maxRef) {
      return { ok: false, code: "VALIDATION_ERROR", message: `multi_ref supports at most ${maxRef} references` };
    }
  }
  return { ok: true, refs };
}

export async function executeGenerationPipeline(input: {
  body: CreateGenerationBody;
  user_id: string | null;
}): Promise<GenerationRecord> {
  const v = validateCreateBody(input.body);
  if (!v.ok) {
    throw Object.assign(new Error(v.message), { code: v.code });
  }

  const mode = input.body.mode;
  const prompt = input.body.prompt.trim();
  const negative = input.body.negative_prompt?.trim() || null;
  const stylePreset = input.body.style_preset_id?.trim() || null;
  const productId = input.body.product_id?.trim() || null;
  const storeId = input.body.store_id?.trim() || getDemoStoreId();
  const requestId = newRequestId();
  const generationId = newGenerationId();
  const useMock = shouldUseMockImageGeneration();
  const shouldPersist = shouldPersistGeneration();
  const model = pickModelForMode(mode, input.body.model);

  const base: GenerationRecord = {
    generation_id: generationId,
    store_id: storeId,
    product_id: productId,
    user_id: input.user_id,
    mode,
    prompt,
    negative_prompt: negative,
    style_preset_id: stylePreset,
    reference_asset_ids: v.refs,
    provider: useMock ? "mock" : "dashscope",
    model,
    request_id: requestId,
    provider_request_id: null,
    status: "running",
    outputs: [],
    error_code: null,
    message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (shouldPersist) {
    await insertGeneration(base);
  }

  try {
    let outputs: GenerationOutput[];
    let providerRequestId: string | null = null;

    if (useMock) {
      const raw = runMockGeneration({ generation_id: generationId, mode, prompt, n: 1 });
      outputs = raw;
    } else {
      const apiKey = process.env.DASHSCOPE_API_KEY!.trim();
      const referenceUrls =
        mode === "t2i" ? [] : await resolveReferenceUrls(v.refs);
      const r = await runDashScopeGeneration({
        apiKey,
        mode,
        model,
        prompt,
        negative_prompt: negative,
        referenceUrls,
      });
      providerRequestId = r.provider_request_id;
      const now = new Date().toISOString();
      outputs = r.outputs.map((o) => ({
        image_url: o.image_url,
        width: o.width,
        height: o.height,
        created_at: now,
      }));
    }

    if (shouldPersist) {
      const done = await updateGeneration(generationId, {
        status: "success",
        outputs,
        provider_request_id: providerRequestId,
      });
      return done ?? { ...base, status: "success", outputs, provider_request_id: providerRequestId };
    }
    return {
      ...base,
      status: "success",
      outputs,
      provider_request_id: providerRequestId,
      updated_at: new Date().toISOString(),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    let code =
      e && typeof e === "object" && "code" in e && typeof (e as { code: unknown }).code === "string"
        ? (e as { code: string }).code
        : "GENERATION_FAILED";
    if (msg.startsWith("ASSET_")) code = "ASSET_RESOLVE_FAILED";
    const prov = /^([^:]+):(.+)$/.exec(msg);
    if (prov && !msg.startsWith("ASSET_")) code = prov[1];
    if (msg.includes("InvalidApiKey")) code = "PROVIDER_AUTH";
    if (shouldPersist) {
      await updateGeneration(generationId, {
        status: "failed",
        error_code: code,
        message: msg.slice(0, 2000),
      });
      const failed = await getGeneration(generationId);
      return failed ?? { ...base, status: "failed", error_code: code, message: msg };
    }
    return {
      ...base,
      status: "failed",
      error_code: code,
      message: msg.slice(0, 2000),
      updated_at: new Date().toISOString(),
    };
  }
}
