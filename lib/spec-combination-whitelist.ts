import type { CartSpecSelection } from "@/lib/types";

type SpecCombo = Record<string, string>;

interface ProductWhitelistRule {
  spec_ids: string[];
  allowed_combinations: SpecCombo[];
}

type SpecSelectionMap = Record<string, string | undefined>;

/**
 * v2: 规格组合白名单（组合表）
 * - key: product_id
 * - spec_ids: 参与合法性校验的规格
 * - allowed_combinations: 允许下单的 value_id 组合
 */
export const PRODUCT_SPEC_COMBINATION_WHITELIST: Record<string, ProductWhitelistRule> = {
  p1: {
    spec_ids: ["size", "base"],
    allowed_combinations: [
      { size: "s", base: "slit" },
      { size: "m", base: "slit" },
      { size: "m", base: "round" },
      { size: "l", base: "slit" },
    ],
  },
};

export function isSpecCombinationAllowed(
  productId: string,
  selections: CartSpecSelection[],
): boolean {
  const selectedMap = Object.fromEntries(selections.map((s) => [s.spec_id, s.value_id]));
  return isSpecCombinationAllowedByMap(productId, selectedMap);
}

function hasCompatibleCombination(productId: string, selectedMap: SpecSelectionMap): boolean {
  const rule = PRODUCT_SPEC_COMBINATION_WHITELIST[productId];
  if (!rule) return true;
  return rule.allowed_combinations.some((combo) =>
    rule.spec_ids.every((specId) => {
      const selectedValue = selectedMap[specId];
      if (!selectedValue) return true;
      return selectedValue === combo[specId];
    }),
  );
}

export function isSpecCombinationAllowedByMap(
  productId: string,
  selectedMap: SpecSelectionMap,
): boolean {
  const rule = PRODUCT_SPEC_COMBINATION_WHITELIST[productId];
  if (!rule) return true;
  if (rule.spec_ids.some((specId) => !selectedMap[specId])) return false;
  return hasCompatibleCombination(productId, selectedMap);
}

export function canSelectSpecValue(
  productId: string,
  selectedMap: SpecSelectionMap,
  targetSpecId: string,
  targetValueId: string,
): boolean {
  const next = { ...selectedMap, [targetSpecId]: targetValueId };
  return hasCompatibleCombination(productId, next);
}

