/** Next.js 15 searchParams → 平面 query 对象 */
export function flattenSearchParams(
  sp: Record<string, string | string[] | undefined>,
): Record<string, string | string[] | undefined> {
  const out: Record<string, string | string[] | undefined> = {};
  for (const [k, v] of Object.entries(sp)) {
    out[k] = Array.isArray(v) ? v[0] : v;
  }
  return out;
}
