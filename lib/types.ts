/** 与 PRD v0.1 对齐的最小字段集 */

export type SortKey =
  | "popularity"
  | "price_asc"
  | "price_desc"
  | "new"
  | "lead_time";

export interface OshiColor {
  code: string;
  name: string;
  hex: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export interface ProductCard {
  product_id: string;
  slug: string;
  title: string;
  cover_url: string;
  price_from: number;
  badge?: string;
  lead_time_days: number;
  min_qty: number;
  category_ids: string[];
  oshi_color_tags: string[];
  popularity: number;
  created_at: string;
}

export interface TopicPayload {
  topic_id: string;
  topic_title: string;
  topic_subtitle: string;
  hero_banners: { image_url: string; alt: string; href?: string }[];
  recommended_categories: { id: string; name: string; icon?: string }[];
  oshi_colors: OshiColor[];
  sort_options: { key: SortKey; label: string }[];
}

export interface SpecOption {
  id: string;
  label: string;
  values: { id: string; label: string; price_delta?: number; sku_code?: string }[];
}

export interface ProductDetail extends ProductCard {
  source_channel?: "custom_gifts";
  source_category_path?: string;
  description: string;
  gallery: string[];
  spec_schema: SpecOption[];
  pricing_rules: { min_qty: number; unit_price: number; label?: string }[];
  lead_time_rules: { label: string; days: number; condition?: string }[];
  design_template_id: string;
  faq: { q: string; a: string }[];
  color_variants?: { value: string; label: string }[];
  print_areas?: { id: string; label: string }[];
}

export interface CartSpecSelection {
  spec_id: string;
  spec_label: string;
  value_id: string;
  value_label: string;
}

export interface CartItemRecord {
  cart_item_id: string;
  product_id: string;
  product_slug: string;
  product_title: string;
  cover_url: string;
  qty: number;
  unit_price: number;
  line_total: number;
  selected_specs: CartSpecSelection[];
  source_sku_code?: string;
  customization_id?: string;
  added_from: "product" | "customize";
  created_at: string;
}

export interface ReviewSnippet {
  id: string;
  region: string;
  gender: string;
  month: string;
  excerpt: string;
}

export interface DpiCheckResult {
  status: "ok" | "warning";
  estimated_dpi: number;
  min_recommended_dpi: number;
  message: string;
}

export interface CustomizationCreateInput {
  product_id: string;
  template_id: string;
  text_layers: { text: string; color: string; x?: number; y?: number }[];
  color_layers: { role: string; value: string }[];
  user_images: { name: string; data_url: string }[];
  transform_matrix?: number[];
  estimated_dpi?: number;
}

/** `customizations.design_data`（PostgreSQL jsonb） */
export type CustomizationDesignStored = Pick<
  CustomizationCreateInput,
  "text_layers" | "color_layers" | "user_images"
> & {
  transform_matrix?: number[];
  estimated_dpi?: number;
};

export interface CustomizationRecord extends CustomizationCreateInput {
  customization_id: string;
  preview_url: string;
  dpi_check_result: DpiCheckResult;
  warnings: string[];
  created_at: string;
}

/** PRD §8.5：デモ即時 / Stripe Checkout 完了後 */
export type OrderPaymentMethod = "demo_instant" | "stripe";

export interface OrderCreateInput {
  customization_id: string;
  product_id: string;
  qty: number;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  note?: string;
  /** POST /api/orders では demo_instant のみ；Stripe は Checkout 完了後に stripe で保存 */
  payment_method?: OrderPaymentMethod;
  /** PRD §8.1 版权与合规：上传/下单前声明 */
  copyright_acknowledged?: boolean;
}

export interface OrderRecord extends OrderCreateInput {
  order_id: string;
  order_no: string;
  status: "created" | "reviewing" | "in_production" | "shipped";
  workorder_id: string;
  unit_price: number;
  shipping_fee: number;
  total_amount: number;
  created_at: string;
}

export interface WorkorderRecord {
  workorder_id: string;
  order_id: string;
  status: "queued" | "reviewing" | "printing" | "packed";
  factory_name: string;
  sla_due_at: string;
  created_at: string;
}

export interface ShipmentEvent {
  shipment_event_id: string;
  order_id: string;
  event_type: "order_created" | "packed" | "shipped" | "in_transit" | "delivered";
  event_label: string;
  location: string;
  occurred_at: string;
  tracking_no?: string;
}

export interface SupportTicketRecord {
  support_ticket_id: string;
  order_id: string;
  question: string;
  answer: string;
  status: "open" | "answered";
  created_at: string;
}

export interface ExceptionRequestRecord {
  exception_request_id: string;
  order_id: string;
  type: "redesign" | "reship" | "refund";
  reason: string;
  status: "submitted" | "processing" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  audit_logs?: ExceptionAuditLog[];
}

export interface ExceptionAuditLog {
  action: "created" | "to_processing" | "approved" | "rejected";
  from_status: ExceptionRequestRecord["status"] | "none";
  to_status: ExceptionRequestRecord["status"];
  operator: string;
  operator_role: OperatorRole;
  note?: string;
  at: string;
}

export type OperatorRole = "customer_service" | "ops" | "admin";
