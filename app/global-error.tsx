"use client";

/** 根 layout 外の致命エラー用（必須で html/body を含む） */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-zinc-50 px-4 py-20 text-center text-zinc-900 antialiased">
        <h1 className="text-lg font-bold">重大なエラーが発生しました</h1>
        <p className="mt-2 break-all text-xs text-zinc-500">{error.message}</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white"
        >
          再試行
        </button>
      </body>
    </html>
  );
}
