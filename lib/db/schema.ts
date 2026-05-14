import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { AigcCandidate, AigcReferenceItem } from "@/lib/aigc-types";
import type { CustomizationDesignStored, DpiCheckResult, ExceptionAuditLog } from "@/lib/types";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const orders = pgTable(
  "orders",
  {
    orderId: text("order_id").primaryKey(),
    orderNo: text("order_no").notNull(),
    customizationId: text("customization_id").notNull(),
    productId: text("product_id").notNull(),
    qty: integer("qty").notNull(),
    recipientName: text("recipient_name").notNull(),
    recipientPhone: text("recipient_phone").notNull(),
    shippingAddress: text("shipping_address").notNull(),
    note: text("note"),
    status: text("status").notNull(),
    workorderId: text("workorder_id").notNull(),
    unitPrice: integer("unit_price").notNull(),
    shippingFee: integer("shipping_fee").notNull(),
    totalAmount: integer("total_amount").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("orders_created_at_idx").on(t.createdAt),
    index("orders_status_idx").on(t.status),
    index("orders_order_no_idx").on(t.orderNo),
  ],
);

export const exceptionRequests = pgTable(
  "exception_requests",
  {
    exceptionRequestId: text("exception_request_id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.orderId, { onDelete: "cascade" }),
    type: text("type").notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    auditLogs: jsonb("audit_logs").$type<ExceptionAuditLog[]>().notNull(),
  },
  (t) => [
    index("exception_order_id_idx").on(t.orderId),
    index("exception_status_idx").on(t.status),
    index("exception_created_idx").on(t.createdAt),
  ],
);

/** W12/W13：出站对接任务（ERP/CRM），支持重试与死信 */
export const integrationJobs = pgTable(
  "integration_jobs",
  {
    id: text("id").primaryKey(),
    targetSystem: text("target_system").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    status: text("status").notNull(),
    retryCount: integer("retry_count").notNull().default(0),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    lastError: text("last_error"),
    requestId: text("request_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ij_status_next_idx").on(t.status, t.nextRetryAt),
    index("ij_created_idx").on(t.createdAt),
  ],
);

export const integrationAlerts = pgTable(
  "integration_alerts",
  {
    id: text("id").primaryKey(),
    level: text("level").notNull(),
    code: text("code").notNull(),
    message: text("message").notNull(),
    requestId: text("request_id"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ia_created_idx").on(t.createdAt)],
);

/** CRM 时间线（MVP 本地落库，替代真实 CRM API） */
export const crmTimelineEntries = pgTable(
  "crm_timeline_entries",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id"),
    orderNo: text("order_no").notNull(),
    exceptionRequestId: text("exception_request_id"),
    eventType: text("event_type").notNull(),
    summary: text("summary").notNull(),
    payload: jsonb("payload"),
    requestId: text("request_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("crm_order_no_idx").on(t.orderNo), index("crm_created_idx").on(t.createdAt)],
);

/** 买家定制草稿（多实例 / 生产环境须落库；对齐 v1.0 方案 §4.5） */
export const customizations = pgTable(
  "customizations",
  {
    customizationId: text("customization_id").primaryKey(),
    productId: text("product_id").notNull(),
    templateId: text("template_id").notNull(),
    designData: jsonb("design_data").$type<CustomizationDesignStored>().notNull(),
    dpiCheckResult: jsonb("dpi_check_result").$type<DpiCheckResult>().notNull(),
    warnings: jsonb("warnings").$type<string[]>().notNull(),
    previewUrl: text("preview_url").notNull(),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [
    index("customizations_product_id_idx").on(t.productId),
    index("customizations_created_at_idx").on(t.createdAt),
  ],
);

/** 买家 AIGC 生图任务（queued → processing → ready；多实例需 DB） */
export const aigcGenerationJobs = pgTable(
  "aigc_generation_jobs",
  {
    jobId: text("job_id").primaryKey(),
    productId: text("product_id").notNull(),
    mode: text("mode").notNull().default("txt2img"),
    prompt: text("prompt"),
    negativePrompt: text("negative_prompt"),
    aspectRatio: text("aspect_ratio"),
    candidateCount: integer("candidate_count").notNull().default(2),
    seed: text("seed"),
    strength: text("strength"),
    referenceAssetIds: jsonb("reference_asset_ids").$type<string[]>().notNull().default([]),
    referencesPayload: jsonb("references_payload").$type<AigcReferenceItem[] | null>(),
    compositionMode: text("composition_mode"),
    status: text("status").notNull(),
    candidates: jsonb("candidates").$type<AigcCandidate[]>().notNull().default([]),
    confirmDeadlineAt: timestamp("confirm_deadline_at", { withTimezone: true }).notNull(),
    confirmedIndex: integer("confirmed_index"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    providerRequestId: text("provider_request_id"),
    warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("aigc_jobs_status_idx").on(t.status), index("aigc_jobs_created_idx").on(t.createdAt)],
);
