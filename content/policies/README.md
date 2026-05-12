# 平台政策 Markdown 源文件

- 每种政策一套文件：`{fileBase}.zh.md`、`.en.md`、`.ja.md`、`.ko.md`。
- 在 [`lib/policies-registry.ts`](../../lib/policies-registry.ts) 的 `POLICY_DOCUMENTS` 中注册后，才会出现在官网 `/policies` 目录与正文中。
- 更新已有政策：直接改对应语言的 `.md`；若标题/摘要/版本变更，同步改 registry 中该条的 `titles` / `summaries` / `version` / `updated`。
