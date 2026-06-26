// ─────────────────────────────────────────────────────────────
// fulfillOrder() — the single, idempotent convergence point for a paid
// custom order. Called by BOTH the /thanks success-page relay (primary)
// and the Stripe webhook (backup). markFulfilled() ensures the production
// emails send exactly once no matter how many triggers fire.
// ─────────────────────────────────────────────────────────────

import type Stripe from "stripe";

import { getDraft, getCartDraft, markFulfilled, unmarkFulfilled, type OrderArtifacts } from "@/lib/order/store";
import { sendProductionEmails, sendCartCustomerEmail, sendFulfillmentFailureAlert, type ProductionOrderInput } from "@/lib/email-production";
import type { PartsList } from "@/lib/order/parts-list";

export type FulfillResult = "sent" | "already" | "no-payload" | "failed";

/** Pull a flat list of shipping address lines off a retrieved session. */
export function shippingLines(session: Stripe.Checkout.Session): string[] {
  // On the pinned API version (2026-05-27.dahlia) the top-level
  // `shipping_details` field was removed; the shipping address lives at
  // `collected_information.shipping_details`. Read that first, but keep the
  // legacy fallbacks so older sessions / API versions still resolve.
  const collected =
    session.collected_information?.shipping_details ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (session as any).shipping_details ??
    null;
  const name = collected?.name ?? session.customer_details?.name ?? null;
  const a = collected?.address ?? null;
  return [
    name,
    a?.line1,
    a?.line2,
    [a?.city, a?.state, a?.postal_code].filter(Boolean).join(", "),
    a?.country,
  ].filter(Boolean).map((l: unknown) => String(l));
}

/**
 * Idempotently fulfill a paid custom order. `payload` (parts + artifacts) comes
 * from the success-page relay; if absent, we fall back to the in-memory draft.
 * If neither has a payload, we do NOT consume the idempotency claim — a later
 * trigger that does have the payload can still fulfill — and we alert the team.
 */
export async function fulfillOrder(
  orderId: string,
  session: Stripe.Checkout.Session,
  payload?: { parts: PartsList; artifacts: OrderArtifacts },
): Promise<FulfillResult> {
  const data = payload ?? (await (async () => {
    const d = await getDraft(orderId);
    return d ? { parts: d.parts, artifacts: d.artifacts } : undefined;
  })());

  const customerEmail = session.customer_details?.email ?? null;

  if (!data) {
    // No design/artifacts available yet. Don't burn the idempotency claim.
    console.error(`[fulfill] no payload for paid order ${orderId} (session ${session.id}).`);
    await sendFulfillmentFailureAlert(orderId, session.id, customerEmail, "Paid, but no design/artifacts were available to generate production files.");
    return "no-payload";
  }

  // Claim fulfillment — only the first caller proceeds.
  if (!(await markFulfilled(orderId))) return "already";

  const input: ProductionOrderInput = {
    orderId,
    sessionId: session.id,
    customerEmail,
    customerName: session.customer_details?.name ?? null,
    amountTotalCents: session.amount_total ?? 0,
    shippingLines: shippingLines(session),
    parts: data.parts,
    proof: data.artifacts.proof,
    printSheets: data.artifacts.printSheets,
    banners: data.artifacts.banners,
  };

  try {
    await sendProductionEmails(input);
    console.log(`[fulfill] production + customer emails sent for order ${orderId}.`);
    return "sent";
  } catch (err) {
    // Release the claim so the backup trigger can retry, and alert a human.
    await unmarkFulfilled(orderId);
    const reason = err instanceof Error ? err.message : "unknown error";
    console.error(`[fulfill] sending failed for order ${orderId}:`, err);
    await sendFulfillmentFailureAlert(orderId, session.id, customerEmail, reason);
    return "failed";
  }
}

/**
 * Idempotently fulfill a paid multi-design CART. Reuses the proven single-order
 * machinery per design: one PRODUCTION email per design to the founders (each
 * with that design's files + its make-quantity, customer email suppressed), then
 * ONE combined customer confirmation for the whole order. The idempotency claim
 * is keyed by cartId, so the webhook and the /thanks relay converge exactly once.
 */
export async function fulfillCart(
  cartId: string,
  session: Stripe.Checkout.Session,
): Promise<FulfillResult> {
  const customerEmail = session.customer_details?.email ?? null;

  const cart = await getCartDraft(cartId);
  if (!cart || cart.lines.length === 0) {
    console.error(`[fulfill] no cart draft for paid cart ${cartId} (session ${session.id}).`);
    await sendFulfillmentFailureAlert(cartId, session.id, customerEmail, "Paid, but the cart's designs were not found to generate production files.");
    return "no-payload";
  }

  // Load every design draft up front. If NONE resolve, don't burn the claim.
  const designs = await Promise.all(
    cart.lines.map(async (line) => {
      const d = await getDraft(line.orderId);
      return d ? { line, draft: d } : null;
    }),
  );
  const present = designs.filter((d): d is NonNullable<typeof d> => d !== null);
  if (present.length === 0) {
    console.error(`[fulfill] cart ${cartId} paid but no design drafts resolved.`);
    await sendFulfillmentFailureAlert(cartId, session.id, customerEmail, "Paid, but none of the cart's design drafts could be loaded.");
    return "no-payload";
  }

  // Claim fulfillment for the whole cart — only the first caller proceeds.
  if (!(await markFulfilled(cartId))) return "already";

  const shipping = shippingLines(session);
  const customerName = session.customer_details?.name ?? null;
  const orderTotal = session.amount_total ?? 0;

  try {
    // One production email per design (founders only; combined customer email below).
    for (let i = 0; i < present.length; i++) {
      const { line, draft } = present[i];
      const input: ProductionOrderInput = {
        orderId: line.orderId,
        sessionId: session.id,
        customerEmail,
        customerName,
        amountTotalCents: orderTotal,
        shippingLines: shipping,
        parts: draft.parts,
        proof: draft.artifacts.proof,
        printSheets: draft.artifacts.printSheets,
        banners: draft.artifacts.banners,
        quantity: line.quantity,
        cartNote: `Design ${i + 1} of ${present.length} · cart ${cartId} · order total ${(orderTotal / 100).toFixed(2)}`,
      };
      await sendProductionEmails(input, { skipCustomer: true });
    }
    console.log(`[fulfill] ${present.length} production email(s) sent for cart ${cartId}.`);
  } catch (err) {
    // Any founders-email failure → release the claim so a retry can re-send, alert.
    await unmarkFulfilled(cartId);
    const reason = err instanceof Error ? err.message : "unknown error";
    console.error(`[fulfill] cart ${cartId} production send failed:`, err);
    await sendFulfillmentFailureAlert(cartId, session.id, customerEmail, reason);
    return "failed";
  }

  // ONE combined customer confirmation (non-throwing; alerts on its own failure).
  if (customerEmail) {
    await sendCartCustomerEmail({
      cartId,
      sessionId: session.id,
      customerEmail,
      customerName,
      amountTotalCents: orderTotal,
      shippingLines: shipping,
      designs: present.map(({ line, draft }) => ({
        designName: draft.parts.designName ?? "Custom frame",
        quantity: line.quantity,
        proof: draft.artifacts.proof,
      })),
    });
  }

  return "sent";
}
