import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { ExceptionAuditLog } from "@/lib/types";

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
