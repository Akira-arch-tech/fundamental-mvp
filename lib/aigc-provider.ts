import { createDashScopeProviderFromEnv } from "@/lib/aigc-providers/dashscope";
import { FalQueueAigcModelProvider } from "@/lib/aigc-providers/fal-queue";
import { TtapiFluxAigcModelProvider } from "@/lib/aigc-providers/ttapi-flux";
import type { AigcCandidate } from "@/lib/aigc-types";
import type { AigcModelProvider, AigcProviderGenerateInput, AigcProviderResult } from "@/lib/aigc-provider-contract";

export type { AigcModelProvider, AigcProviderGenerateInput, AigcProviderResult } from "@/lib/aigc-provider-contract";

function placeholderCandidates(jobId: string, count: number): AigcCandidate[] {
  const seed = jobId.replace(/\W/g, "").slice(-8) || "demo";
  const n = Math.min(4, Math.max(1, count));
  const out: AigcCandidate[] = [];
  for (let i = 0; i < n; i++) {
    const suf = String.fromCharCode(97 + (i % 26));
    out.push({
      index: i,
      url: `https://picsum.photos/seed/${seed}${suf}${i}/512/512`,
      width: 512,
      height: 512,
    });
  }
  return out;
}

/** Mock：不扣费；按模式返回占位图与降级说明 */
export class MockAigcModelProvider implements AigcModelProvider {
  async generate(input: AigcProviderGenerateInput): Promise<AigcProviderResult> {
    const warnings: string[] = ["mock_provider: 未接真实模型，候选为 picsum 占位图。"];

    if (input.mode === "multi_ref" && (input.references?.length ?? 0) > 0) {
      const subject = input.references!.find((r) => r.role === "subject");
      if (!subject && input.references!.length > 0) {
        warnings.push("multi_ref: 无 subject 角色，mock 使用首张参考语义。");
      } else if (input.references!.length > 1) {
        warnings.push(
          "multi_ref: mock 仅融合首张 subject 与 prompt；真实管线需按 composition_mode 映射模型参数。",
        );
      }
    } else if (input.mode === "img2img" && input.reference_data_urls.length > 1) {
      warnings.push("img2img: mock 仅使用第一张参考图；多图组合请用 mode=multi_ref。");
    }

    const id = `mock_${Date.now().toString(36)}`;
    return {
      candidates: placeholderCandidates(input.job_id, input.candidate_count),
      provider_request_id: id,
      warnings,
    };
  }
}

function createTtapiProviderOrNull(): TtapiFluxAigcModelProvider | null {
  const key = process.env.TT_API_KEY?.trim();
  if (!key) return null;
  const fluxMode = process.env.TTAPI_FLUX_MODE?.trim() || "flux1-dev";
  return new TtapiFluxAigcModelProvider(key, fluxMode);
}

/**
 * AIGC_PROVIDER: unset | mock | ttapi | dashscope | fal
 * - **未设置**：优先 **TTAPI**（`TT_API_KEY`）；否则 DashScope（`DASHSCOPE_API_KEY`）；否则 mock。
 *   产品默认推荐 TTAPI 聚合（模型全、单价低），见 https://docs.ttapi.io/grids/cn/start/introduction
 * - CI / verify：不设密钥则 mock；勿在 CI 注入真实 `TT_API_KEY` 以免扣费。
 * - fal: FAL_KEY + 可选 FAL_MODEL_ID
 */
export function getAigcModelProvider(): AigcModelProvider {
  const explicit = process.env.AIGC_PROVIDER?.trim().toLowerCase() ?? "";

  if (explicit === "mock") {
    return new MockAigcModelProvider();
  }

  if (explicit === "dashscope") {
    const ds = createDashScopeProviderFromEnv();
    if (ds) return ds;
    console.warn("[aigc] AIGC_PROVIDER=dashscope but DASHSCOPE_API_KEY missing; falling back to mock");
    return new MockAigcModelProvider();
  }

  if (explicit === "ttapi") {
    const tt = createTtapiProviderOrNull();
    if (tt) return tt;
    console.warn("[aigc] AIGC_PROVIDER=ttapi but TT_API_KEY missing; falling back to mock");
    return new MockAigcModelProvider();
  }

  if (explicit === "fal") {
    const key = process.env.FAL_KEY?.trim();
    if (!key) {
      console.warn("[aigc] AIGC_PROVIDER=fal but FAL_KEY missing; falling back to mock");
      return new MockAigcModelProvider();
    }
    const modelId = process.env.FAL_MODEL_ID?.trim() || "fal-ai/flux/schnell";
    return new FalQueueAigcModelProvider(key, modelId);
  }

  if (!explicit) {
    const tt = createTtapiProviderOrNull();
    if (tt) return tt;
    const ds = createDashScopeProviderFromEnv();
    if (ds) return ds;
    return new MockAigcModelProvider();
  }

  console.warn(`[aigc] unknown AIGC_PROVIDER=${JSON.stringify(explicit)}; using mock`);
  return new MockAigcModelProvider();
}
