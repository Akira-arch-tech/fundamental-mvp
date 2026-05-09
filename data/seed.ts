import type {
  Category,
  OshiColor,
  ProductDetail,
  ReviewSnippet,
  TopicPayload,
} from "@/lib/types";

export const OSHI_TOPIC_ID = "oshi";

export const oshiColors: OshiColor[] = [
  { code: "pink", name: "ピンク", hex: "#ec4899" },
  { code: "blue", name: "ブルー", hex: "#3b82f6" },
  { code: "white", name: "ホワイト", hex: "#f4f4f5" },
  { code: "black", name: "ブラック", hex: "#18181b" },
  { code: "yellow", name: "イエロー", hex: "#eab308" },
];

export const categories: Category[] = [
  { id: "acrylic", name: "アクリルグッズ" },
  { id: "acrylic-plate", name: "アクリルプレート" },
  { id: "acrylic-frame", name: "アクリルフレーム" },
  { id: "acrylic-stand", name: "アクリルスタンド" },
  { id: "sticker", name: "シール・ステッカー" },
  { id: "badge", name: "缶バッジ" },
  { id: "towel", name: "タオル" },
  { id: "tote", name: "トートバッグ" },
  { id: "keyholder", name: "キーホルダー" },
];

const skuImage = {
  p1: "/products/p1-acrylic-plate.svg",
  p2: "/products/p2-acrylic-keyholder.svg",
  p3: "/products/p3-acrylic-frame.svg",
  p4: "/products/p4-acrylic-stand.svg",
  p5: "/products/p5-cheki-holder.svg",
  p6: "/products/p6-muffler-towel.svg",
  hero: "/products/hero-oshi.svg",
} as const;

export const products: ProductDetail[] = [
  {
    product_id: "p1",
    slug: "free-acrylic-stand-clear",
    title:
      "アクリルプレート（次世代マジックプレート）厚さ3.1mm｜DIYキーホルダー・両面印刷",
    cover_url: skuImage.p1,
    price_from: 880,
    badge: "推し活",
    lead_time_days: 5,
    min_qty: 1,
    category_ids: ["acrylic", "acrylic-plate"],
    oshi_color_tags: ["pink", "blue"],
    popularity: 98,
    created_at: "2026-03-01",
    description:
      "看板SKU。小口〜大口まで同一エディタで作成でき、自動切り抜きを想定したワークフローに対応。",
    source_channel: "custom_gifts",
    source_category_path: "オリジナル > アクリル",
    gallery: [skuImage.p1, skuImage.p1, skuImage.p1],
    spec_schema: [
      {
        id: "size",
        label: "サイズ",
        values: [
          { id: "s", label: "S（約10cm）", price_delta: 0 },
          { id: "m", label: "M（約15cm）", price_delta: 220, sku_code: "7SG-ACR-PLATE-31-M" },
          { id: "l", label: "L（約20cm）", price_delta: 440, sku_code: "7SG-ACR-PLATE-31-L" },
        ],
      },
      {
        id: "base",
        label: "台座",
        values: [
          { id: "slit", label: "スリット台座", price_delta: 0 },
          { id: "round", label: "丸型台座", price_delta: 110 },
        ],
      },
    ],
    pricing_rules: [
      { min_qty: 1, unit_price: 880, label: "1〜9点" },
      { min_qty: 10, unit_price: 720, label: "10点〜" },
      { min_qty: 50, unit_price: 590, label: "50点〜" },
    ],
    lead_time_rules: [
      { label: "標準", days: 5 },
      { label: "繁忙期（目安）", days: 8, condition: "イベント前後" },
    ],
    design_template_id: "tmpl_acrylic_free",
    faq: [
      { q: "データ形式は？", a: "PNG / JPEG 推奨。デモではアップロード検証のみ別ページで対応予定。" },
      { q: "最低ロットは？", a: "本商品は 1 点から（シード値）。" },
    ],
  },
  {
    product_id: "p2",
    slug: "photo-keyholder-4cut",
    title: "アクキープレート｜自由デザイン・両面印刷・3.1mm厚",
    cover_url: skuImage.p2,
    price_from: 660,
    lead_time_days: 4,
    min_qty: 1,
    category_ids: ["keyholder", "acrylic", "acrylic-plate"],
    oshi_color_tags: ["white", "pink"],
    popularity: 95,
    created_at: "2026-02-20",
    description:
      "推し活向けの定番アクキー。単品ギフトからイベント配布のまとめ買いまで対応。",
    source_channel: "custom_gifts",
    source_category_path: "オリジナル > アクリル",
    gallery: [skuImage.p2, skuImage.p2],
    spec_schema: [
      {
        id: "frame",
        label: "フレーム",
        values: [
          { id: "clear", label: "クリア", price_delta: 0 },
          { id: "glitter", label: "ラメ入り", price_delta: 150, sku_code: "7SG-AKK-PLATE-GLITTER" },
        ],
      },
    ],
    pricing_rules: [
      { min_qty: 1, unit_price: 660 },
      { min_qty: 10, unit_price: 540 },
    ],
    lead_time_rules: [{ label: "標準", days: 4 }],
    design_template_id: "tmpl_photo_4cut",
    faq: [{ q: "何枚入り？", a: "デモ用に仕様は未固定。商品データの spec_schema に沿って拡張できます。" }],
  },
  {
    product_id: "p3",
    slug: "free-cut-sticker-matte",
    title: "アクリルフレーム｜1.7mm（シールなし）シェイカーおすすめ",
    cover_url: skuImage.p3,
    price_from: 440,
    badge: "人気",
    lead_time_days: 3,
    min_qty: 1,
    category_ids: ["acrylic", "acrylic-frame"],
    oshi_color_tags: ["blue", "black"],
    popularity: 92,
    created_at: "2026-04-01",
    description: "クリアなフレームSKU。ディスプレイや推しの卓上展示に。",
    source_channel: "custom_gifts",
    source_category_path: "オリジナル > アクリル",
    gallery: [skuImage.p3],
    spec_schema: [
      {
        id: "laminate",
        label: "加工",
        values: [
          { id: "matte", label: "マット", price_delta: 0 },
          { id: "gloss", label: "グロス", price_delta: 0 },
        ],
      },
    ],
    pricing_rules: [{ min_qty: 1, unit_price: 440 }],
    lead_time_rules: [{ label: "標準", days: 3 }],
    design_template_id: "tmpl_sticker_free",
    faq: [],
  },
  {
    product_id: "p4",
    slug: "square-tote-scene",
    title: "アクリルスタンド（台座付き）｜厚さ4mm",
    cover_url: skuImage.p4,
    price_from: 858,
    lead_time_days: 6,
    min_qty: 1,
    category_ids: ["acrylic", "acrylic-stand"],
    oshi_color_tags: ["pink", "yellow", "black"],
    popularity: 88,
    created_at: "2026-01-15",
    description: "人気のスタンド系。単品の推し立てからイベント展示のまとめ買いまで。",
    source_channel: "custom_gifts",
    source_category_path: "オリジナル > アクリル",
    gallery: [skuImage.p4, skuImage.p4],
    spec_schema: [
      {
        id: "body_color",
        label: "台座タイプ",
        values: [
          { id: "nat", label: "透明台座", price_delta: 0, sku_code: "7SG-ACS-BASE-CLEAR" },
          { id: "blk", label: "白台座", price_delta: 0, sku_code: "7SG-ACS-BASE-WHITE" },
        ],
      },
    ],
    pricing_rules: [
      { min_qty: 1, unit_price: 858 },
      { min_qty: 20, unit_price: 720 },
    ],
    lead_time_rules: [{ label: "標準", days: 6 }],
    design_template_id: "tmpl_tote_square",
    faq: [],
  },
  {
    product_id: "p5",
    slug: "cheki-holder-pvc",
    title: "チェキホルダー",
    cover_url: skuImage.p5,
    price_from: 550,
    lead_time_days: 4,
    min_qty: 1,
    category_ids: ["keyholder"],
    oshi_color_tags: ["white", "blue"],
    popularity: 90,
    created_at: "2026-03-10",
    description: "チェキを可愛く持ち運び。硬質ケースとの併用想定。",
    gallery: [skuImage.p5],
    spec_schema: [],
    pricing_rules: [{ min_qty: 1, unit_price: 550 }],
    lead_time_rules: [{ label: "標準", days: 4 }],
    design_template_id: "tmpl_cheki",
    faq: [],
  },
  {
    product_id: "p6",
    slug: "muffler-towel-overprint",
    title: "マフラータオル（全面印刷）",
    cover_url: skuImage.p6,
    price_from: 1188,
    lead_time_days: 7,
    min_qty: 1,
    category_ids: ["towel"],
    oshi_color_tags: ["white"],
    popularity: 75,
    created_at: "2025-12-01",
    description: "全面フルカラー。ライブ・スポーツ観戦の応援タオル想定。",
    gallery: [skuImage.p6],
    spec_schema: [],
    pricing_rules: [{ min_qty: 1, unit_price: 1188 }],
    lead_time_rules: [{ label: "標準", days: 7 }],
    design_template_id: "tmpl_towel",
    faq: [],
  },
];

