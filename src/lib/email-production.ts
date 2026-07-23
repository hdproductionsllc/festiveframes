// ─────────────────────────────────────────────────────────────
// Production + customer emails for a CUSTOM builder order.
//
// Two emails fire from fulfillOrder() after a paid custom-frame order:
//   1. PRODUCTION email to all three founders (Henry, Becky, Bill) with
//      every file Bill needs to print on the eufyMake E1: parts-list CSV,
//      print sheet(s), banner file(s), and the full composite.
//   2. CUSTOMER email: order confirmation + a proof image of the exact
//      frame they designed + a thank-you from the three founders.
//
// Reuses the brand shell/escape styling from the kit email. Never throws.
//
// Env:
//   RESEND_API_KEY     required to send anything
//   EMAIL_FROM         "Festive Frames <orders@festiveframes.co>"
//   PRODUCTION_EMAILS  comma-separated founder inboxes (Henry,Becky,Bill).
//                      Falls back to ADMIN_ORDER_EMAIL if unset.
//   ADMIN_ORDER_EMAIL  fallback / always-copied admin inbox.
// ─────────────────────────────────────────────────────────────

import { Resend } from "resend";
import { partsListCsv, partsListHtml, type PartsList, type PanelPartsList } from "@/lib/order/parts-list";

// Cartoon sticker palette (matches the homepage).
const PAGE = "#fff9ec"; // warm cream page background
const CARD = "#faf0d6"; // card background
const INK = "#1e1b17"; // text + borders
const GOLD = "#f8c53b"; // header accent
const PINK = "#ed5aa0"; // primary accent
const BLUE = "#3fb0e6"; // secondary accent
const RED = "#C8102E"; // alert/attention accent
const SHADOW = "5px 5px 0 #1e1b17"; // signature hard offset shadow
const DISPLAY_FONT = "'Fredoka', 'Arial Black', Helvetica, Arial, sans-serif";
const BODY_FONT = "Helvetica, Arial, sans-serif";

export interface NamedImage {
  /** Filename without extension, e.g. "eufy-sheet-1-of-2". */
  name: string;
  /** A data: URL (image/png). */
  dataUrl: string;
}

