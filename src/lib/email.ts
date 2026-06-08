// ─────────────────────────────────────────────────────────────
// Transactional order emails via Resend.
//
// sendOrderEmails() fires two emails after a paid order:
//   1. a branded confirmation to the CUSTOMER
//   2. an order-details email to the ADMIN (for fulfillment)
//
// Fully graceful: if RESEND_API_KEY is missing it no-ops (the webhook
// still returns 200). Never throws — the caller wraps it anyway.
//
// Env:
//   RESEND_API_KEY     required to send anything
//   EMAIL_FROM         e.g. "Festive Frames <orders@festiveframes.co>"
//                      (the domain must be verified in Resend)
//   ADMIN_ORDER_EMAIL  where order-details emails go (your inbox)
// ─────────────────────────────────────────────────────────────

import { Resend } from "resend";

export interface OrderItem {
  name: string;
  quantity: number;
  amountCents: number;
}

export interface OrderEmailData {
  sessionId: string;
  customerEmail: string | null;
  customerName: string | null;
  items: OrderItem[];
  totalCents: number;
  currency: string;
  shippingName: string | null;
  shippingAddress: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
}

const NAVY = "#1B2A4A";
const NAVY_DEEP = "#0F1B33";
const CREAM = "#F4ECD8";
const RED = "#C8102E";
const INK = "#14213A";

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function itemRows(items: OrderItem[]): string {
  return items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e4d7b6;color:${INK};font-size:14px;">
          ${i.quantity} &times; ${escapeHtml(i.name)}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #e4d7b6;color:${INK};font-size:14px;text-align:right;white-space:nowrap;">
          ${usd(i.amountCents)}
        </td>
      </tr>`,
    )
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function fulfillmentBlock(o: OrderEmailData): string {
  const a = o.shippingAddress;
  const lines = [
    o.shippingName,
    a?.line1,
    a?.line2,
    [a?.city, a?.state, a?.postal_code].filter(Boolean).join(", "),
    a?.country,
  ]
    .filter(Boolean)
    .map((l) => escapeHtml(String(l)))
    .join("<br/>");
  return `
    <p style="margin:0 0 4px;color:${INK};font-size:14px;"><strong>Shipping to:</strong></p>
    <p style="margin:0;color:${INK};font-size:13px;line-height:1.5;">${lines || "Address on file"}</p>`;
}

function shell(headline: string, inner: string): string {
  return `
  <div style="background:${CREAM};padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr><td style="background:${NAVY_DEEP};border-radius:10px 10px 0 0;padding:20px 24px;text-align:center;">
        <span style="color:${CREAM};font-size:22px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Festive Frames</span>
      </td></tr>
      <tr><td style="background:#FAF3E1;border:1px solid #e4d7b6;border-top:none;border-radius:0 0 10px 10px;padding:24px;">
        <h1 style="margin:0 0 12px;color:${NAVY};font-size:20px;">${escapeHtml(headline)}</h1>
        ${inner}
        <p style="margin:20px 0 0;color:${INK};font-size:12px;opacity:0.7;">Questions? Reply to this email or reach us at hello@festiveframes.co. Made in the USA, St. Louis, Missouri.</p>
      </td></tr>
    </table>
  </div>`;
}

function customerHtml(o: OrderEmailData): string {
  const name = o.customerName ? `, ${escapeHtml(o.customerName.split(" ")[0])}` : "";
  return shell(
    `You're in${name}!`,
    `
    <p style="margin:0 0 16px;color:${INK};font-size:14px;line-height:1.6;">Thanks for your order. Here is what is on the way:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${itemRows(o.items)}
      <tr>
        <td style="padding:10px 0 0;color:${NAVY};font-size:15px;font-weight:bold;">Total</td>
        <td style="padding:10px 0 0;color:${NAVY};font-size:15px;font-weight:bold;text-align:right;">${usd(o.totalCents)}</td>
      </tr>
    </table>
    <div style="margin:18px 0 0;padding:14px 16px;background:${CREAM};border-radius:8px;">
      ${fulfillmentBlock(o)}
    </div>`,
  );
}

