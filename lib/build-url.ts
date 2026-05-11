export function withQuery(
  path: string,
  params: Record<string, string | number | undefined | null>,
): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    u.set(k, String(v));
  }
  const q = u.toString();
  return q ? `${path}?${q}` : path;
}
