/**
 * 平台政策文档注册表：新增政策时在此追加一条，并在 content/policies/ 下增加对应
 * `{fileBase}.{zh|en|ja|ko}.md` 文件。
 */

export type PolicyLocale = "zh" | "en" | "ja" | "ko";

export const POLICY_LOCALES: { id: PolicyLocale; label: string }[] = [
  { id: "zh", label: "中文" },
  { id: "en", label: "English" },
  { id: "ja", label: "日本語" },
  { id: "ko", label: "한국어" },
];

export const POLICIES_HUB_TITLE: Record<PolicyLocale, string> = {
  zh: "平台政策与规则",
  en: "Platform Policies & Rules",
  ja: "プラットフォームの政策・規則",
  ko: "플랫폼 정책 및 규정",
};

export const POLICIES_HUB_SUBTITLE: Record<PolicyLocale, string> = {
  zh: "以下文档将随产品与合规要求更新；请以页面所示版本为准。",
  en: "Documents below are updated as the product and compliance requirements evolve; the on-page version prevails.",
  ja: "以下の文書は製品・コンプライアンス要件に応じて更新されます。ページ上の版を優先します。",
  ko: "아래 문서는 제품 및 컴플라이언스 요구에 따라 갱신됩니다. 페이지에 표시된 버전을 기준으로 합니다.",
};

export interface PolicyDocumentMeta {
  id: string;
  /** content/policies/{fileBase}.{locale}.md */
  fileBase: string;
  titles: Record<PolicyLocale, string>;
  summaries: Record<PolicyLocale, string>;
  version: string;
  updated: string;
}

export const POLICY_DOCUMENTS: PolicyDocumentMeta[] = [
  {
    id: "aigc-image-user-notice",
    fileBase: "aigc-image-user-notice",
    titles: {
      zh: "AI 生图与用户图片处理说明",
      en: "AI Image Generation and User Content Notice",
      ja: "AI 画像生成およびユーザー画像の取扱い",
      ko: "AI 이미지 생성 및 사용자 이미지 처리 안내",
    },
    summaries: {
      zh: "说明参考图、候选图 10 分钟确认窗、确认后履约及发货后删除等规则。",
      en: "Reference images, 10-minute confirmation window for candidates, fulfillment use, and post-shipment deletion.",
      ja: "参照画像、候補画像の10分確認、採用後の履行、発送後削除など。",
      ko: "참조 이미지, 후보 10분 확인, 채택 후 이행, 발송 후 삭제 등.",
    },
    version: "1.0",
    updated: "2026-05-12",
  },
];

export const DEFAULT_POLICY_DOC_ID = POLICY_DOCUMENTS[0]!.id;

export function isPolicyLocale(v: string | undefined): v is PolicyLocale {
  return v === "zh" || v === "en" || v === "ja" || v === "ko";
}

export function getPolicyDocMeta(id: string): PolicyDocumentMeta | undefined {
  return POLICY_DOCUMENTS.find((d) => d.id === id);
}
