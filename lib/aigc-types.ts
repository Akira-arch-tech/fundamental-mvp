/** 买家端 AIGC 生图任务（与政策「候选图 / 确认窗」对齐） */

export type AigcJobStatus =
  | "queued"
  | "processing"
  | "ready"
  | "expired"
  | "confirmed"
  | "failed";

export type AigcGenerationMode = "txt2img" | "img2img" | "multi_ref";

export type AigcReferenceRole = "subject" | "style" | "layout" | "other";

export type AigcCompositionMode = "blend" | "collage_guided" | "controlnet_stack";

export interface AigcCandidate {
  index: number;
  /** 候选预览 URL（mock 为 picsum；真模型为对象存储或 CDN） */
  url: string;
  width: number;
  height: number;
}

export interface AigcReferenceItem {
  asset_id: string;
  role: AigcReferenceRole;
}

export interface AigcGenerationJob {
  job_id: string;
  product_id: string;
  mode: AigcGenerationMode;
  prompt: string | null;
  negative_prompt: string | null;
  aspect_ratio: string | null;
  candidate_count: number;
  seed: string | null;
  strength: number | null;
  /** 兼容旧字段：参考图张数（无 asset 时） */
  reference_asset_count: number;
  reference_asset_ids: string[];
  references: AigcReferenceItem[] | null;
  composition_mode: AigcCompositionMode | null;
  status: AigcJobStatus;
  created_at: string;
  /** 首张候选可用后起算的确认截止时间（ready 时写入） */
  confirm_deadline_at: string;
  candidates: AigcCandidate[];
  confirmed_index: number | null;
  error_code: string | null;
  error_message: string | null;
  provider_request_id: string | null;
  warnings: string[];
}

/** POST /api/aigc/generations */
export interface AigcGenerationCreateBody {
  product_id: string;
  mode?: AigcGenerationMode;
  prompt?: string;
  negative_prompt?: string;
  aspect_ratio?: string;
  candidate_count?: number;
  seed?: string;
  strength?: number;
  /** @deprecated 使用 reference_asset_ids；保留兼容 */
  reference_asset_count?: number;
  reference_asset_ids?: string[];
  references?: AigcReferenceItem[];
  composition_mode?: AigcCompositionMode;
}

/** POST .../confirm */
export interface AigcGenerationConfirmBody {
  candidate_index: number;
}