function adminHtml(o: OrderEmailData): string {
  return shell(
    `New order - ${usd(o.totalCents)}`,
    `
    <p style="margin:0 0 8px;color:${INK};font-size:13px;">
      <strong>Customer:</strong> ${escapeHtml(o.customerName ?? "—")} &lt;${escapeHtml(o.customerEmail ?? "—")}&gt;<br/>
      <strong>Order:</strong> ${escapeHtml(o.sessionId)}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${itemRows(o.items)}
      <tr>
        <td style="padding:10px 0 0;color:${NAVY};font-size:15px;font-weight:bold;">Total</td>
        <td style="padding:10px 0 0;color:${NAVY};font-size:15px;font-weight:bold;text-align:right;">${usd(o.totalCents)}</td>
      </tr>
    </table>
    <div style="margin:18px 0 0;padding:14px 16px;background:${CREAM};border-radius:8px;">
      <p style="margin:0 0 6px;color:${RED};font-size:13px;font-weight:bold;text-transform:uppercase;">Fulfillment</p>
      ${fulfillmentBlock(o)}
    </div>`,
  );
}

/**
 * Sends the customer confirmation and admin order emails. No-ops (with a
 * warning) when RESEND_API_KEY is not configured. Never throws.
 */
export async function sendOrderEmails(o: OrderEmailData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set; skipping order emails.");
    return;
  }

  const from = process.env.EMAIL_FROM || "Festive Frames <onboarding@resend.dev>";
  const adminTo = process.env.ADMIN_ORDER_EMAIL;
  const resend = new Resend(apiKey);

  if (o.customerEmail) {
    try {
      await resend.emails.send({
        from,
        to: o.customerEmail,
        subject: "Your Festive Frames order is confirmed",
        html: customerHtml(o),
      });
    } catch (err) {
      console.error("[email] customer confirmation failed:", err);
    }
  }

  if (adminTo) {
    try {
      await resend.emails.send({
        from,
        to: adminTo,
        replyTo: o.customerEmail ?? undefined,
        subject: `New order - ${usd(o.totalCents)} - ${o.customerEmail ?? "unknown"}`,
        html: adminHtml(o),
      });
    } catch (err) {
      console.error("[email] admin order email failed:", err);
    }
  } else {
    console.warn("[email] ADMIN_ORDER_EMAIL not set; skipping admin notification.");
  }
}

export interface ReviewSubmission {
  rating: number;
  body: string;
  name: string;
}

/**
 * Emails a customer-submitted review to the team to vet and (if genuine) add
 * to the live reviews. No-ops gracefully when Resend isn't configured.
 */
export async function sendReviewEmail(r: ReviewSubmission): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const adminTo = process.env.ADMIN_ORDER_EMAIL;
  if (!apiKey || !adminTo) {
    console.warn("[email] review (not sent, missing config):", r);
    return;
  }
  const from = process.env.EMAIL_FROM || "Festive Frames <onboarding@resend.dev>";
  const stars = "★".repeat(r.rating) + "☆".repeat(Math.max(0, 5 - r.rating));
  const resend = new Resend(apiKey);
  try {
    await resend.emails.send({
      from,
      to: adminTo,
      subject: `New review (${r.rating}/5) from ${r.name}`,
      html: shell(
        `New review - ${stars}`,
        `<p style="margin:0 0 8px;color:${NAVY};font-size:15px;font-weight:bold;">${escapeHtml(r.name)}</p>
         <blockquote style="margin:0;color:${INK};font-size:14px;line-height:1.6;font-style:italic;">&ldquo;${escapeHtml(r.body)}&rdquo;</blockquote>
         <p style="margin:16px 0 0;color:${INK};font-size:12px;opacity:0.7;">Verify this is genuine, then add it to src/content/copy.ts (home.reviews) to publish.</p>`,
      ),
    });
  } catch (err) {
    console.error("[email] review email failed:", err);
  }
}
