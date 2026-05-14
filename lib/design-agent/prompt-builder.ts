const JA_EN: Record<string, string> = {
  星: "stars",
  星空: "starry sky",
  宇宙: "space cosmos",
  月: "moon",
  花: "flowers",
  桜: "cherry blossoms",
  海: "ocean waves",
  山: "mountains",
  猫: "cat",
  犬: "dog",
  青: "blue",
  赤: "red",
  黄: "yellow",
  緑: "green",
  紫: "purple",
  ピンク: "pink",
  白: "white",
  黒: "black",
  ゴールド: "gold",
  シルバー: "silver",
  キラキラ: "sparkling glittery",
  かわいい: "cute kawaii",
  かっこいい: "cool stylish",
  可愛い: "cute adorable",
  パステル: "pastel colors",
  ネオン: "neon colors",
  レトロ: "retro vintage style",
  和風: "japanese traditional style",
  アニメ: "anime style",
  ファンタジー: "fantasy",
  ホロライブ: "hololive vtuber fan art",
  すいせい: "blue star comet idol theme",
  推し: "favorite idol oshi fan art",
  応援: "fan support cheering",
  コンサート: "concert live event",
  バンド: "music band",
  デジタル: "digital art",
  ネコ: "cat",
  うさぎ: "rabbit bunny",
  蝶: "butterfly",
  虹: "rainbow",
  炎: "fire flame",
  氷: "ice crystal",
};

function translateKeywords(text: string): string {
  const extras: string[] = [];
  for (const [ja, en] of Object.entries(JA_EN)) {
    if (text.includes(ja)) extras.push(en);
  }
  return extras.join(", ");
}

export function buildAcrylicPrompt(description: string): string {
  const kw = translateKeywords(description);
  const parts = [
    "anime idol merchandise design",
    "fan art illustration",
    kw || description,
    "clean pure white background",
    "optimized for acrylic transparent print",
    "vibrant vivid colors",
    "high quality detailed digital illustration",
    "professional merchandise design",
    "centered composition",
    "no text no watermark",
  ];
  return parts.filter(Boolean).join(", ");
}

export function buildTshirtPrompt(description: string): string {
  const kw = translateKeywords(description);
  const parts = [
    "t-shirt graphic design",
    "flat vector illustration",
    kw || description,
    "isolated on pure white background",
    "bold clean colors",
    "merchandise print art",
    "clean sharp edges",
    "professional apparel design",
    "centered composition",
    "no background texture",
  ];
  return parts.filter(Boolean).join(", ");
}
