"use client";

/** /b 段错误边界：避免子树抛错时退回到「缺少 error 组件」的占位循环 */
export default function BackofficeSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-lg font-bold text-amber-950">管理后台加载出错</h1>
      <p className="mt-2 break-all text-xs text-zinc-600">{error.message}</p>
      <p className="mt-3 text-xs text-zinc-500">
        若刚删过 <code className="rounded bg-zinc-100 px-1">.next</code> 或同时开了多个 dev，请先停掉全部终端里的{" "}
        <code className="rounded bg-zinc-100 px-1">next dev</code>，再执行{" "}
        <code className="rounded bg-zinc-100 px-1">npm run dev:clean</code>。
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-full bg-[#e85c22] px-5 py-2 text-sm font-semibold text-white hover:bg-[#d14f1b]"
      >
        重试
      </button>
    </div>
  );
}
