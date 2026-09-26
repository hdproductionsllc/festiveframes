// ─────────────────────────────────────────────────────────────
// fulfillSchoolOrder() — a paid MySchoolFrame order, from payment to Bill's inbox.
//
// Called by BOTH triggers (the Stripe webhook and the /school/thanks relay), any
// number of times, in any order. The steps, each safe to repeat:
//
//   1. Record the payment on the order (only ever moves it forward).
//   2. CLAIM it for a limited time. A claim, not a flag: a process killed after
//      this step leaves a claim that expires, and the next trigger finishes the
//      job (review 2026-09-25, #2). A live claim answers "in-progress" and the
//      webhook asks Stripe to come back later.
//   3. Load the revision the order points at and CHECK it: an approval on record,
//      for the proof the checkout was started on, and files that still hash to
//      what they were stored as. Any failure HOLDS the order for a human — never
//      printed unapproved, never retried into a loop.
//   4. Send the production email (and the parent's confirmation) with Resend
//      idempotency keys, so a takeover after a send that did go out is harmless.
//   5. Mark it SENT — only now.
//
// The files come from the immutable revision, never from anything a browser can
// write after checkout (review #3), and the revision is kept (review #4).
// ─────────────────────────────────────────────────────────────

import type Stripe from "stripe";

import {
  claimSchoolOrder,
  getSchoolOrder,
  holdSchoolOrder,
  markSchoolOrderSent,
  recordSchoolOrderPayment,
  releaseSchoolOrder,
} from "@/lib/school-designs/orders";
import { artifactDataUrl, getArtifact, getRevision, sha256Of, type StoredImageRef } from "@/lib/school-designs/store";
import { sendFulfillmentFailureAlert, sendProductionEmails, type NamedImage, type ProductionOrderInput } from "@/lib/email-production";
import { orderFacts, shippingLines } from "@/lib/order/fulfill";
import type { PartsList } from "@/lib/order/parts-list";

export type SchoolFulfillResult = "sent" | "already" | "in-progress" | "held" | "failed" | "no-order";

/** Load a stored image and prove it is still the image it was stored as. */
async function verifiedImage(ref: StoredImageRef): Promise<NamedImage | null> {
  const a = await getArtifact(ref.sha256);
  if (!a || sha256Of(a.bytes) !== ref.sha256) return null;
  return { name: ref.name, dataUrl: artifactDataUrl(a) };
}

export async function fulfillSchoolOrder(session: Stripe.Checkout.Session): Promise<SchoolFulfillResult> {
  const meta = session.metadata ?? {};
  const orderId = meta.orderId ?? "";
  const customerEmail = session.customer_details?.email ?? null;
  const alert = (reason: string) =>
    sendFulfillmentFailureAlert(orderId || "(no order id)", session.id, customerEmail, reason, "myschoolframe");

  const order = await getSchoolOrder(orderId);
  if (!order) {
    console.error(`[fulfill-school] paid session ${session.id} names order ${orderId}, which does not exist.`);
    await alert("Paid, but the order this checkout names does not exist. Nothing was sent.");
    return "no-order";
  }

  // 1. Payment — a fact about money, recorded whatever happens next.
  if (order.status === "awaiting_payment") {
    await recordSchoolOrderPayment(orderId, {
      sessionId: session.id,
      paymentStatus: session.payment_status ?? "unknown",
      amountCents: session.amount_total ?? 0,
    });
  }

  // A frame refunded before it was made is not made.
  if (order.refundedAt !== null && order.status !== "sent") {
    if (order.status !== "held") {
      await holdSchoolOrder(orderId, "Refunded before production.");
      await alert("Refunded before production — nothing was sent to print. No action needed unless the refund was a mistake.");
    }
    return "held";
  }

  // 2. The claim.
  const claim = await claimSchoolOrder(orderId);
  if (claim === "sent") return "already";
  if (claim === "held") return "held";
  if (claim === "busy") return "in-progress";
  if (claim !== "claimed") {
    console.error(`[fulfill-school] order ${orderId} could not be claimed: ${claim}.`);
    return "failed";
  }

  try {
    // 3. What exactly is being produced, and was it approved?
    const hold = async (why: string): Promise<SchoolFulfillResult> => {
      await holdSchoolOrder(orderId, why);
      await alert(`PAID ORDER HELD — DO NOT PRINT until a person checks it. ${why}`);
      return "held";
    };
    const rev = await getRevision(order.designId, order.revision);
    if (!rev) return await hold(`Its saved design (revision ${order.revision}) could not be found.`);
    if (!rev.approval) return await hold(`${rev.code} revision ${rev.n} has no proof approval on record.`);
    if (rev.proof.sha256 !== order.proofSha256 || meta.proofSha256 !== order.proofSha256) {
      return await hold(`The proof on ${rev.code} revision ${rev.n} is not the proof this checkout was started on.`);
    }
    // Checkout refuses a revision with no parts list; one arriving here anyway is
    // held, not sent with a list the production email cannot render.
    if (!rev.parts || !Array.isArray((rev.parts as PartsList).rows)) {
      return await hold(`${rev.code} revision ${rev.n} has no parts list to produce it from.`);
    }
    const proof = await verifiedImage(rev.proof);
    const panels = await Promise.all(rev.panels.map(verifiedImage));
    if (!proof || panels.some((p) => !p)) {
      return await hold(`A stored print file for ${rev.code} revision ${rev.n} is missing or no longer matches its fingerprint.`);
    }

    // 4. Send — keyed, so a retry after a send that did go out sends nothing new.
    const parts = rev.parts as PartsList;
    const approvedOn = new Date(rev.approval.at).toISOString().replace("T", " ").slice(0, 16);
    const input: ProductionOrderInput = {
      orderId,
      sessionId: session.id,
      customerEmail,
      customerName: session.customer_details?.name ?? null,
      amountTotalCents: session.amount_total ?? 0,
      shippingLines: shippingLines(session),
      parts,
      proof: { ...proof, name: `${rev.code}-r${rev.n}-OVERVIEW-do-not-print` },
      printSheets: panels as NamedImage[],
      banners: [],
      brand: "myschoolframe",
      order: { ...orderFacts(session), approval: `${rev.code} revision ${rev.n}, approved ${approvedOn} UTC` },
      idempotencyKey: `msf-order/${orderId}`,
    };
    await sendProductionEmails(input);

    // 5. Done — and only now.
    await markSchoolOrderSent(orderId);
    console.log(`[fulfill-school] order ${orderId} (${rev.code} r${rev.n}) sent.`);
    return "sent";
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    console.error(`[fulfill-school] order ${orderId} failed:`, err);
    await releaseSchoolOrder(orderId, reason).catch(() => {});
    await alert(`Paid, but the production email failed (${reason}). It will be retried automatically; check it arrives.`);
    return "failed";
  }
}
