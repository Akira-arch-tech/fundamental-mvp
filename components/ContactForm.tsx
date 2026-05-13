"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

type FormValues = {
  name: string;
  email: string;
  product: string;
  quantity: string;
  message: string;
  agree: boolean;
};

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      product: "keyring",
      quantity: "1-10",
      message: "",
      agree: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setSubmitError(json.error ?? "送信に失敗しました。");
      return;
    }
    setSubmitted(true);
    reset({
      name: "",
      email: "",
      product: "keyring",
      quantity: "1-10",
      message: "",
      agree: false,
    });
  };

  if (submitted) {
    return (
      <div
        className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm"
        role="status"
      >
        <p className="text-lg font-medium text-[#e85c22]">
          ありがとうございます！24時間以内にご連絡いたします。
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-8 text-sm text-zinc-600 underline decoration-zinc-300 underline-offset-4 transition hover:text-[#e85c22]"
        >
          別のお問い合わせを送る
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-xl space-y-6">
      <div>
        <label htmlFor="name" className="mb-2 block text-xs font-medium text-zinc-700">
          お名前 <span className="text-[#e85c22]">*</span>
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none ring-[#e85c22]/20 placeholder:text-zinc-400 focus:border-[#e85c22] focus:ring-2"
          placeholder="山田 太郎"
          {...register("name", { required: "お名前を入力してください" })}
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="email" className="mb-2 block text-xs font-medium text-zinc-700">
          メールアドレス <span className="text-[#e85c22]">*</span>
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none ring-[#e85c22]/20 placeholder:text-zinc-400 focus:border-[#e85c22] focus:ring-2"
          placeholder="example@email.com"
          {...register("email", { required: "メールアドレスを入力してください" })}
        />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="product" className="mb-2 block text-xs font-medium text-zinc-700">
            希望商品 <span className="text-[#e85c22]">*</span>
          </label>
          <select
            id="product"
            className="w-full appearance-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-[#e85c22] focus:ring-2 focus:ring-[#e85c22]/20"
            {...register("product", { required: true })}
          >
            <option value="keyring">アクリルキーホルダー</option>
            <option value="stand">アクリルスタンド</option>
            <option value="panel">アクリルパネル</option>
            <option value="badge">缶バッジ</option>
            <option value="sticker">ホログラムステッカー</option>
            <option value="other">その他・カスタム</option>
          </select>
        </div>
        <div>
          <label htmlFor="quantity" className="mb-2 block text-xs font-medium text-zinc-700">
            希望数量 <span className="text-[#e85c22]">*</span>
          </label>
          <select
            id="quantity"
            className="w-full appearance-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-[#e85c22] focus:ring-2 focus:ring-[#e85c22]/20"
            {...register("quantity", { required: true })}
          >
            <option value="1-10">1〜10個</option>
            <option value="11-50">11〜50個</option>
            <option value="51-200">51〜200個</option>
            <option value="200+">200個以上</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="message" className="mb-2 block text-xs font-medium text-zinc-700">
          ご要望・詳細
        </label>
        <textarea
          id="message"
          rows={5}
          className="w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#e85c22] focus:ring-2 focus:ring-[#e85c22]/20"
          placeholder="推しの名前、カラーイメージ、参考画像URLなど"
          {...register("message")}
        />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-zinc-700">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-zinc-400 text-[#e85c22] focus:ring-[#e85c22]/40"
            {...register("agree", { required: "ご利用ルール・免責事項への同意が必要です。" })}
          />
          <span>
            ご利用ルール・免責事項（送料、納期、著作権責任）を読み、内容に同意します。
          </span>
        </label>
        {errors.agree && <p className="mt-2 text-xs text-red-600">{errors.agree.message}</p>}
      </div>

      {submitError ? (
        <p className="text-center text-sm text-red-600" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#e85c22] py-4 text-sm font-semibold tracking-widest text-white shadow-sm transition hover:bg-[#d14f1b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "送信中…" : "お見積もりを依頼する →"}
        </button>
      </div>
    </form>
  );
}
