export type IntegrationTarget = "erp" | "crm";

export type IntegrationJobStatus =
  | "pending"
  | "processing"
  | "success"
  | "failed"
  | "dead_letter";

export interface IntegrationJobRecord {
  id: string;
  target_system: IntegrationTarget;
  event_type: string;
  payload: unknown;
  idempotency_key: string;
  status: IntegrationJobStatus;
  retry_count: number;
  next_retry_at: string | null;
  last_error: string | null;
  request_id: string;
  created_at: string;
  updated_at: string;
}

export type IntegrationAlertLevel = "warn" | "error";

export interface IntegrationAlertRecord {
  id: string;
  level: IntegrationAlertLevel;
  code: string;
  message: string;
  request_id: string | null;
  meta: unknown;
  created_at: string;
}

export interface CrmTimelineEntry {
  id: string;
  order_id: string | null;
  order_no: string;
  exception_request_id: string | null;
  event_type: string;
  summary: string;
  payload: unknown;
  request_id: string | null;
  created_at: string;
}

/** 与 PRD 建议一致：分钟级退避（转为 ms 在 worker 内计算） */
export const RETRY_BACKOFF_MINUTES = [1, 5, 15, 60, 360] as const;

export const MAX_JOB_RETRIES = RETRY_BACKOFF_MINUTES.length;
