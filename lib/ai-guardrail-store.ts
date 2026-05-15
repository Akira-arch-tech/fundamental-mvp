import fs from "node:fs/promises";
import path from "node:path";

export interface AiGuardrailConfig {
  brand_terms: string[];
  banned_terms: string[];
  review_rules: Array<{
    id: string;
    condition: "contains_banned_term" | "low_confidence" | "high_risk_category";
    action: "block_publish" | "queue_review";
    enabled: boolean;
  }>;
  updated_at: string;
}

const FILE = process.env.VERCEL ? "/tmp/.fdm-ai-guardrails.json" : path.join(process.cwd(), ".fdm-ai-guardrails.json");

const DEFAULT_CONFIG: AiGuardrailConfig = {
  brand_terms: ["FUNDAMENTAL", "推し活", "应援"],
  banned_terms: ["未授权明星肖像", "侵权素材", "违法违规内容"],
  review_rules: [
    { id: "rule_block_banned", condition: "contains_banned_term", action: "block_publish", enabled: true },
    { id: "rule_queue_low_conf", condition: "low_confidence", action: "queue_review", enabled: true },
    { id: "rule_queue_high_risk", condition: "high_risk_category", action: "queue_review", enabled: true },
  ],
  updated_at: new Date().toISOString(),
};

export async function getAiGuardrailConfig(): Promise<AiGuardrailConfig> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AiGuardrailConfig>;
    return {
      brand_terms: Array.isArray(parsed.brand_terms) ? parsed.brand_terms.filter((x): x is string => typeof x === "string") : DEFAULT_CONFIG.brand_terms,
      banned_terms: Array.isArray(parsed.banned_terms) ? parsed.banned_terms.filter((x): x is string => typeof x === "string") : DEFAULT_CONFIG.banned_terms,
      review_rules: Array.isArray(parsed.review_rules)
        ? parsed.review_rules.filter(
            (x): x is AiGuardrailConfig["review_rules"][number] =>
              !!x &&
              typeof x.id === "string" &&
              (x.condition === "contains_banned_term" || x.condition === "low_confidence" || x.condition === "high_risk_category") &&
              (x.action === "block_publish" || x.action === "queue_review") &&
              typeof x.enabled === "boolean",
          )
        : DEFAULT_CONFIG.review_rules,
      updated_at: typeof parsed.updated_at === "string" ? parsed.updated_at : DEFAULT_CONFIG.updated_at,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function setAiGuardrailConfig(input: {
  brand_terms: string[];
  banned_terms: string[];
}): Promise<AiGuardrailConfig> {
  const prev = await getAiGuardrailConfig();
  const next: AiGuardrailConfig = {
    ...prev,
    brand_terms: input.brand_terms.map((x) => x.trim()).filter(Boolean).slice(0, 200),
    banned_terms: input.banned_terms.map((x) => x.trim()).filter(Boolean).slice(0, 200),
    updated_at: new Date().toISOString(),
  };
  await fs.writeFile(FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}
