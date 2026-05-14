/**
 * 买家店 AIGC 与文档共用的路径与上限（与 `POST /api/aigc/generations` 一致）。
 * 后台 `InternalAiEditor` 仅作说明引用，便于与买家 BFF 对齐；运营侧仍走 `/api/backoffice/*`。
 */
export const AIGC_GENERATIONS_API_PATH = "/api/aigc/generations";

/** 与 `app/api/aigc/generations/route.ts` 中 reference 上限一致 */
export const AIGC_MAX_REFERENCE_ASSET_COUNT = 8;

export const AIGC_MIN_CANDIDATE_COUNT = 1;
export const AIGC_MAX_CANDIDATE_COUNT = 4;

export const AIGC_REFERENCE_ASSETS_API_PATH = "/api/aigc/reference-assets";
