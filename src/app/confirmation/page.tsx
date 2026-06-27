import { redirect } from "next/navigation";

// RETIRED. The companion to the old no-payment /checkout — it showed an "Order
// Submitted!" screen for an order that was never charged. The real confirmation
// is /thanks (reached only after a paid Stripe session). Redirect to the cart so
// a stale link/bookmark can never show a fake "order confirmed".
export default function ConfirmationPage() {
  redirect("/cart");
}
