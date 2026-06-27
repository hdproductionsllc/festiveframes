import { redirect } from "next/navigation";

// RETIRED. This was an early local-only checkout that recorded an "order" with
// NO payment (order-store.submitOrder just stamps a timestamp) and routed to
// /confirmation — a real lost-order risk if a customer ever reached it by a
// stale link or bookmark. The live purchase path is /build → /cart → Stripe.
// Redirect anyone landing here into the cart.
export default function CheckoutPage() {
  redirect("/cart");
}
