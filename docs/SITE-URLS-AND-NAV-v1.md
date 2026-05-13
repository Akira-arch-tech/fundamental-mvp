# 站点 URL 与全站导航（v1）

本文档记录 FUNDAMENTAL 主域名下**对外可测页面**及**统一顶栏 Tab** 对应关系。下表以示例主域名 `www.fundamental-goods.com` 书写路径；**实际线上**可能是 Vercel 默认域（`*.vercel.app`）或你绑定的自定义域名，请替换表内 origin。

## 当前 Vercel 可访问 origin（生产默认域）

以下为本项目在 Vercel 上**已能打开**的默认域（已对根路径做过连通性检查，返回 **HTTP 200**）：

- **Origin**：`https://fundamental-lops2h979-rickyisfighting-5716s-projects.vercel.app`

将下表中的 `https://www.fundamental-goods.com` 整体替换为上述 origin，即得到当前线上对应地址（例如商店入口：`https://fundamental-lops2h979-rickyisfighting-5716s-projects.vercel.app/shop`）。

**与 Dashboard 对齐**：同一项目可能另有更短的 Production 域（如 `项目名-团队.vercel.app`）或自定义域（如 `www.fundamental-goods.com`）。**以 Vercel → Project `fundamental-mvp` → Settings → Domains 里标为 Production 的域名为准**；若日后默认域变更，请同步更新本节。

## 页面与地址

| 页面 | 地址（示例 origin，请按实际部署替换） |
|------|------|
| 营销首页（日文落地） | `https://www.fundamental-goods.com/` |
| 商店 demo 入口（会跳到推し活顶） | `https://www.fundamental-goods.com/shop` |
| 推し活商品顶 | `https://www.fundamental-goods.com/shop/favorite` |
| 政策页 | `https://www.fundamental-goods.com/policies` |
| 后台登录（中文） | `https://www.fundamental-goods.com/b/login` |

## 统一 Tab 布局

全站 **4 个一级 Tab**（「商店入口」与「推し活」合并为 **「商店」**，链接 `/shop`，高亮整个 `/shop/*`）。以下路由区域顶部展示同一套 Tab（组件：`components/GlobalSiteTabs.tsx`）：

- 营销首页 `/`
- 日文落地子站 `/ja`（`(landing)`）
- 买家店 `/shop/*`
- 政策 `/policies`
- 管理后台 `/b/*`

Tab 为**站点分区导航**，与店内日语导航（商品一覧 / カート 等）并存：店内第二行为店铺业务导航。

## 高亮规则（实现摘要）

| Tab | 链接 | 当前页高亮条件 |
|-----|------|----------------|
| 首页 | `/` | 路径为 `/` 或 `/ja` |
| 商店 | `/shop` | 路径以 `/shop` 开头（含 `/shop` 重定向页与 `/shop/favorite` 等） |
| 政策 | `/policies` | 路径以 `/policies` 开头 |
| 后台 | `/b/login` | 路径以 `/b` 开头 |

## 兼容说明

- 旧路径 `/favorite` 已迁移为 **`/shop/favorite`**；书签与对外话术请使用 `/shop` 前缀。
- Stripe Checkout 成功/取消回跳使用 **`/shop/checkout/...`**（见 `lib/stripe-fulfillment.ts`）。

## 修订记录

- **v1**：合并商店至 `/shop` 后建立本文档；增加全站 Tab。
- **v1.1**：全站 Tab 将「商店入口 + 推し活」合并为单一「商店」Tab。
- **v1.2**：标明示例域名为占位；线上以 Vercel 默认域或自定义域为准。
- **v1.3**：写入当前可访问的 Vercel 默认 origin；注明以 Dashboard Domains 为准。
