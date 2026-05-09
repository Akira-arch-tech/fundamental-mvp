import { CartClient } from "@/components/CartClient";
import { listCartItems } from "@/lib/cart-store";

export const metadata = {
  title: "カート | FUNDAMENTAL",
};

export default async function CartPage() {
  const items = await listCartItems();
  return <CartClient initialItems={items} />;
}
