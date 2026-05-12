import { redirect } from "next/navigation";
import { storePath } from "@/lib/storefront-constants";

export default function ShopHome() {
  redirect(storePath("/favorite"));
}
