export type ProductType = "acrylic_standee" | "tshirt";

export type AgentStep =
  | "welcome"
  | "product_select"
  | "design_describe"
  | "generating"
  | "design_review"
  | "mockup_ready"
  | "size_selected"
  | "order_confirm"
  | "order_complete";

export interface AgentState {
  step: AgentStep;
  productType?: ProductType;
  designUrl?: string;
  designPrompt?: string;
  size?: string;
  quantity?: number;
}

export interface QuickReply {
  label: string;
  value: string;
}

export interface MockupData {
  productType: ProductType;
  designUrl: string;
  size?: string;
}

export interface OrderData {
  orderId: string;
  productType: ProductType;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  estimatedDays: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
  isTyping?: boolean;
  isGenerating?: boolean;
  designUrl?: string;
  mockupData?: MockupData;
  orderData?: OrderData;
  quickReplies?: QuickReply[];
}

export type SSEEvent =
  | { type: "text"; content: string }
  | { type: "generating"; step?: string }
  | { type: "image"; url: string }
  | { type: "mockup"; data: MockupData }
  | { type: "quick_replies"; items: QuickReply[] }
  | { type: "order"; data: OrderData }
  | { type: "state"; patch: Partial<AgentState> }
  | { type: "error"; message: string }
  | { type: "done" };
