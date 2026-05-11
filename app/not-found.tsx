import Link from "next/link";

/** 全站 404：让 dev/prod 在「找不到路由」时有合法页面，避免出现 missing required error components */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-lg font-bold text-zinc-900">ページが見つかりません</h1>
      <p className="mt-2 text-sm text-zinc-600">URL をご確認ください。</p>
      <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
        <Link href="/favorite" className="text-[#e85c22] underline">
          ストアへ
        </Link>
        <Link href="/b/login" className="text-[#e85c22] underline">
          スタッフログイン
        </Link>
      </div>
    </div>
  );
}
