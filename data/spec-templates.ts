/**
 * ToB 规格模板种子（PRD v1.0 第二章）— 演示数据，供后台只读展示；后续可接 DB。
 */
export type SpecTemplateCategory = "acrylic_stand" | "badge" | "towel";

export interface SpecTemplateRow {
  id: string;
  category: SpecTemplateCategory;
  name_ja: string;
  /** 行业标准要点 */
  industry_notes: string[];
  /** 常见尺寸 / 模具枚举（展示用） */
  size_options_mm: number[];
}

export const SPEC_TEMPLATE_SEED: SpecTemplateRow[] = [
  {
    id: "tpl_acrylic_free_sml",
    category: "acrylic_stand",
    name_ja: "フリー型アクスタ（S/M/L）",
    industry_notes: ["厚み 3〜5mm", "透明 / ラメ底", "自由切断＋台座"],
    size_options_mm: [80, 120, 160],
  },
  {
    id: "tpl_badge_58",
    category: "badge",
    name_ja: "缶バッジ（業界標準 58mm）",
    industry_notes: ["32 / 44 / 57 / 76mm ラインのうち MVP は 58mm 推奨", "片面 / ミラー / ホロ"],
    size_options_mm: [32, 44, 58, 76],
  },
  {
    id: "tpl_towel_full",
    category: "towel",
    name_ja: "全面印刷マフラータオル",
    industry_notes: ["20×110cm 標準", "昇華転写フルカラー"],
    size_options_mm: [200, 1100],
  },
];
