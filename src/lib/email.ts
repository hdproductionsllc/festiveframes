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

// Cartoon sticker palette (matches the homepage + transactional emails).
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

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function itemRows(items: OrderItem[]): string {
  return items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:2px solid ${INK};color:${INK};font-size:14px;">
          ${i.quantity} &times; ${escapeHtml(i.name)}
        </td>
        <td style="padding:8px 0;border-bottom:2px solid ${INK};color:${INK};font-size:14px;text-align:right;white-space:nowrap;">
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
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  <div style="background:${PAGE};padding:28px 12px;font-family:${BODY_FONT};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;">
      <tr><td style="background:${GOLD};border:3px solid ${INK};border-radius:18px 18px 0 0;padding:20px 24px;text-align:center;box-shadow:${SHADOW};">
        <span style="color:${INK};font-size:26px;font-weight:bold;letter-spacing:0.5px;font-family:${DISPLAY_FONT};">Festive Frames</span>
      </td></tr>
      <tr><td style="background:${CARD};border:3px solid ${INK};border-top:none;border-radius:0 0 18px 18px;padding:26px 24px;box-shadow:${SHADOW};">
        <h1 style="margin:0 0 14px;color:${INK};font-size:22px;font-weight:bold;font-family:${DISPLAY_FONT};">${escapeHtml(headline)}</h1>
        ${inner}
        <p style="margin:22px 0 0;color:${INK};font-size:12px;line-height:1.5;">Questions? Reply to this email or reach us at hello@festiveframes.co. Made in the USA, St. Louis, Missouri.</p>
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
        <td style="padding:10px 0 0;color:${PINK};font-size:16px;font-weight:bold;font-family:${DISPLAY_FONT};">Total</td>
        <td style="padding:10px 0 0;color:${PINK};font-size:16px;font-weight:bold;text-align:right;font-family:${DISPLAY_FONT};">${usd(o.totalCents)}</td>
      </tr>
    </table>
    <div style="margin:20px 0 0;padding:14px 16px;background:${PAGE};border:3px solid ${INK};border-radius:14px;box-shadow:${SHADOW};">
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
        <td style="padding:10px 0 0;color:${PINK};font-size:16px;font-weight:bold;font-family:${DISPLAY_FONT};">Total</td>
        <td style="padding:10px 0 0;color:${PINK};font-size:16px;font-weight:bold;text-align:right;font-family:${DISPLAY_FONT};">${usd(o.totalCents)}</td>
      </tr>
    </table>
    <div style="margin:20px 0 0;padding:14px 16px;background:${PAGE};border:3px solid ${INK};border-radius:14px;box-shadow:${SHADOW};">
      <p style="margin:0 0 8px;display:inline-block;padding:5px 12px;background:${RED};color:${PAGE};font-size:12px;font-weight:bold;text-transform:uppercase;border:3px solid ${INK};border-radius:99px;">Fulfillment</p>
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

/**
 * Emails a visitor the link to CONTINUE a design they saved (the "Save my design"
 * flow). No-ops gracefully when Resend isn't configured; returns whether it sent.
 */
export async function sendRestoreLinkEmail(p: {
  to: string;
  name: string | null;
  url: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set; skipping restore-link email.");
    return false;
  }
  const from = process.env.EMAIL_FROM || "Festive Frames <onboarding@resend.dev>";
  const resend = new Resend(apiKey);
  const hi = p.name ? `, ${escapeHtml(p.name.split(" ")[0])}` : "";
  try {
    await resend.emails.send({
      from,
      to: p.to,
      subject: "Your Festive Frames design — pick up where you left off",
      html: shell(
        `Your design is saved${hi}!`,
        `<p style="margin:0 0 16px;color:${INK};font-size:14px;line-height:1.6;">Your custom license-plate frame is safe. Reopen the builder exactly where you left off — tweak it, then order when you're ready.</p>
         <p style="margin:0 0 8px;text-align:center;">
           <a href="${escapeHtml(p.url)}" style="display:inline-block;padding:12px 26px;background:${PINK};color:#fff;font-size:15px;font-weight:bold;text-decoration:none;border:3px solid ${INK};border-radius:99px;box-shadow:${SHADOW};font-family:${DISPLAY_FONT};">Continue your design &rarr;</a>
         </p>
         <p style="margin:18px 0 0;color:${INK};font-size:12px;line-height:1.5;word-break:break-all;">Or paste this link into your browser:<br/><a href="${escapeHtml(p.url)}" style="color:${BLUE};">${escapeHtml(p.url)}</a></p>`,
      ),
    });
    return true;
  } catch (err) {
    console.error("[email] restore-link email failed:", err);
    return false;
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
        `<p style="margin:0 0 8px;color:${PINK};font-size:16px;font-weight:bold;font-family:${DISPLAY_FONT};">${escapeHtml(r.name)}</p>
         <blockquote style="margin:0;padding:12px 16px;background:${PAGE};border:3px solid ${INK};border-radius:14px;box-shadow:${SHADOW};color:${INK};font-size:14px;line-height:1.6;font-style:italic;">&ldquo;${escapeHtml(r.body)}&rdquo;</blockquote>
         <p style="margin:16px 0 0;color:${INK};font-size:12px;">Verify this is genuine, then add it to src/content/copy.ts (home.reviews) to publish.</p>`,
      ),
    });
  } catch (err) {
    console.error("[email] review email failed:", err);
  }
}

export interface ContactSubmission {
  name: string;
  email: string;
  message: string;
}

/**
 * Emails a custom-order inquiry from the homepage contact form to the team.
 * Sets replyTo to the customer so the team can reply straight from their inbox.
 * No-ops gracefully when Resend isn't configured. Never throws.
 */
export async function sendContactEmail(c: ContactSubmission): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const adminTo = process.env.ADMIN_ORDER_EMAIL;
  if (!apiKey || !adminTo) {
    // Not configured → report FAILURE so the caller can tell the customer to
    // email us directly, instead of falsely confirming a delivered inquiry.
    console.warn("[email] contact inquiry (not sent, missing config):", c);
    return false;
  }
  const from = process.env.EMAIL_FROM || "Festive Frames <onboarding@resend.dev>";
  const resend = new Resend(apiKey);
  try {
    await resend.emails.send({
      from,
      to: adminTo,
      replyTo: c.email,
      subject: `Custom order inquiry from ${c.name}`,
      html: shell(
        "New custom order inquiry",
        `<p style="margin:0 0 8px;color:${INK};font-size:13px;">
           <strong>From:</strong> ${escapeHtml(c.name)} &lt;${escapeHtml(c.email)}&gt;
         </p>
         <div style="margin:14px 0 0;padding:14px 16px;background:${PAGE};border:3px solid ${INK};border-radius:14px;box-shadow:${SHADOW};">
           <p style="margin:0 0 8px;display:inline-block;padding:5px 12px;background:${BLUE};color:${INK};font-size:12px;font-weight:bold;text-transform:uppercase;border:3px solid ${INK};border-radius:99px;">What they're celebrating</p>
           <p style="margin:0;color:${INK};font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(c.message)}</p>
         </div>`,
      ),
    });
    return true;
  } catch (err) {
    console.error("[email] contact email failed:", err);
    return false;
  }
}
