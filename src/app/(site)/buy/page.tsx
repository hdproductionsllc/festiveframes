import { redirect } from "next/navigation";

// The legacy "/buy" kit-checkout funnel is retired. Festive Frames is
// design-first: every purchase goes through the builder, where the customer
// designs a real frame, approves a proof, and checks out (single frame today;
// multi-frame cart with 2-for-$69 pair pricing in the cart). A kit could be
// "bought" here without ever being designed, so this route now redirects into
// the builder. The old island components (BuyHero/OfferBlock/StickyBuyBar/
// KitPicker) remain on disk but are no longer mounted anywhere.
export default function BuyPage() {
  redirect("/build");
}
