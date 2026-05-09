"use client";

/**
 * 根 segment 错误边界：避免 dev 在渲染失败时退回到不存在的 `pages/_error` 而出现
 * 「missing required error components, refreshing...」占位页。
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-lg font-bold text-zinc-900">読み込みに失敗しました</h1>
      <p className="mt-2 break-all text-xs text-zinc-500">{error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        再試行
      </button>
    </div>
  );
}
