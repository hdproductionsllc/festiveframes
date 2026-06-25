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
import { partsListCsv, partsListHtml, type PartsList } from "@/lib/order/parts-list";

const NAVY = "#1B2A4A";
const NAVY_DEEP = "#0F1B33";
const CREAM = "#F4ECD8";
const RED = "#C8102E";
const INK = "#14213A";

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
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function shell(headline: string, inner: string): string {
  return `
  <div style="background:${CREAM};padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr><td style="background:${NAVY_DEEP};border-radius:10px 10px 0 0;padding:20px 24px;text-align:center;">
        <span style="color:${CREAM};font-size:22px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Festive Frames</span>
      </td></tr>
      <tr><td style="background:#FAF3E1;border:1px solid #e4d7b6;border-top:none;border-radius:0 0 10px 10px;padding:24px;">
        <h1 style="margin:0 0 12px;color:${NAVY};font-size:20px;">${esc(headline)}</h1>
        ${inner}
        <p style="margin:20px 0 0;color:${INK};font-size:12px;opacity:0.7;">Made to order in the USA · St. Louis, Missouri. Questions? Reach a real human at hello@festiveframes.co.</p>
      </td></tr>
    </table>
  </div>`;
}

/** data: URL -> { base64 content, contentType } for a Resend attachment. */
function toAttachment(img: NamedImage): { filename: string; content: string; contentType: string } | null {
  const m = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(img.dataUrl);
  if (!m) return null;
  return { filename: `${img.name}.png`, content: m[2], contentType: m[1] };
}

function shippingBlock(lines: string[]): string {
  const body = lines.filter(Boolean).map((l) => esc(l)).join("<br/>");
  return `
    <p style="margin:0 0 4px;color:${INK};font-size:14px;"><strong>Ship to:</strong></p>
    <p style="margin:0;color:${INK};font-size:13px;line-height:1.5;">${body || "Address on file"}</p>`;
}

const FOUNDERS_THANK_YOU = `
  <div style="margin:18px 0 0;padding:16px 18px;background:${CREAM};border-radius:8px;">
    <p style="margin:0 0 8px;color:${NAVY};font-size:15px;font-weight:bold;">A thank-you from the founders</p>
    <p style="margin:0;color:${INK};font-size:14px;line-height:1.6;">
      Every frame is made to order, by hand, right here in the USA — and yours is now in our shop.
      Thank you for flying your colors with us. We can't wait for you to see it on your car.
    </p>
    <p style="margin:10px 0 0;color:${INK};font-size:14px;font-style:italic;">— Henry, Becky &amp; Bill</p>
  </div>`;

function productionHtml(o: ProductionOrderInput): string {
  const fileList = [
    o.proof ? "the full composite proof" : null,
    o.printSheets.length ? `${o.printSheets.length} eufyMake print sheet(s)` : "⚠ NO print sheet (ordered on mobile — regenerate on desktop from /build)",
    o.banners.length ? `${o.banners.length} banner file(s)` : null,
    "the parts-list CSV",
  ].filter(Boolean).join(", ");

  return shell(
    `Production order — ${esc(o.parts.designName || "Custom frame")}`,
    `
    <p style="margin:0 0 8px;color:${RED};font-size:13px;font-weight:bold;text-transform:uppercase;">New paid order · ${usd(o.amountTotalCents)}</p>
    <p style="margin:0 0 8px;color:${INK};font-size:13px;">
      <strong>Order:</strong> ${esc(o.orderId)}<br/>
      <strong>Stripe:</strong> ${esc(o.sessionId)}<br/>
      <strong>Customer:</strong> ${esc(o.customerName ?? "—")} &lt;${esc(o.customerEmail ?? "—")}&gt;<br/>
      <strong>Plate:</strong> ${esc(o.parts.plateState)}${o.parts.qr.enabled ? ` · <strong>QR:</strong> ${esc(o.parts.qr.url)}` : ""}
    </p>
    <p style="margin:0 0 12px;color:${INK};font-size:13px;"><strong>Bill — attached for the eufy:</strong> ${esc(fileList)}.</p>
    ${partsListHtml(o.parts)}
    <div style="margin:16px 0 0;padding:14px 16px;background:${CREAM};border-radius:8px;">${shippingBlock(o.shippingLines)}</div>`,
  );
}

