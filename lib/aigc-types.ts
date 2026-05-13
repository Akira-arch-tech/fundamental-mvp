/** 买家端 AIGC 生图任务（MVP 骨架，与政策「候选图 / 确认窗」对齐的字段名） */

export type AigcJobStatus =
  | "queued"
  | "processing"
  | "ready"
  | "expired"
  | "confirmed"
  | "failed";

export interface AigcCandidate {
  index: number;
  /** 候选预览 URL（骨架阶段为占位图；接模型后替换为对象存储 URL） */
  url: string;
  width: number;
  height: number;
}

export interface AigcGenerationJob {
  job_id: string;
  product_id: string;
  prompt: string | null;
  reference_asset_count: number;
  status: AigcJobStatus;
  created_at: string;
  /** 未确认时候选可展示截止时间（首张可预览起算的业务语义由服务端统一） */
  confirm_deadline_at: string;
  candidates: AigcCandidate[];
  confirmed_index: number | null;
  error_code: string | null;
  error_message: string | null;
}

/** POST /api/aigc/generations 请求体（骨架：最小字段；multipart 大图后续再接） */
export interface AigcGenerationCreateBody {
  product_id: string;
  /** 可选文案提示，接模型时传入 */
  prompt?: string;
  /** 参考图数量占位（真实实现为 multipart 或已上传 asset id 列表） */
  reference_asset_count?: number;
}

/** POST .../confirm 请求体 */
export interface AigcGenerationConfirmBody {
  candidate_index: number;
}
