import type { AgentState, ProductType } from "./types";

export type IntentType =
  | "greeting"
  | "select_acrylic"
  | "select_tshirt"
  | "describe_design"
  | "confirm"
  | "refine"
  | "select_size"
  | "set_quantity"
  | "unknown";

export interface ParsedIntent {
  type: IntentType;
  productType?: ProductType;
  size?: string;
  quantity?: number;
  rawText: string;
}

const ACRYLIC_KW = ["アクリル", "アクスタ", "acrylic", "立牌", "スタンド", "アクリルスタンド", "アクスタンド"];
const TSHIRT_KW = ["tシャツ", "t-shirt", "tshirt", "ティーシャツ", "シャツ", "ティシャツ", "tしゃつ"];
const CONFIRM_KW = ["確認", "これで", "注文", "ok", "いい", "良い", "はい", "yes", "進める", "確定", "おk", "オーケー", "proceed", "これにする", "決定"];
const REFINE_KW = ["もう少し", "もっと", "変えて", "変更", "修正", "違う", "別の", "やり直", "再生成", "もう一度", "変えたい", "調整", "refine"];
const GREETING_KW = ["こんにちは", "はじめまして", "ハロー", "hello", "hi", "おはよう", "こんばん", "よろしく", "start"];

const SIZE_MAP: [string, string][] = [
  ["dx版", "DX版 (20cm)"],
  ["dx板", "DX版 (20cm)"],
  ["20cm", "DX版 (20cm)"],
  ["ll版", "LL版 (15cm)"],
  ["ll板", "LL版 (15cm)"],
  ["15cm", "LL版 (15cm)"],
  ["l版", "L版 (10cm)"],
  ["l板", "L版 (10cm)"],
  ["10cm", "L版 (10cm)"],
  ["xxl", "XXL"],
  ["2xl", "XXL"],
  ["xl", "XL"],
];

function lower(s: string) {
  return s.toLowerCase();
}

function contains(text: string, kws: string[]): boolean {
  const t = lower(text);
  return kws.some((k) => t.includes(lower(k)));
}

export function extractSize(text: string): string | undefined {
  const t = lower(text);
  for (const [key, val] of SIZE_MAP) {
    if (t.includes(key)) return val;
  }
  // Single-letter sizes for T-shirt — only if they appear as a standalone word
  for (const [sz] of [["s"], ["m"], ["l"]]) {
    const re = new RegExp(`\\b${sz}\\b`, "i");
    if (re.test(text)) {
      return sz.toUpperCase();
    }
  }
  return undefined;
}

export function extractQuantity(text: string): number | undefined {
  const m = text.match(/(\d+)\s*[個枚つ本件]/) ?? text.match(/^(\d+)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 9999) return n;
  }
  return undefined;
}

export function parseIntent(message: string, state: AgentState): ParsedIntent {
  const text = message.trim();

  if (contains(text, GREETING_KW) && (state.step === "welcome" || state.step === "product_select")) {
    return { type: "greeting", rawText: text };
  }

  if (contains(text, ACRYLIC_KW)) {
    return { type: "select_acrylic", productType: "acrylic_standee", rawText: text };
  }
  if (contains(text, TSHIRT_KW)) {
    return { type: "select_tshirt", productType: "tshirt", rawText: text };
  }

  if (contains(text, REFINE_KW)) {
    return { type: "refine", rawText: text };
  }

  if (contains(text, CONFIRM_KW)) {
    return { type: "confirm", rawText: text };
  }

  const size = extractSize(text);
  if (size && (state.step === "mockup_ready" || state.step === "size_selected")) {
    return { type: "select_size", size, rawText: text };
  }

  const qty = extractQuantity(text);
  if (qty && state.step === "size_selected") {
    return { type: "set_quantity", quantity: qty, rawText: text };
  }

  if (
    state.step === "design_describe" ||
    state.step === "design_review" ||
    state.step === "product_select"
  ) {
    return { type: "describe_design", rawText: text };
  }

  return { type: "unknown", rawText: text };
}
