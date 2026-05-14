# Pillar 2 — 全息风扇 PoC（占位执行说明）

> 对应 PRD 存档 v1.0 第三章 §3.3；与 Next 演示仓解耦，可在独立目录跑脚本与设备实验。

## 目标（2 周内）

1. 选 1 张偶像照片，调用 **视频生成 API**（如 Kling / Wan，以你们合同为准）生成约 5s 片段。
2. 将片段转为 **POV 旋转帧序列**（设备厂规格表为准）。
3. 在 **Path A 全息风扇** 样机上播放，记录帧率与观感。

## 仓库内占位

- 脚本：`scripts/pillar2-pov-placeholder.mjs` — 无密钥时打印检查清单；有 `KLING_API_KEY`（示例名）时可扩展为真实 `fetch`。
- 不在 `fundamental-originalprint-clone` 引入硬件 SDK，避免污染 Web 依赖。

## 数据流（产品视角）

1. **内容生成服务**（独立脚本或未来微服务）持有厂商 API Key。
2. 输出 **CDN URL** 或文件包 → **设备 App** 拉取播放（与 Pillar 1 订单系统后续可账号级绑定）。

## 下一步

- 法务确认素材授权与出境合规。
- ODM 索取 POV 规格与样机。
