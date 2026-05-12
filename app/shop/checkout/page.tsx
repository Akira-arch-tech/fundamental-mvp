import Link from "next/link";
import { getCustomization } from "@/lib/customizations-store";
import { products } from "@/data/seed";
import { CheckoutClient } from "@/components/CheckoutClient";
import { isStripeConfigured } from "@/lib/stripe-env";
import { getStoreSettings } from "@/lib/store-settings";
import { storePath } from "@/lib/storefront-constants";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const customizationId = typeof sp.customization_id === "string" ? sp.customization_id : "";
  if (!customizationId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-zinc-900">チェックアウト</h1>
        <p className="mt-3 text-sm text-zinc-600">
          デザインIDがありません。商品ページからデザインを作成し、保存してからお進みください。
        </p>
        <Link href={storePath("/products")} className="mt-5 inline-block text-sm text-[#e85c22] hover:underline">
          商品一覧へ
        </Link>
      </div>
    );
  }

  const customization = await getCustomization(customizationId);
  if (!customization) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-zinc-900">チェックアウト</h1>
        <p className="mt-3 text-sm text-red-600">
          customization が見つかりません。もう一度保存し直してください。
        </p>
        <Link href={storePath("/products")} className="mt-5 inline-block text-sm text-[#e85c22] hover:underline">
          商品一覧へ
        </Link>
      </div>
    );
  }

  const store = await getStoreSettings();
  const stripeEnabled = isStripeConfigured();
  const product = products.find((p) => p.product_id === customization.product_id);
  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-zinc-900">チェックアウト</h1>
        <p className="mt-3 text-sm text-red-600">商品情報の取得に失敗しました。</p>
      </div>
    );
  }

  return (
    <CheckoutClient
      customizationId={customizationId}
      product={product}
      displayCurrency={store.currency}
      stripeEnabled={stripeEnabled}
    />
  );
}
