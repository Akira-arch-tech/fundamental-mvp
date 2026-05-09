import { notFound } from "next/navigation";
import { getProductByIdMerged } from "@/lib/catalog";
import { CustomizeEditor } from "@/components/CustomizeEditor";

export default async function CustomizePage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = await getProductByIdMerged(productId);
  if (!product) notFound();

  return (
    <CustomizeEditor product={product} />
  );
}
