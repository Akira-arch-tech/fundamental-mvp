export type ProductType = "acrylic_standee" | "tshirt" | "badge" | "phone_case" | "clear_file";

export type AgentStep =
  | "welcome"
  | "mode_select"
  | "b2b_streamer"
  | "b2b_community"
  | "product_select"
  | "design_describe"
  | "generating"
  | "design_review"
  | "mockup_ready"
  | "crowdfunding_copy"
  | "size_selected"
  | "order_confirm"
  | "order_complete";

export interface CommunityPackData {
  lineOa: [string, string, string];
  discordVotePost: string;
  pocochaLiveScript: string;
  twitterHint: string;
}

export interface CheckoutLinkData {
  customization_id: string;
  url: string;
  label: string;
}

export interface VirtualGiftHintData {
  mockUrl: string;
  giftName: string;
}

export interface AgentState {
  step: AgentStep;
  mode?: "b2b" | "c2c";
  streamerStyle?: string;
  communityPlatforms?: string[];
  productType?: ProductType;
  designUrl?: string;
  designPrompt?: string;
  size?: string;
  quantity?: number;
  crowdfundingCopy?: string;
  communityPackShown?: boolean;
  customizationId?: string;
  /** 演示模式：预置图/文案，不依赖 AIGC Key */
  demoMode?: boolean;
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
  copywritingContent?: string;
  communityPack?: CommunityPackData;
  checkoutLink?: CheckoutLinkData;
  virtualGiftHint?: VirtualGiftHintData;
}

export type SSEEvent =
  | { type: "text"; content: string }
  | { type: "generating"; step?: string }
  | { type: "image"; url: string }
  | { type: "mockup"; data: MockupData }
  | { type: "quick_replies"; items: QuickReply[] }
  | { type: "order"; data: OrderData }
  | { type: "copywriting"; content: string }
  | { type: "community_pack"; data: CommunityPackData }
  | { type: "checkout_link"; data: CheckoutLinkData }
  | { type: "virtual_gift_hint"; data: VirtualGiftHintData }
  | { type: "state"; patch: Partial<AgentState> }
  | { type: "error"; message: string }
  | { type: "done" };
