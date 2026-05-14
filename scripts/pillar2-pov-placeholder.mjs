#!/usr/bin/env node
/**
 * Pillar 2 PoC 占位：无 KLING_API_KEY（或等价变量）时打印清单；有密钥时可在此扩展为真实 HTTP 调用。
 */
const key = process.env.KLING_API_KEY?.trim() || process.env.WAN_VIDEO_API_KEY?.trim();
if (!key) {
  console.log("[pillar2-pov] 未配置 KLING_API_KEY / WAN_VIDEO_API_KEY — 跳过网络调用。");
  console.log("[pillar2-pov] 请阅读 docs/pillar2-pov-poc.md 并按清单执行 PoC。");
  process.exit(0);
}
console.log("[pillar2-pov] 已检测到密钥占位；请在本脚本内接入厂商 SDK/REST 后再试。");
process.exit(0);