export interface ProductionOrderInput {
  orderId: string;
  sessionId: string;
  customerEmail: string | null;
  customerName: string | null;
  amountTotalCents: number;
  shippingLines: string[];
  parts: PartsList;
  /** Full composite / proof image of the assembled frame (data URL). */
  proof: NamedImage | null;
  /** eufyMake print sheet(s) — may be empty if ordered on mobile. */
  printSheets: NamedImage[];
  /** Custom text-bar banner files. */
  banners: NamedImage[];
  /** How many of THIS exact design to make (cart line quantity). Default 1. */
  quantity?: number;
  /** Position of this design within a multi-design cart order (1-based). When set,
   *  the email loudly flags it as one frame of a shared order to ship together. */
  cartContext?: { index: number; total: number; cartId: string } | null;
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function shell(headline: string, inner: string): string {
  return `
  <div style="background:${PAGE};padding:28px 12px;font-family:${BODY_FONT};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;">
      <tr><td style="background:${GOLD};border:3px solid ${INK};border-radius:18px 18px 0 0;padding:20px 24px;text-align:center;box-shadow:${SHADOW};">
        <span style="color:${INK};font-size:26px;font-weight:bold;letter-spacing:0.5px;font-family:${DISPLAY_FONT};">Festive Frames</span>
      </td></tr>
      <tr><td style="background:${CARD};border:3px solid ${INK};border-top:none;border-radius:0 0 18px 18px;padding:26px 24px;box-shadow:${SHADOW};">
        <h1 style="margin:0 0 14px;color:${INK};font-size:22px;font-weight:bold;font-family:${DISPLAY_FONT};">${esc(headline)}</h1>
        ${inner}
        <p style="margin:22px 0 0;color:${INK};font-size:12px;line-height:1.5;">Made to order in the USA &middot; St. Louis, Missouri. Questions? Reach a real human at hello@festiveframes.co.</p>
      </td></tr>
    </table>
  </div>`;
}

interface Attachment {
  filename: string;
  content: string;
  contentType: string;
  contentId?: string;
}

/** data: URL -> { base64 content, contentType } for a Resend attachment. */
function toAttachment(img: NamedImage): Attachment | null {
  const m = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(img.dataUrl);
  if (!m) return null;
  return { filename: `${img.name}.png`, content: m[2], contentType: m[1] };
}

/** Decoded byte size of a base64 attachment payload. */
function attachmentBytes(a: Attachment): number {
  // 4 base64 chars -> 3 bytes, minus padding. Close enough for a size guard.
  const len = a.content.length;
  const padding = a.content.endsWith("==") ? 2 : a.content.endsWith("=") ? 1 : 0;
  return Math.floor((len * 3) / 4) - padding;
}

// Resend caps a single send at ~40MB of attachments. Stay well under so the
// request body (with base64 inflation already accounted for above) is safe.
const MAX_ATTACHMENT_BYTES = 30 * 1024 * 1024;

function shippingBlock(lines: string[]): string {
  const body = lines.filter(Boolean).map((l) => esc(l)).join("<br/>");
  return `
    <p style="margin:0 0 4px;color:${INK};font-size:14px;"><strong>Ship to:</strong></p>
    <p style="margin:0;color:${INK};font-size:13px;line-height:1.5;">${body || "Address on file"}</p>`;
}

const FOUNDERS_THANK_YOU = `
  <div style="margin:20px 0 0;padding:16px 18px;background:${PAGE};border:3px solid ${INK};border-radius:14px;box-shadow:${SHADOW};">
    <p style="margin:0 0 8px;color:${PINK};font-size:16px;font-weight:bold;font-family:${DISPLAY_FONT};">A thank-you from the founders</p>
    <p style="margin:0;color:${INK};font-size:14px;line-height:1.6;">
      Every frame is made to order, by hand, right here in the USA — and yours is now in our shop.
      Thank you for flying your colors with us. We can't wait for you to see it on your car.
    </p>
    <p style="margin:10px 0 0;color:${INK};font-size:14px;font-style:italic;">— Becky, Bill and Henry</p>
  </div>`;

function productionHtml(o: ProductionOrderInput, droppedNote?: string | null): string {
  const fileList = [
    o.proof ? "the full composite proof" : null,
    o.printSheets.length ? `${o.printSheets.length} eufyMake print sheet(s)` : "⚠ NO print sheet auto-generated — open this design in the builder on the eufy desktop and use the eufyMake print button to regenerate",
    o.banners.length ? `${o.banners.length} banner file(s)` : null,
    "the parts-list CSV",
  ].filter(Boolean).join(", ");

  const droppedBlock = droppedNote
    ? `<p style="margin:0 0 12px;padding:10px 14px;background:${RED};color:${PAGE};font-size:13px;font-weight:bold;border:3px solid ${INK};border-radius:10px;">${esc(droppedNote)}</p>`
    : "";

  const qty = Math.max(1, Math.floor(o.quantity ?? 1));
  const makeBadge = `<p style="margin:0 0 14px;display:inline-block;padding:6px 14px;background:${GOLD};color:${INK};font-size:14px;font-weight:bold;text-transform:uppercase;border:3px solid ${INK};border-radius:99px;">Make &times;${qty}</p>`;

  // LOUD multi-frame banner: this design is one frame of a larger order that must
  // ship together to one customer. Impossible to miss at the top of the email.
  const c = o.cartContext;
  const multiBanner = c && c.total > 1
    ? `<div style="margin:0 0 16px;padding:14px 16px;background:${BLUE};border:3px solid ${INK};border-radius:14px;box-shadow:${SHADOW};">
         <p style="margin:0 0 4px;color:${INK};font-size:18px;font-weight:bold;font-family:${DISPLAY_FONT};">📦 Frame ${c.index} of ${c.total} · SAME ORDER</p>
         <p style="margin:0;color:${INK};font-size:14px;font-weight:bold;">All ${c.total} frames are ONE order for ${esc(o.customerName ?? o.customerEmail ?? "this customer")} — make them all and SHIP TOGETHER in one package. You'll get ${c.total} of these emails (one per design); order ref <strong>${esc(c.cartId)}</strong>.</p>
       </div>`
    : "";

  return shell(
    `Production order — ${esc(o.parts.designName || "Custom frame")}`,
    `
    ${multiBanner}
    <p style="margin:0 0 14px;display:inline-block;padding:6px 14px;background:${RED};color:${PAGE};font-size:13px;font-weight:bold;text-transform:uppercase;border:3px solid ${INK};border-radius:99px;">New paid order · ${usd(o.amountTotalCents)}</p>
    ${qty > 1 || (c && c.total > 1) ? makeBadge : ""}
    <p style="margin:0 0 8px;color:${INK};font-size:13px;">
      ${c && c.total > 1 ? `<strong>Order ref:</strong> ${esc(c.cartId)} (frame ${c.index} of ${c.total})<br/>` : ""}<strong>This design:</strong> ${esc(o.orderId)}<br/>
      <strong>Stripe:</strong> ${esc(o.sessionId)}<br/>
      <strong>Customer:</strong> ${esc(o.customerName ?? "—")} &lt;${esc(o.customerEmail ?? "—")}&gt;<br/>
      <strong>Plate:</strong> ${esc(o.parts.plateState)}${o.parts.qr.enabled ? ` · <strong>QR:</strong> ${esc(o.parts.qr.url)}` : ""}
    </p>
    <p style="margin:0 0 12px;color:${INK};font-size:13px;"><strong>Bill — attached for the eufy:</strong> ${esc(fileList)}.</p>
    ${droppedBlock}
    ${partsListHtml(o.parts)}
    <div style="margin:18px 0 0;padding:14px 16px;background:${PAGE};border:3px solid ${INK};border-radius:14px;box-shadow:${SHADOW};">${shippingBlock(o.shippingLines)}</div>`,
  );
}

/** Concise plain-text alternative for the founders/production email. */
function productionText(o: ProductionOrderInput, droppedNote?: string | null): string {
  const fileList = [
    o.proof ? "the full composite proof" : null,
    o.printSheets.length ? `${o.printSheets.length} eufyMake print sheet(s)` : "NO print sheet auto-generated — open this design in the builder on the eufy desktop and regenerate it",
    o.banners.length ? `${o.banners.length} banner file(s)` : null,
    "the parts-list CSV",
  ].filter(Boolean).join(", ");
  const ship = o.shippingLines.filter(Boolean).join("\n") || "Address on file";
  const qty = Math.max(1, Math.floor(o.quantity ?? 1));
  const c = o.cartContext;
  return [
    `PRODUCTION ORDER — ${o.parts.designName || "Custom frame"}`,
    `New paid order · ${usd(o.amountTotalCents)}`,
    `MAKE x${qty}`,
    c && c.total > 1
      ? `*** FRAME ${c.index} OF ${c.total} — SAME ORDER (ref ${c.cartId}). Make all ${c.total} and SHIP TOGETHER to ${o.customerName ?? o.customerEmail ?? "this customer"}. ***`
      : null,
    ``,
    `Order: ${o.orderId}`,
    `Stripe: ${o.sessionId}`,
    `Customer: ${o.customerName ?? "—"} <${o.customerEmail ?? "—"}>`,
    `Plate: ${o.parts.plateState}${o.parts.qr.enabled ? ` · QR: ${o.parts.qr.url}` : ""}`,
    ``,
    `Bill — attached for the eufy: ${fileList}.`,
    droppedNote ? `\n** ${droppedNote} **\n` : `Files attached to this email.`,
    ``,
    `Ship to:`,
    ship,
  ].join("\n");
}

/** Concise plain-text alternative for the customer confirmation email. */
function customerText(o: ProductionOrderInput): string {
  const first = o.customerName ? `, ${o.customerName.split(" ")[0]}` : "";
  const ship = o.shippingLines.filter(Boolean).join("\n") || "Address on file";
  return [
    `You're in${first}!`,
    ``,
    `Thanks for your order — it's confirmed and headed into production. Your`,
    `license-plate frame is now in our shop. A proof of the exact frame you`,
    `designed is attached to this email.`,
    ``,
    `Order: ${o.orderId}`,
    `Total: ${usd(o.amountTotalCents)}`,
    ``,
    `Ship to:`,
    ship,
    ``,
    `A thank-you from the founders:`,
    `Every frame is made to order, by hand, right here in the USA — and yours`,
    `is now in our shop. Thank you for flying your colors with us. We can't`,
    `wait for you to see it on your car.`,
    `— Becky, Bill and Henry`,
    ``,
    `Made to order in the USA · St. Louis, Missouri.`,
    `Questions? Reach a real human at hello@festiveframes.co.`,
  ].join("\n");
}

function customerHtml(o: ProductionOrderInput): string {
  const first = o.customerName ? `, ${esc(o.customerName.split(" ")[0])}` : "";
  const proofImg = o.proof ? `<div style="margin:18px 0;text-align:center;"><img src="cid:proof" alt="Your frame proof" style="max-width:100%;border:3px solid ${INK};border-radius:14px;box-shadow:${SHADOW};"/></div>` : "";
  return shell(
    `You're in${first}! 🎆`,
    `
    <p style="margin:0 0 12px;color:${INK};font-size:14px;line-height:1.6;">
      Thanks for your order — it's confirmed and headed into production. Here's a proof of the exact
      license-plate frame you designed:
    </p>
    ${proofImg}
    <p style="margin:0 0 4px;padding-left:12px;border-left:5px solid ${BLUE};color:${INK};font-size:14px;"><strong>Order:</strong> ${esc(o.orderId)} · <strong>Total:</strong> ${usd(o.amountTotalCents)}</p>
    <div style="margin:16px 0 0;padding:14px 16px;background:${PAGE};border:3px solid ${INK};border-radius:14px;box-shadow:${SHADOW};">${shippingBlock(o.shippingLines)}</div>
    ${FOUNDERS_THANK_YOU}`,
  );
}

/**
 * Sends the production (founders) email and the customer confirmation/proof
 * email.
 *
 * THROWS on a hard "the production email could not be sent" failure so the
 * caller (fulfillOrder) releases the idempotency claim and fires the failure
 * alert. Hard failures are: RESEND_API_KEY missing, no founder recipients
 * configured, or the founders send failing even after dropping print sheets.
 *
 * A customer-email failure does NOT throw (production already went out) but it
 * is never silent — it fires sendFulfillmentFailureAlert so a human is notified.
 */
export async function sendProductionEmails(
  o: ProductionOrderInput,
  opts?: { skipCustomer?: boolean },
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Hard failure: a paid order cannot be silently dropped. In local dev with
    // no key this throws, fulfillOrder releases the claim and logs loudly, and
    // the alert path no-ops without a key — acceptable, never "sent".
    console.error("[email-production] RESEND_API_KEY not set; cannot send production email for paid order.");
    throw new Error("RESEND_API_KEY not set — production email could not be sent.");
  }
  const from = process.env.EMAIL_FROM || "Festive Frames <onboarding@resend.dev>";
  const adminTo = process.env.ADMIN_ORDER_EMAIL;
  const founderList = (process.env.PRODUCTION_EMAILS || adminTo || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (!founderList.length) {
    // Hard failure: with no founder recipients, Bill never sees the order.
    console.error("[email-production] no PRODUCTION_EMAILS/ADMIN_ORDER_EMAIL set; cannot send production email for paid order.");
    throw new Error("No founder recipients configured — production email could not be sent.");
  }
  const resend = new Resend(apiKey);

  // ── Production email (founders) — all artifacts attached. ──
  const csv: Attachment = {
    filename: `${o.parts.designName || "order"}-parts-list.csv`,
    content: Buffer.from(partsListCsv(o.parts, o.orderId, o.customerName ?? "")).toString("base64"),
    contentType: "text/csv",
  };
  const sheetAttachments = o.printSheets.map(toAttachment).filter(Boolean) as Attachment[];
  const bannerAttachments = o.banners.map(toAttachment).filter(Boolean) as Attachment[];
  const proofAttachment = o.proof ? toAttachment(o.proof) : null;

  // Keep CSV + proof + banners first; print sheets are the heavy, droppable ones.
  const keep: Attachment[] = [csv, ...bannerAttachments, ...(proofAttachment ? [proofAttachment] : [])];
  const total = (atts: Attachment[]) => atts.reduce((sum, a) => sum + attachmentBytes(a), 0);

  const droppedMessage =
    "Print sheet(s) too large to attach — regenerate on desktop from the order's design (it's saved).";

  // Proactive size guard: if everything would blow the cap, drop the sheets up front.
  let includeSheets = total([...keep, ...sheetAttachments]) <= MAX_ATTACHMENT_BYTES;
  let attachments = includeSheets ? [...keep, ...sheetAttachments] : keep;
  let droppedNote: string | null = includeSheets ? null : (sheetAttachments.length ? droppedMessage : null);
  if (!includeSheets && sheetAttachments.length) {
    console.warn(`[email-production] print sheets (${total(sheetAttachments)} bytes) exceed cap; dropping from founders email for order ${o.orderId}.`);
  }

  // Subject groups multi-frame orders in the inbox: same customer + "[1/2]" + a
  // short order ref so the founders instantly see the frames belong together.
  const c = o.cartContext;
  const subject =
    c && c.total > 1
      ? `PRODUCTION [${c.index}/${c.total}] — ${o.customerName ?? o.customerEmail ?? o.orderId} — ${o.parts.designName || "Custom frame"} (order ${c.cartId})`
      : `PRODUCTION — ${o.parts.designName || "Custom frame"} — ${o.customerName ?? o.customerEmail ?? o.orderId}`;
  const sendFounders = () =>
    resend.emails.send({
      from,
      to: founderList,
      replyTo: o.customerEmail ?? undefined,
      subject,
      html: productionHtml(o, droppedNote),
      text: productionText(o, droppedNote),
      attachments,
    });

  try {
    await sendFounders();
  } catch (err) {
    // Retry once with print sheets dropped — a size-related failure must never
    // silently kill a paid order. If sheets were already excluded, rethrow.
    if (includeSheets && sheetAttachments.length) {
      console.error("[email-production] founders email failed; retrying without print sheets:", err);
      includeSheets = false;
      attachments = keep;
      droppedNote = droppedMessage;
      try {
        await sendFounders();
      } catch (retryErr) {
        console.error("[email-production] founders email failed even without print sheets:", retryErr);
        throw retryErr; // hard failure → fulfillOrder releases claim + alerts
      }
    } else {
      console.error("[email-production] founders email failed:", err);
      throw err; // hard failure → fulfillOrder releases claim + alerts
    }
  }

  // ── Customer email (confirmation + proof + thank-you). ──
  // Production already went out; a customer-email failure does NOT throw (we
  // don't want to release the claim and re-send the production email), but it
  // must never be silent — alert the team so they can manually confirm.
  //
  // In a multi-design CART, the per-design customer email is suppressed
  // (skipCustomer) — fulfillCart sends ONE combined confirmation for the whole
  // order instead, so the buyer isn't emailed N times.
  if (o.customerEmail && !opts?.skipCustomer) {
    const customerAttachments = proofAttachment
      ? [{ ...proofAttachment, contentId: "proof" }]
      : [];
    try {
      await resend.emails.send({
        from,
        to: o.customerEmail,
        bcc: founderList,
        subject: "Your Festive Frames order is confirmed",
        html: customerHtml(o),
        text: customerText(o),
        attachments: customerAttachments,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown error";
      console.error("[email-production] customer email failed:", err);
      await sendFulfillmentFailureAlert(
        o.orderId,
        o.sessionId,
        o.customerEmail,
        `Production email SENT, but the CUSTOMER CONFIRMATION email FAILED (${reason}). Reach out to the customer manually — their order IS in production.`,
      );
    }
  }
}

export interface CartCustomerInput {
  /** cartId, shown to the buyer as their order reference. */
  cartId: string;
  sessionId: string;
  customerEmail: string;
  customerName: string | null;
  amountTotalCents: number;
  shippingLines: string[];
  /** One entry per design in the cart. */
  designs: { designName: string; quantity: number; proof: NamedImage | null }[];
}

/** "2 frames" / "1 frame" etc. */
function framesLabel(n: number): string {
  return `${n} frame${n === 1 ? "" : "s"}`;
}

function cartCustomerHtml(o: CartCustomerInput): string {
  const first = o.customerName ? `, ${esc(o.customerName.split(" ")[0])}` : "";
  const totalFrames = o.designs.reduce((s, d) => s + d.quantity, 0);
  // Natural lead-in: avoid the awkward "Here are the 1 frame" when it's a single
  // frame; only number it when there's more than one.
  const lead =
    totalFrames === 1
      ? "Here's the frame you designed:"
      : `Here are the ${totalFrames} frames you designed:`;
  // Show each proof large and centered (matching the single-frame email) — the
  // proof is the thing the buyer is excited to see, not a cramped thumbnail.
  const rows = o.designs
    .map((d, i) => {
      const img = d.proof
        ? `<div style="text-align:center;margin:0 0 10px;"><img src="cid:proof-${i}" alt="Proof of ${esc(d.designName)}" style="width:100%;max-width:360px;border:3px solid ${INK};border-radius:12px;box-shadow:${SHADOW};"/></div>`
        : "";
      const divider = i < o.designs.length - 1 ? `border-bottom:2px solid ${INK};` : "";
      return `
      <div style="margin:0 0 16px;padding:0 0 16px;${divider}">
        ${img}
        <p style="margin:0;color:${INK};font-size:15px;text-align:center;"><strong>${esc(d.designName || "Custom frame")}</strong> &middot; Make &times;${d.quantity}</p>
      </div>`;
    })
    .join("");
  return shell(
    `You're in${first}! 🎆`,
    `
    <p style="margin:0 0 16px;color:${INK};font-size:14px;line-height:1.6;">
      Thanks for your order — it's confirmed and headed into production. ${lead}
    </p>
    ${rows}
    <p style="margin:14px 0 4px;padding-left:12px;border-left:5px solid ${BLUE};color:${INK};font-size:14px;"><strong>Order:</strong> ${esc(o.cartId)} · <strong>Total:</strong> ${usd(o.amountTotalCents)}</p>
    <div style="margin:16px 0 0;padding:14px 16px;background:${PAGE};border:3px solid ${INK};border-radius:14px;box-shadow:${SHADOW};">${shippingBlock(o.shippingLines)}</div>
    ${FOUNDERS_THANK_YOU}`,
  );
}

function cartCustomerText(o: CartCustomerInput): string {
  const first = o.customerName ? `, ${o.customerName.split(" ")[0]}` : "";
  const totalFrames = o.designs.reduce((s, d) => s + d.quantity, 0);
  const ship = o.shippingLines.filter(Boolean).join("\n") || "Address on file";
  const lines = o.designs.map((d) => `  • ${d.designName || "Custom frame"} ×${d.quantity}`);
  return [
    `You're in${first}!`,
    ``,
    `Thanks for your order — it's confirmed and headed into production.`,
    `Your ${framesLabel(totalFrames)}:`,
    ...lines,
    ``,
    `Order: ${o.cartId}`,
    `Total: ${usd(o.amountTotalCents)}`,
    ``,
    `Ship to:`,
    ship,
    ``,
    `A thank-you from the founders:`,
    `Every frame is made to order, by hand, right here in the USA. Thank you for`,
    `flying your colors with us. We can't wait for you to see them on your car.`,
    `— Becky, Bill and Henry`,
    ``,
    `Made to order in the USA · St. Louis, Missouri.`,
    `Questions? Reach a real human at hello@festiveframes.co.`,
  ].join("\n");
}

/**
 * ONE combined confirmation for a multi-design cart (the per-design production
 * emails to the founders are sent separately by fulfillCart). Never throws —
 * production already went out; a failure here alerts the team instead.
 */
export async function sendCartCustomerEmail(o: CartCustomerInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const from = process.env.EMAIL_FROM || "Festive Frames <onboarding@resend.dev>";
  const founderList = (process.env.PRODUCTION_EMAILS || process.env.ADMIN_ORDER_EMAIL || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const resend = new Resend(apiKey);

  // Inline each design's proof as a cid attachment (proof-0, proof-1, …).
  const attachments = o.designs
    .map((d, i) => {
      if (!d.proof) return null;
      const a = toAttachment(d.proof);
      return a ? { ...a, contentId: `proof-${i}` } : null;
    })
    .filter(Boolean) as Attachment[];

  try {
    await resend.emails.send({
      from,
      to: o.customerEmail,
      bcc: founderList.length ? founderList : undefined,
      subject: "Your Festive Frames order is confirmed",
      html: cartCustomerHtml(o),
      text: cartCustomerText(o),
      attachments,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    console.error("[email-production] cart customer email failed:", err);
    await sendFulfillmentFailureAlert(
      o.cartId,
      o.sessionId,
      o.customerEmail,
      `Production emails SENT, but the CUSTOMER CONFIRMATION for the cart FAILED (${reason}). Reach out to the customer manually — their order IS in production.`,
    );
  }
}

// ─────────────────────────────────────────────────────────────
// SCHOOL builder "Send to production" — email-only order path (no payment).
//
// The whole order is: render the assembled print PNG in the browser, POST it to
// /api/school/submit, and email it (plus an optional parts list) to a SERVER-FIXED
// recipient. This is a deliberate, self-contained sibling of sendProductionEmails:
// it shares this module's brand shell + attachment helpers but has its OWN recipient
// and NEVER touches the paid-order founders/customer sends above.
//
// Recipient is read from SCHOOL_ORDERS_EMAIL (defaulting to the literal
// orders@festiveframes.co) — NEVER from the request body. Never throws: it returns a
// typed result so the route can answer honestly ("sent" vs "email not configured").
// ─────────────────────────────────────────────────────────────

export interface SchoolOrderInput {
  /** Human design name — escaped before it touches the HTML/subject. */
  designName: string;
  /** The assembled full-frame PNG (data:image/(png|jpeg) URL). When `panels` are also
   *  present this is the OVERVIEW (shows the whole layout) and the panels are printed. */
  printPng: NamedImage;
  /** The 4 separately-printable panel PNGs (left/right/top/bottom). When present, these
   *  are the print files and `printPng` is just an overview. */
  panels?: NamedImage[];
  /** Optional parts list for an at-a-glance production summary in the body. */
  partsList?: PartsList | PanelPartsList | null;
}

export type SchoolOrderResult =
  | { ok: true }
  | { ok: false; reason: "email-not-configured" | "invalid-attachment" | "attachment-too-large" | "send-failed" };

/** The fixed production inbox for school orders. Server-side only, env-overridable. */
function schoolOrdersRecipient(): string {
  return (process.env.SCHOOL_ORDERS_EMAIL || "orders@festiveframes.co").trim();
}

/** Attachment with a correct extension for its content type (toAttachment always
 *  says .png; a school print may be jpeg). */
function toPrintAttachment(img: NamedImage): Attachment | null {
  const base = toAttachment(img);
  if (!base) return null;
  const ext = base.contentType === "image/jpeg" ? "jpg" : "png";
  return { ...base, filename: `${img.name}.${ext}` };
}

function schoolOrderHtml(
  designName: string,
  parts: PartsList | PanelPartsList | null,
  panelCount = 0,
): string {
  const partsBlock = parts
    ? `<div style="margin:18px 0 0;">${partsListHtml(parts)}</div>`
    : `<p style="margin:14px 0 0;color:${INK};font-size:13px;">No parts list was included — the print files are attached.</p>`;
  const filesNote = panelCount
    ? `<strong>${panelCount} panel print files</strong> are attached — print and position each one separately on the bed. The <strong>OVERVIEW</strong> attachment shows the assembled layout (do not print it).`
    : `The print-ready file is attached to this email.`;
  return shell(
    `New school frame order — ${esc(designName || "Untitled")}`,
    `
    <p style="margin:0 0 14px;display:inline-block;padding:6px 14px;background:${BLUE};color:${PAGE};font-size:13px;font-weight:bold;text-transform:uppercase;border:3px solid ${INK};border-radius:99px;">New school order</p>
    <p style="margin:0 0 8px;color:${INK};font-size:14px;">
      <strong>Design:</strong> ${esc(designName || "Untitled")}
    </p>
    <p style="margin:0 0 12px;color:${INK};font-size:13px;">${filesNote}</p>
    ${partsBlock}`,
  );
}

function schoolOrderText(designName: string, panelCount = 0): string {
  return [
    `NEW SCHOOL FRAME ORDER`,
    ``,
    `Design: ${designName || "Untitled"}`,
    ``,
    panelCount
      ? `${panelCount} panel print files are attached — print and position each one separately. The OVERVIEW attachment shows the assembled layout (do not print it).`
      : `The print-ready file is attached to this email.`,
    ``,
    `Made to order in the USA · St. Louis, Missouri.`,
  ].join("\n");
}

/**
 * Email a school-builder design to the fixed production inbox. Returns a typed
 * result instead of throwing so the route never lies about what happened:
 *   - no RESEND_API_KEY  → { ok:false, reason:"email-not-configured" } (nothing sent)
 *   - bad/oversize image → invalid-attachment / attachment-too-large
 *   - Resend throws      → send-failed
 *   - sent               → { ok:true }
 */
export async function sendSchoolOrderEmail(o: SchoolOrderInput): Promise<SchoolOrderResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: "email-not-configured" };

  const overview = toPrintAttachment(o.printPng);
  if (!overview) return { ok: false, reason: "invalid-attachment" };

  // When panels are supplied, THEY are the print files (each positioned separately on
  // the bed) and `printPng` becomes an OVERVIEW. Panels first, overview last.
  const panelAttachments = (o.panels ?? [])
    .map(toPrintAttachment)
    .filter((a): a is Attachment => a !== null);
  const attachments = panelAttachments.length ? [...panelAttachments, overview] : [overview];

  const totalBytes = attachments.reduce((sum, a) => sum + attachmentBytes(a), 0);
  if (totalBytes > MAX_ATTACHMENT_BYTES) return { ok: false, reason: "attachment-too-large" };

  const from = process.env.EMAIL_FROM || "Festive Frames <onboarding@resend.dev>";
  const to = schoolOrdersRecipient();
  // Strip control chars from the subject so a crafted design name can't inject a
  // header line; the HTML body escapes it separately via esc().
  const subjectName = (o.designName || "Untitled").replace(/[\r\n\t]+/g, " ").slice(0, 120);

  try {
    await new Resend(apiKey).emails.send({
      from,
      to,
      subject: `SCHOOL ORDER — ${subjectName}`,
      html: schoolOrderHtml(o.designName, o.partsList ?? null, panelAttachments.length),
      text: schoolOrderText(o.designName, panelAttachments.length),
      attachments,
    });
    return { ok: true };
  } catch (err) {
    console.error("[email-production] school order email failed:", err);
    return { ok: false, reason: "send-failed" };
  }
}

/** Plain-text alert when fulfillment fails — guarantees a human is notified. */
export async function sendFulfillmentFailureAlert(orderId: string, sessionId: string, customerEmail: string | null, reason: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const from = process.env.EMAIL_FROM || "Festive Frames <onboarding@resend.dev>";
  const to = (process.env.PRODUCTION_EMAILS || process.env.ADMIN_ORDER_EMAIL || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (!to.length) return;
  try {
    await new Resend(apiKey).emails.send({
      from,
      to,
      subject: `ORDER PAID but fulfillment FAILED — ${orderId}`,
      text: `An order was PAID but the production/customer emails could not be generated.\n\nOrder: ${orderId}\nStripe session: ${sessionId}\nCustomer: ${customerEmail ?? "unknown"}\nReason: ${reason}\n\nACTION: pull the design for this order and contact the customer. Do not assume it shipped.`,
    });
  } catch (err) {
    console.error("[email-production] failure alert ALSO failed:", err);
  }
}