/** Concise plain-text alternative for the founders/production email. */
function productionText(o: ProductionOrderInput): string {
  const fileList = [
    o.proof ? "the full composite proof" : null,
    o.printSheets.length ? `${o.printSheets.length} eufyMake print sheet(s)` : "NO print sheet (ordered on mobile — regenerate on desktop from /build)",
    o.banners.length ? `${o.banners.length} banner file(s)` : null,
    "the parts-list CSV",
  ].filter(Boolean).join(", ");
  const ship = o.shippingLines.filter(Boolean).join("\n") || "Address on file";
  return [
    `PRODUCTION ORDER — ${o.parts.designName || "Custom frame"}`,
    `New paid order · ${usd(o.amountTotalCents)}`,
    ``,
    `Order: ${o.orderId}`,
    `Stripe: ${o.sessionId}`,
    `Customer: ${o.customerName ?? "—"} <${o.customerEmail ?? "—"}>`,
    `Plate: ${o.parts.plateState}${o.parts.qr.enabled ? ` · QR: ${o.parts.qr.url}` : ""}`,
    ``,
    `Bill — attached for the eufy: ${fileList}.`,
    `Files attached to this email.`,
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
    `— Henry, Becky & Bill`,
    ``,
    `Made to order in the USA · St. Louis, Missouri.`,
    `Questions? Reach a real human at hello@festiveframes.co.`,
  ].join("\n");
}

function customerHtml(o: ProductionOrderInput): string {
  const first = o.customerName ? `, ${esc(o.customerName.split(" ")[0])}` : "";
  const proofImg = o.proof ? `<div style="margin:16px 0;text-align:center;"><img src="cid:proof" alt="Your frame proof" style="max-width:100%;border:1px solid #e4d7b6;border-radius:8px;"/></div>` : "";
  return shell(
    `You're in${first}! 🎆`,
    `
    <p style="margin:0 0 12px;color:${INK};font-size:14px;line-height:1.6;">
      Thanks for your order — it's confirmed and headed into production. Here's a proof of the exact
      license-plate frame you designed:
    </p>
    ${proofImg}
    <p style="margin:0 0 4px;color:${INK};font-size:14px;"><strong>Order:</strong> ${esc(o.orderId)} · <strong>Total:</strong> ${usd(o.amountTotalCents)}</p>
    <div style="margin:14px 0 0;padding:12px 14px;background:${CREAM};border-radius:8px;">${shippingBlock(o.shippingLines)}</div>
    ${FOUNDERS_THANK_YOU}`,
  );
}

/**
 * Sends the production (founders) email and the customer confirmation/proof
 * email. No-ops gracefully when Resend isn't configured. Never throws — the
 * caller decides what to do with the boolean result.
 */
export async function sendProductionEmails(o: ProductionOrderInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email-production] RESEND_API_KEY not set; skipping production emails.");
    return false;
  }
  const from = process.env.EMAIL_FROM || "Festive Frames <onboarding@resend.dev>";
  const adminTo = process.env.ADMIN_ORDER_EMAIL;
  const founderList = (process.env.PRODUCTION_EMAILS || adminTo || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const resend = new Resend(apiKey);

  // ── Production email (founders) — all artifacts attached. ──
  if (founderList.length) {
    const attachments = [
      { filename: `${o.parts.designName || "order"}-parts-list.csv`, content: Buffer.from(partsListCsv(o.parts, o.orderId, o.customerName ?? "")).toString("base64"), contentType: "text/csv" },
      ...o.printSheets.map(toAttachment),
      ...o.banners.map(toAttachment),
      o.proof ? toAttachment(o.proof) : null,
    ].filter(Boolean) as { filename: string; content: string; contentType: string }[];

    try {
      await resend.emails.send({
        from,
        to: founderList,
        replyTo: o.customerEmail ?? undefined,
        subject: `PRODUCTION — ${o.parts.designName || "Custom frame"} — ${o.customerName ?? o.customerEmail ?? o.orderId}`,
        html: productionHtml(o),
        text: productionText(o),
        attachments,
      });
    } catch (err) {
      console.error("[email-production] founders email failed:", err);
      throw err; // let fulfillOrder trigger the failure alert
    }
  } else {
    console.warn("[email-production] no PRODUCTION_EMAILS/ADMIN_ORDER_EMAIL; founders email skipped.");
  }

  // ── Customer email (confirmation + proof + thank-you). ──
  if (o.customerEmail) {
    const customerAttachments = o.proof
      ? [{ ...toAttachment(o.proof)!, contentId: "proof" }]
      : [];
    try {
      await resend.emails.send({
        from,
        to: o.customerEmail,
        ...(founderList.length ? { bcc: founderList } : {}),
        subject: "Your Festive Frames order is confirmed",
        html: customerHtml(o),
        text: customerText(o),
        attachments: customerAttachments,
      });
    } catch (err) {
      console.error("[email-production] customer email failed:", err);
    }
  }
  return true;
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
