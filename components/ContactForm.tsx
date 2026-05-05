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
        className="rounded-2xl border border-gold/40 bg-white/[0.03] px-6 py-12 text-center"
        role="status"
      >
        <p className="text-lg font-medium tracking-wide text-gold">
          ありがとうございます！24時間以内にご連絡いたします。
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-8 text-sm text-white/60 underline decoration-white/30 underline-offset-4 transition hover:text-white"
        >
          別のお問い合わせを送る
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-xl space-y-6">
      <div>
        <label htmlFor="name" className="mb-2 block text-xs font-medium tracking-wider text-white/70">
          お名前 <span className="text-gold">*</span>
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none ring-gold/30 placeholder:text-white/25 focus:border-gold/50 focus:ring-2"
          placeholder="山田 太郎"
          {...register("name", { required: "お名前を入力してください" })}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="mb-2 block text-xs font-medium tracking-wider text-white/70">
          メールアドレス <span className="text-gold">*</span>
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none ring-gold/30 placeholder:text-white/25 focus:border-gold/50 focus:ring-2"
          placeholder="example@email.com"
          {...register("email", { required: "メールアドレスを入力してください" })}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="product"
            className="mb-2 block text-xs font-medium tracking-wider text-white/70"
          >
            希望商品 <span className="text-gold">*</span>
          </label>
          <select
            id="product"
            className="w-full appearance-none rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none ring-gold/30 focus:border-gold/50 focus:ring-2"
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
          <label
            htmlFor="quantity"
            className="mb-2 block text-xs font-medium tracking-wider text-white/70"
          >
            希望数量 <span className="text-gold">*</span>
          </label>
          <select
            id="quantity"
            className="w-full appearance-none rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none ring-gold/30 focus:border-gold/50 focus:ring-2"
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
        <label htmlFor="message" className="mb-2 block text-xs font-medium tracking-wider text-white/70">
          ご要望・詳細
        </label>
        <textarea
          id="message"
          rows={5}
          className="w-full resize-y rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none ring-gold/30 placeholder:text-white/30 focus:border-gold/50 focus:ring-2"
          placeholder="推しの名前、カラーイメージ、参考画像URLなど"
          {...register("message")}
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-white/75">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-white/30 bg-transparent text-gold focus:ring-gold/60"
            {...register("agree", { required: "ご利用ルール・免責事項への同意が必要です。" })}
          />
          <span>
            ご利用ルール・免責事項（送料、納期、著作権責任）を読み、内容に同意します。
          </span>
        </label>
        {errors.agree && <p className="mt-2 text-xs text-red-400">{errors.agree.message}</p>}
      </div>

      {submitError ? (
        <p className="text-center text-sm text-red-400" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-gold bg-gold/10 py-4 text-sm font-semibold tracking-widest text-gold transition hover:bg-gold hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "送信中…" : "お見積もりを依頼する →"}
        </button>
      </div>
    </form>
  );
}
