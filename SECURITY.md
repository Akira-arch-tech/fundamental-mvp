# Security

本仓库为**公开**代码库：请勿提交真实密钥、带密码的数据库连接串、客户隐私数据或内网-only 地址。

- 环境变量模板见根目录 `.env.example`（占位符，非生产值）。
- 生产密钥仅放在 **Vercel / Neon 等托管方控制台** 的环境变量中，不要写进代码或 Issue 评论。

若发现漏洞或曾误提交敏感信息：请使用 GitHub **Security → Private vulnerability reporting（私下报告）**，勿在公开 Issue 中披露细节。若密钥已暴露，**轮换**该密钥并在托管平台作废旧值。

**说明**：Git 提交历史中的 **作者邮箱** 等元数据会随仓库公开；若需隐藏个人邮箱，可在 GitHub 账户设置中启用 [noreply 邮箱](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-email-preferences/setting-your-commit-email-address)，新提交将使用匿名地址；历史记录如需彻底改写需自行 `git filter-repo` 等（会破坏已有 clone 的 SHA，慎用）。
