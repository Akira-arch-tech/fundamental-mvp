import type { GenerationMode, GenerationOutput } from "@/lib/image-generation/types";

/** 可稳定打开的占位图（不依赖外网随机图，避免 CI 不稳定时可再换 data URL） */
function mockImageUrl(seed: string, mode: GenerationMode, index: number): string {
  const q = encodeURIComponent(`${mode}:${seed}:${index}`);
  return `https://placehold.co/768x768/png/333/fff?text=${q}`;
}

export function runMockGeneration(input: {
  generation_id: string;
  mode: GenerationMode;
  prompt: string;
  n?: number;
}): GenerationOutput[] {
  const n = Math.min(Math.max(input.n ?? 1, 1), 2);
  const now = new Date().toISOString();
  const outs: GenerationOutput[] = [];
  for (let i = 0; i < n; i++) {
    outs.push({
      image_url: mockImageUrl(input.generation_id, input.mode, i),
      width: 768,
      height: 768,
      created_at: now,
    });
  }
  return outs;
}
