import Link from "next/link";
import { notFound } from "next/navigation";
import { products } from "@/data/seed";
import { getProductBySlugMerged } from "@/lib/catalog";
import { ProductDetailClient } from "@/components/ProductDetailClient";
import { storePath } from "@/lib/storefront-constants";

export async function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlugMerged(slug);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav className="mb-4 text-xs text-zinc-500">
        <Link href={storePath("/favorite")} className="hover:text-[#e85c22]">
          推し活
        </Link>
        <span className="mx-1">/</span>
        <Link href={storePath("/products")} className="hover:text-[#e85c22]">
          商品一覧
        </Link>
        <span className="mx-1">/</span>
        <span className="text-zinc-800">{product.title}</span>
      </nav>
      <ProductDetailClient product={product} />
    </div>
  );
}
