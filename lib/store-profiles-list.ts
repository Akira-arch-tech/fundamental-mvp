import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_STORE_SETTINGS } from "@/lib/storefront-constants";
import { storeSettingsPathForSlug } from "@/lib/store-profile";

const PREFIX = ".fdm-store-settings.";
const SUFFIX = ".json";

/** 列出已存在的店舗 profile（default 始终可用） */
export async function listExistingStoreProfileSlugs(): Promise<string[]> {
  const dir = process.cwd();
  const names = await fs.readdir(dir).catch(() => [] as string[]);
  const out = new Set<string>(["default"]);
  for (const n of names) {
    if (n === ".fdm-store-settings.json") {
      out.add("default");
      continue;
    }
    if (n.startsWith(PREFIX) && n.endsWith(SUFFIX)) {
      const slug = n.slice(PREFIX.length, -SUFFIX.length);
      if (slug) out.add(slug);
    }
  }
  return [...out].sort();
}

export async function cloneStoreProfileToSlug(sourceSlug: string, targetSlug: string): Promise<void> {
  const srcPath = storeSettingsPathForSlug(sourceSlug === "default" ? "default" : sourceSlug);
  const dstPath = storeSettingsPathForSlug(targetSlug);
  const raw = await fs.readFile(srcPath, "utf-8").catch(() => JSON.stringify(DEFAULT_STORE_SETTINGS, null, 2));
  await fs.writeFile(dstPath, raw, "utf-8");
}
