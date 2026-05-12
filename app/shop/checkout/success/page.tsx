import { CheckoutSuccessClient } from "@/components/CheckoutSuccessClient";
import { getStoreSettings } from "@/lib/store-settings";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : "";
  const store = await getStoreSettings();
  return <CheckoutSuccessClient sessionId={sessionId} displayCurrency={store.currency} />;
}
