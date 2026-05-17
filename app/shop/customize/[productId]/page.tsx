import { notFound } from "next/navigation";
import { getProductByIdMerged } from "@/lib/catalog";
import { isStripeConfigured } from "@/lib/stripe-env";
import { CustomizeEditor } from "@/components/CustomizeEditor";

export default async function CustomizePage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { productId } = await params;
  const sp = await searchParams;

  const product = await getProductByIdMerged(productId);
  if (!product) notFound();

  // チャットフローから引き継いだ初期値（例: ?qty=2&chatSize=L版+10cm）
  const initQty = Math.max(1, parseInt(String(sp.qty ?? "1"), 10) || 1);
  const chatSize = typeof sp.chatSize === "string" ? decodeURIComponent(sp.chatSize) : "";

  return (
    <CustomizeEditor
      product={product}
      initQty={initQty}
      chatSize={chatSize}
      stripeEnabled={isStripeConfigured()}
    />
  );
}
