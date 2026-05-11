/**
 * 将 reference_asset_ids 转为 DashScope 可拉取的 HTTPS URL。
 * MVP：支持「已是 URL」、picsum 演示 id；其它 id 抛错，避免把无效地址发给供应商。
 */
export async function resolveReferenceUrls(assetIds: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const raw of assetIds) {
    const id = raw.trim();
    if (!id) throw new Error("ASSET_EMPTY");
    if (/^https:\/\//i.test(id)) {
      out.push(id);
      continue;
    }
    // 演示：picsum:42 → https://picsum.photos/id/42/768/768
    const picsum = /^picsum:(\d+)$/i.exec(id);
    if (picsum) {
      out.push(`https://picsum.photos/id/${picsum[1]}/768/768`);
      continue;
    }
    throw new Error(`ASSET_UNKNOWN:${id}`);
  }
  return out;
}