export const topicOshi: TopicPayload = {
  topic_id: OSHI_TOPIC_ID,
  topic_title: "オリジナル推し活グッズ",
  topic_subtitle:
    "オリジナル推し活グッズを、小口〜大口まで同一カタログ・同一デザイン機能でご提供するストアのデモです。",
  hero_banners: [
    { image_url: skuImage.hero, alt: "推し活バナー", href: "/products" },
  ],
  recommended_categories: [
    { id: "keyholder", name: "フォトキーホルダー", icon: "📷" },
    { id: "acrylic-plate", name: "アクリルプレート", icon: "🧩" },
    { id: "acrylic-stand", name: "アクリルスタンド", icon: "✨" },
    { id: "acrylic-frame", name: "アクリルフレーム", icon: "🪟" },
  ],
  oshi_colors: oshiColors,
  sort_options: [
    { key: "popularity", label: "人気順" },
    { key: "price_asc", label: "価格の安い順" },
    { key: "price_desc", label: "価格の高い順" },
    { key: "new", label: "新着順" },
    { key: "lead_time", label: "納期の早い順" },
  ],
};

export const pickupReviews: ReviewSnippet[] = [
  {
    id: "r1",
    region: "大阪府",
    gender: "女性",
    month: "11月",
    excerpt: "推し活イベントにぴったり。発送も思ったより早く助かりました。",
  },
  {
    id: "r2",
    region: "東京都",
    gender: "女性",
    month: "1月",
    excerpt: "印刷がとても綺麗！また利用します。",
  },
  {
    id: "r3",
    region: "京都府",
    gender: "女性",
    month: "12月",
    excerpt: "フレームに合わせてカットされていて満足です。",
  },
];

export function getProductBySlug(slug: string): ProductDetail | undefined {
  return products.find((p) => p.slug === slug);
}
