import type { AigcCandidate, AigcCompositionMode, AigcGenerationMode, AigcReferenceItem } from "@/lib/aigc-types";

export interface AigcProviderGenerateInput {
  mode: AigcGenerationMode;
  prompt: string | null;
  negative_prompt: string | null;
  aspect_ratio: string | null;
  candidate_count: number;
  seed: string | null;
  strength: number | null;
  /** 参考图 data URL 或 https URL，顺序与 reference_asset_ids 一致 */
  reference_data_urls: string[];
  references: AigcReferenceItem[] | null;
  composition_mode: AigcCompositionMode | null;
  job_id: string;
}

export interface AigcProviderResult {
  candidates: AigcCandidate[];
  provider_request_id: string;
  warnings: string[];
}

/** 抽象：fal / TTAPI / mock 等实现 */
export interface AigcModelProvider {
  generate(input: AigcProviderGenerateInput): Promise<AigcProviderResult>;
}
