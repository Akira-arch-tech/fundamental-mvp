/**
 * 在启动 next dev 前校验当前 cwd 是否为「含 app/b/orders 的 Next 根」，
 * 避免在仓库父目录误跑 dev 导致 /b/orders 404、以及 .next 与真实项目错位。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const marker = path.join(root, "app", "b", "orders", "page.tsx");

if (!fs.existsSync(marker)) {
  console.error(
    "\n[assert-next-app-root] 未找到 app/b/orders/page.tsx。\n" +
      `  当前目录: ${process.cwd()}\n` +
      "  请在本仓库的 Next 根目录执行（含 package.json 与 app/ 的那一层）：\n" +
      "    FUNDAMENTAL/fundamental-originalprint-clone\n",
  );
  process.exit(1);
}

if (process.cwd() !== root) {
  console.error(
    "\n[assert-next-app-root] 工作目录不是 Next 项目根目录。\n" +
      `  当前 cwd: ${process.cwd()}\n` +
      `  期望 cwd: ${root}\n` +
      "  请先: cd \"" + root + "\"\n" +
      "  再执行: npm run dev  或  npm run dev:clean\n",
  );
  process.exit(1);
}
