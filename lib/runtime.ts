/** 是否启用 PostgreSQL（W11）。未设置时回退到本地 JSON 文件 + Mock 登录，便于无 Docker 跑通验收脚本。 */
export function isDatabaseEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}
