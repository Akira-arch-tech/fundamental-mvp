"use client";

import { useState } from "react";

const productOptions = [
  { value: "acrylic_keyring", label: "アクリルキーホルダー" },
  { value: "acrylic_stand", label: "アクリルスタンド" },
  { value: "acrylic_charm", label: "アクリルチャーム / バッジ風" },
  { value: "other", label: "その他（本文で詳細）" },
] as const;

export function InquiryForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      company: String(fd.get("company") ?? "").trim(),
      product_type: String(fd.get("product_type") ?? ""),
      quantity: String(fd.get("quantity") ?? "").trim(),
      desired_date: String(fd.get("desired_date") ?? "").trim(),
      message: String(fd.get("message") ?? "").trim(),
      locale: "ja",
      source: "fundamental-landing-ja",
    };

    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.message ?? "送信に失敗しました。時間をおいて再度お試しください。");
        return;
      }
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setErrorMessage("ネットワークエラーが発生しました。");
    }
  }

  if (status === "success") {
    return (
      <div
        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center text-emerald-900"
        role="status"
      >
        <p className="text-lg font-semibold">お問い合わせを受け付けました</p>
        <p className="mt-2 text-sm leading-relaxed">
          内容を確認のうえ、担当よりメールでご連絡いたします（通常 1–2 営業日以内）。
        </p>
        <button
          type="button"
          className="mt-6 text-sm font-medium text-[#e85c22] underline underline-offset-4 hover:text-[#c94a1a]"
          onClick={() => setStatus("idle")}
        >
          続けて別のお問い合わせを送る
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-zinc-800">
            お名前 <span className="text-red-600">*</span>
          </span>
          <input
            name="name"
            required
            autoComplete="name"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none ring-[#e85c22]/30 focus:border-[#e85c22] focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-zinc-800">
            メールアドレス <span className="text-red-600">*</span>
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none ring-[#e85c22]/30 focus:border-[#e85c22] focus:ring-2"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium text-zinc-800">会社名・団体名（任意）</span>
        <input
          name="company"
          autoComplete="organization"
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none ring-[#e85c22]/30 focus:border-[#e85c22] focus:ring-2"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-zinc-800">ご希望の製品タイプ</span>
          <select
            name="product_type"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none ring-[#e85c22]/30 focus:border-[#e85c22] focus:ring-2"
            defaultValue="acrylic_keyring"
          >
            {productOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-zinc-800">目安数量（任意）</span>
          <input
            name="quantity"
            inputMode="numeric"
            placeholder="例: 50"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none ring-[#e85c22]/30 focus:border-[#e85c22] focus:ring-2"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium text-zinc-800">希望納期・イベント日（任意）</span>
        <input
          name="desired_date"
          placeholder="例: 2026-07-20 ライブ前"
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none ring-[#e85c22]/30 focus:border-[#e85c22] focus:ring-2"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-zinc-800">
          ご用件・デザインの概要 <span className="text-red-600">*</span>
        </span>
        <textarea
          name="message"
          required
          rows={5}
          placeholder="サイズの希望、印刷方法、納品形態（個別opp / まとめ配送 等）をご記入ください。"
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none ring-[#e85c22]/30 focus:border-[#e85c22] focus:ring-2"
        />
      </label>

      {status === "error" && errorMessage ? (
        <p className="text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-zinc-500">
          送信により、お問い合わせ内容の取り扱いに同意したものとみなします。返信は担当よりメールで行います。
        </p>
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#e85c22] px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#d14f1c] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "loading" ? "送信中…" : "送信する"}
        </button>
      </div>
    </form>
  );
}
