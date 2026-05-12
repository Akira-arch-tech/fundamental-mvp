import fs from "node:fs";
import path from "node:path";
import type { PolicyLocale } from "@/lib/policies-registry";
import { getPolicyDocMeta } from "@/lib/policies-registry";

export function loadPolicyMarkdown(docId: string, locale: PolicyLocale): string {
  const doc = getPolicyDocMeta(docId);
  if (!doc) {
    throw new Error(`Unknown policy document: ${docId}`);
  }
  const filePath = path.join(
    process.cwd(),
    "content",
    "policies",
    `${doc.fileBase}.${locale}.md`,
  );
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing policy file: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8");
}
