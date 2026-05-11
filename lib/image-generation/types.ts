/** PRD §8.4.1 — 三模式 */
export type GenerationMode = "t2i" | "i2i" | "multi_ref";

export type GenerationStatus = "queued" | "running" | "success" | "failed";

export type GenerationOutput = {
  image_url: string;
  width: number | null;
  height: number | null;
  created_at: string;
};

export type GenerationRecord = {
  generation_id: string;
  store_id: string;
  product_id: string | null;
  user_id: string | null;
  mode: GenerationMode;
  prompt: string;
  negative_prompt: string | null;
  style_preset_id: string | null;
  reference_asset_ids: string[];
  provider: "dashscope" | "mock";
  model: string;
  request_id: string;
  provider_request_id: string | null;
  status: GenerationStatus;
  outputs: GenerationOutput[];
  error_code: string | null;
  message: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateGenerationBody = {
  mode: GenerationMode;
  prompt: string;
  negative_prompt?: string | null;
  style_preset_id?: string | null;
  reference_asset_ids?: string[];
  product_id?: string | null;
  model?: string | null;
  /** 覆盖默认 demo 店铺 id */
  store_id?: string | null;
};
