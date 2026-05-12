import Link from "next/link";
import { StoreSettingsClient } from "@/components/StoreSettingsClient";

export default function BackofficeStoreSettingsPage() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900/75">PRD §8.1</p>
          <h1 className="text-xl font-bold text-zinc-900">店铺与前台展示</h1>
          <p className="mt-1 text-sm text-zinc-600">
            名称、主推语言（ja/ko）、币种展示与统一定价模板。演示数据存本地 JSON，非多租户生产库。
          </p>
        </div>
        <Link href="/b/orders" className="text-sm font-medium text-[#c2410c] hover:underline">
          ← 订单工作台
        </Link>
      </div>
      <StoreSettingsClient />
    </div>
  );
}
