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
//   EMAIL_FROM         the Festive Frames sender (holiday kit orders)
//   PRODUCTION_EMAILS  comma-separated founder inboxes for Festive Frames orders.
//                      Falls back to ADMIN_ORDER_EMAIL if unset.
//   ADMIN_ORDER_EMAIL  fallback / always-copied admin inbox.
//   MSF_ORDER_EMAIL,   MySchoolFrame's own inbox and sender — every email with
//   MSF_EMAIL_FROM     brand "myschoolframe" uses these instead (lib/email-msf).
// ─────────────────────────────────────────────────────────────

import { Resend } from "resend";
import { sendOrThrow } from "@/lib/resend-send";
import { partsListCsv, partsListHtml, type PartsList, type PanelPartsList } from "@/lib/order/parts-list";
import { SITE_URL } from "@/config/season";
import { copy } from "@/content/copy";
import { SCHOOL_CONTACT_EMAIL } from "@/content/school-contact";
import { MSF_WARRANTY_PATH } from "@/content/msf-pages";
import { designLinkEmailAvailable, msfFrom, msfOrderRecipients } from "@/lib/email-msf";

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

// ─── Two brands, one deployment ──────────────────────────────────────────────
// A school-frame order is a MySchoolFrame sale. It rides the same fulfilment as a
// Festive Frames custom frame, and until this existed the parent's confirmation
// arrived as "Your Festive Frames order is confirmed" under a gold Festive Frames
// header — a different company's name on the receipt for the frame they bought.

/** Which of the two brands sharing this deployment an email speaks for. */
export type EmailBrand = "festive-frames" | "myschoolframe";

const MSF_NAVY = "#1b2a4a";
/** The owner's logo reversed for a navy ground (public/brand). Hosted, not
 *  attached: an inline attachment shows up as a stray file in several clients. */
const MSF_LOGO_URL = `${SITE_URL}/brand/msf-logo-reverse.png`;

const BRAND_NAME: Record<EmailBrand, string> = {
  "festive-frames": "Festive Frames",
  myschoolframe: "MySchoolFrame",
};

/** The header band. Its alt text is styled so a client that blocks images still
 *  shows the name, on the same navy. */
function brandHeader(brand: EmailBrand): string {
  if (brand === "myschoolframe") {
    return `<tr><td style="background:${MSF_NAVY};border:3px solid ${INK};border-radius:18px 18px 0 0;padding:18px 24px;text-align:center;box-shadow:${SHADOW};">
        <img src="${MSF_LOGO_URL}" width="220" height="113" alt="MySchoolFrame" style="display:inline-block;width:220px;max-width:100%;height:auto;border:0;color:#f6f3ec;font-size:26px;font-weight:bold;font-family:${DISPLAY_FONT};"/>
      </td></tr>`;
  }
  return `<tr><td style="background:${GOLD};border:3px solid ${INK};border-radius:18px 18px 0 0;padding:20px 24px;text-align:center;box-shadow:${SHADOW};">
        <span style="color:${INK};font-size:26px;font-weight:bold;letter-spacing:0.5px;font-family:${DISPLAY_FONT};">Festive Frames</span>
      </td></tr>`;
}

/** Who an email of this brand is FROM. MySchoolFrame has its own sender
 *  (MSF_EMAIL_FROM, falling back to the verified mailbox — see lib/email-msf). */
export function senderFor(brand: EmailBrand = "festive-frames"): string {
  if (brand === "myschoolframe") return msfFrom();
  return process.env.EMAIL_FROM || "Festive Frames <onboarding@resend.dev>";
}

/** The team inbox(es) an order of this brand goes to. Server-fixed, always:
 *  nothing a customer submits ever reaches this list. */
export function teamRecipientsFor(brand: EmailBrand = "festive-frames"): string[] {
  if (brand === "myschoolframe") return msfOrderRecipients();
  return (process.env.PRODUCTION_EMAILS || process.env.ADMIN_ORDER_EMAIL || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
}

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
  /** Whose order this is. School-frame orders are MySchoolFrame's; default Festive Frames. */
  brand?: EmailBrand;
  /** The money, the school and the artwork record, off the Stripe session
   *  (`orderFacts` in lib/order/fulfill). Absent on a cart line. */
  order?: OrderFacts;
  /**
   * Resend idempotency key for THIS order's emails. Each message gets its own
   * suffix (production, production without sheets, customer), because Resend
   * refuses one key reused with different content. Set by the school order path.
   */
  idempotencyKey?: string;
}

/** What the checkout recorded about an order, for the people who make it. */
export interface OrderFacts {
  /** Stripe's `payment_status`: "paid", or "no_payment_required" for a 100%-off code. */
  paymentStatus: string | null;
  /** Discount Stripe applied (a promotion code), in cents. */
  discountCents: number;
  /** The school slug the frame is for, when it is a school frame. */
  school: string | null;
  /** The per-frame donation promised to that school, in cents. */
  donationCents: number;
  /** The artwork-rights line, and whether uploaded art has NO attestation. */
  artwork: { line: string; unattested: boolean } | null;
  /** The proof the parent approved: design code, revision and when. School
   *  orders only — an order without one is HELD and never reaches this email. */
  approval?: string | null;
}

/**
 * A 100%-off promotion code completes as `no_payment_required`: the frame ships,
 * nothing was collected, and the school ledger (which insists on "paid") credits
 * the club nothing. That order must never reach the printer labelled "paid".
 */
function isNoChargeOrder(o: ProductionOrderInput): boolean {
  if (!o.order) return false;
  return o.order.paymentStatus === "no_payment_required" || o.amountTotalCents === 0;
}

/** The one-line money headline, shared by the HTML pill, the text and the subject. */
function moneyHeadline(o: ProductionOrderInput): string {
  if (isNoChargeOrder(o)) {
    return `$0 COUPON ORDER · no money collected${o.order?.school ? " · school NOT credited" : ""}`;
  }
  const paid = `New paid order · ${usd(o.amountTotalCents)}`;
  const f = o.order;
  return f?.school && f.donationCents > 0 ? `${paid} · ${usd(f.donationCents)} to ${f.school}` : paid;
}

/** The order-record lines under the headline (school, discount, artwork). */
function orderFactLines(o: ProductionOrderInput): Array<{ label: string; value: string; alarm?: boolean }> {
  const f = o.order;
  if (!f) return [];
  const out: Array<{ label: string; value: string; alarm?: boolean }> = [];
  if (f.school) out.push({ label: "School", value: f.school });
  if (f.discountCents > 0) out.push({ label: "Discount", value: `${usd(f.discountCents)} (promotion code)` });
  if (f.artwork) out.push({ label: "Artwork", value: f.artwork.line, alarm: f.artwork.unattested });
  if (f.approval) out.push({ label: "Proof approved", value: f.approval });
  return out;
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function shell(headline: string, inner: string, brand: EmailBrand = "festive-frames"): string {
  return `
  <div style="background:${PAGE};padding:28px 12px;font-family:${BODY_FONT};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;">
      ${brandHeader(brand)}
      <tr><td style="background:${CARD};border:3px solid ${INK};border-top:none;border-radius:0 0 18px 18px;padding:26px 24px;box-shadow:${SHADOW};">
        <h1 style="margin:0 0 14px;color:${INK};font-size:22px;font-weight:bold;font-family:${DISPLAY_FONT};">${esc(headline)}</h1>
        ${inner}
        <p style="margin:22px 0 0;color:${INK};font-size:12px;line-height:1.5;">Made to order in the USA &middot; St. Louis, Missouri. Questions? Reach a real human at ${esc(contactFor(brand))}.</p>
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

/** Where a customer of this brand writes to. One source per brand, never typed. */
function contactFor(brand: EmailBrand = "festive-frames"): string {
  return brand === "myschoolframe" ? SCHOOL_CONTACT_EMAIL : copy.thanks.supportEmail;
}

/**
 * The MySchoolFrame confirmation's own voice. It used to borrow Festive Frames'
 * founders' note — signed by an illustrator who is no longer on the project, with
 * the patriotic product's "flying your colors" — and it never mentioned the
 * one-year warranty the school landing promises.
 */
const MSF_WARRANTY_URL = `${SITE_URL}${MSF_WARRANTY_PATH}`;
const MSF_THANK_YOU_LINES = [
  "Every frame is made to order in St. Louis, and yours is now in our shop.",
  "Thank you for putting your school on your car.",
];
const MSF_SIGNOFF = "— The MySchoolFrame team";
const MSF_THANK_YOU = `
  <div style="margin:20px 0 0;padding:16px 18px;background:${PAGE};border:3px solid ${INK};border-radius:14px;box-shadow:${SHADOW};">
    <p style="margin:0 0 8px;color:${INK};font-size:14px;line-height:1.6;">${MSF_THANK_YOU_LINES.join(" ")}</p>
    <p style="margin:0;color:${INK};font-size:14px;line-height:1.6;">Your frame is covered by our <a href="${MSF_WARRANTY_URL}" style="color:${INK};">one-year warranty</a>. If anything goes wrong, tell us and we'll make it right.</p>
    <p style="margin:10px 0 0;color:${INK};font-size:14px;font-style:italic;">${MSF_SIGNOFF}</p>
  </div>`;

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

  const noCharge = isNoChargeOrder(o);
  const factLines = orderFactLines(o);

  return shell(
    `Production order — ${esc(o.parts.designName || "Custom frame")}`,
    `
    ${multiBanner}
    <p style="margin:0 0 14px;display:inline-block;padding:6px 14px;background:${noCharge ? GOLD : RED};color:${noCharge ? INK : PAGE};font-size:13px;font-weight:bold;text-transform:uppercase;border:3px solid ${INK};border-radius:99px;">${esc(moneyHeadline(o))}</p>
    ${qty > 1 || (c && c.total > 1) ? makeBadge : ""}
    <p style="margin:0 0 8px;color:${INK};font-size:13px;">
      ${c && c.total > 1 ? `<strong>Order ref:</strong> ${esc(c.cartId)} (frame ${c.index} of ${c.total})<br/>` : ""}<strong>This design:</strong> ${esc(o.orderId)}<br/>
      <strong>Stripe:</strong> ${esc(o.sessionId)}<br/>
      <strong>Customer:</strong> ${esc(o.customerName ?? "—")} &lt;${esc(o.customerEmail ?? "—")}&gt;<br/>
      <strong>Plate:</strong> ${esc(o.parts.plateState)}${o.parts.qr.enabled ? ` · <strong>QR:</strong> ${esc(o.parts.qr.url)}` : ""}${factLines
        .map((l) => `<br/>${l.alarm ? `<span style="color:${RED};font-weight:bold;">` : ""}<strong>${esc(l.label)}:</strong> ${esc(l.value)}${l.alarm ? "</span>" : ""}`)
        .join("")}
    </p>
    <p style="margin:0 0 12px;color:${INK};font-size:13px;"><strong>Bill — attached for the eufy:</strong> ${esc(fileList)}.</p>
    ${droppedBlock}
    ${partsListHtml(o.parts)}
    <div style="margin:18px 0 0;padding:14px 16px;background:${PAGE};border:3px solid ${INK};border-radius:14px;box-shadow:${SHADOW};">${shippingBlock(o.shippingLines)}</div>`,
    o.brand,
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
    moneyHeadline(o),
    `MAKE x${qty}`,
    c && c.total > 1
      ? `*** FRAME ${c.index} OF ${c.total} — SAME ORDER (ref ${c.cartId}). Make all ${c.total} and SHIP TOGETHER to ${o.customerName ?? o.customerEmail ?? "this customer"}. ***`
      : null,
    ``,
    `Order: ${o.orderId}`,
    `Stripe: ${o.sessionId}`,
    `Customer: ${o.customerName ?? "—"} <${o.customerEmail ?? "—"}>`,
    `Plate: ${o.parts.plateState}${o.parts.qr.enabled ? ` · QR: ${o.parts.qr.url}` : ""}`,
    ...orderFactLines(o).map((l) => `${l.alarm ? "*** " : ""}${l.label}: ${l.value}${l.alarm ? " ***" : ""}`),
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
    ...(o.brand === "myschoolframe"
      ? [
          ...MSF_THANK_YOU_LINES,
          `Your frame is covered by our one-year warranty: ${MSF_WARRANTY_URL}`,
          MSF_SIGNOFF,
        ]
      : [
          `A thank-you from the founders:`,
          `Every frame is made to order, by hand, right here in the USA — and yours`,
          `is now in our shop. Thank you for flying your colors with us. We can't`,
          `wait for you to see it on your car.`,
          `— Becky, Bill and Henry`,
        ]),
    ``,
    `Made to order in the USA · St. Louis, Missouri.`,
    `Questions? Reach a real human at ${contactFor(o.brand)}.`,
  ].join("\n");
}

function customerHtml(o: ProductionOrderInput): string {
  const first = o.customerName ? `, ${esc(o.customerName.split(" ")[0])}` : "";
  const proofImg = o.proof ? `<div style="margin:18px 0;text-align:center;"><img src="cid:proof" alt="Your frame proof" style="max-width:100%;border:3px solid ${INK};border-radius:14px;box-shadow:${SHADOW};"/></div>` : "";
  const brand = o.brand ?? "festive-frames";
  return shell(
    // The fireworks are Festive Frames' Fourth-of-July voice, not a school's.
    brand === "festive-frames" ? `You're in${first}! 🎆` : `You're in${first}!`,
    `
    <p style="margin:0 0 12px;color:${INK};font-size:14px;line-height:1.6;">
      Thanks for your order — it's confirmed and headed into production. Here's a proof of the exact
      license-plate frame you designed:
    </p>
    ${proofImg}
    <p style="margin:0 0 4px;padding-left:12px;border-left:5px solid ${BLUE};color:${INK};font-size:14px;"><strong>Order:</strong> ${esc(o.orderId)} · <strong>Total:</strong> ${usd(o.amountTotalCents)}</p>
    <div style="margin:16px 0 0;padding:14px 16px;background:${PAGE};border:3px solid ${INK};border-radius:14px;box-shadow:${SHADOW};">${shippingBlock(o.shippingLines)}</div>
    ${brand === "myschoolframe" ? MSF_THANK_YOU : FOUNDERS_THANK_YOU}`,
    brand,
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
  const brand = o.brand ?? "festive-frames";
  // One sender and one team inbox per brand: a MySchoolFrame order goes from and
  // to MySchoolFrame (lib/email-msf); a Festive Frames order is untouched.
  const from = senderFor(brand);
  const founderList = teamRecipientsFor(brand);
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

  // Where the files can be had again. A school order's draft (panels, proof and
  // design) is kept once it is fulfilled; a /build order is re-rendered from its
  // design in the builder.
  const droppedMessage = brand === "myschoolframe"
    ? `Print files too large to attach — they are kept with order ${o.orderId} on the server; ask Henry to pull them.`
    : "Print sheet(s) too large to attach — regenerate on desktop from the order's design (it's saved).";

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
      : `${isNoChargeOrder(o) ? "PRODUCTION ($0 COUPON)" : "PRODUCTION"} — ${o.parts.designName || "Custom frame"} — ${o.customerName ?? o.customerEmail ?? o.orderId}`;
  const key = (suffix: string) => (o.idempotencyKey ? { idempotencyKey: `${o.idempotencyKey}/${suffix}` } : undefined);
  const sendFounders = () =>
    sendOrThrow(
      resend,
      {
        from,
        to: founderList,
        replyTo: o.customerEmail ?? undefined,
        subject,
        html: productionHtml(o, droppedNote),
        text: productionText(o, droppedNote),
        attachments,
      },
      key(includeSheets ? "production" : "production-no-sheets"),
    );

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
      await sendOrThrow(
        resend,
        {
          from,
          to: o.customerEmail,
          bcc: founderList,
          subject: `Your ${BRAND_NAME[brand]} order is confirmed`,
          html: customerHtml(o),
          text: customerText(o),
          attachments: customerAttachments,
        },
        key("customer"),
      );
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown error";
      console.error("[email-production] customer email failed:", err);
      await sendFulfillmentFailureAlert(
        o.orderId,
        o.sessionId,
        o.customerEmail,
        `Production email SENT, but the CUSTOMER CONFIRMATION email FAILED (${reason}). Reach out to the customer manually — their order IS in production.`,
        brand,
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
    `Questions? Reach a real human at ${contactFor()}.`,
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
  // Carts are Festive Frames only (a school checkout is one frame).
  const from = senderFor("festive-frames");
  const founderList = teamRecipientsFor("festive-frames");
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
    await sendOrThrow(resend, {
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
// Recipient is MySchoolFrame's inbox (MSF_ORDER_EMAIL, defaulting to
// SCHOOL_CONTACT_EMAIL — lib/email-msf) — NEVER from the request body. Never throws:
// it returns a typed result so the route can answer honestly ("sent" vs "email not
// configured").
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
  /**
   * One line about where the artwork came from (`order/artwork-rights`).
   *
   * It is on the ORDER EMAIL because that is the desk where somebody decides to
   * print. An order carrying a customer's uploaded mascot with no attestation on
   * record is the one an operator must stop and look at, and a note that only
   * exists in a database is a note nobody reads at the moment it matters.
   */
  artworkNote?: string;
  /**
   * Who sent the design, so a person can reply: `orderContactLine(contact)`, the
   * one plain-text line the body prints. Only the LINE crosses into the email —
   * the parsed address never sits on this input, so it is not one edit away from
   * a to/cc/bcc/replyTo, which stay the production inbox and nothing else.
   */
  contactNote?: string;
  /**
   * The saved design this send stored (lib/school-designs), when the save worked:
   * its code and revision number, so "MSF-7K3Q-X2PA, revision 2" in this inbox and
   * the parent's link name the same frozen design. Absent = not stored; the email
   * says so, because the parent was then told their link could not be made.
   */
  saved?: { code: string; revision: number } | null;
}

export type SchoolOrderResult =
  | { ok: true }
  | { ok: false; reason: "email-not-configured" | "invalid-attachment" | "attachment-too-large" | "send-failed" };

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
  artworkNote = "",
  contactNote = "",
  saved: SchoolOrderInput["saved"] = null,
): string {
  const savedBlock = `<p style="margin:0 0 8px;color:${INK};font-size:14px;"><strong>Saved as:</strong> ${
    saved ? `${esc(saved.code)} &middot; revision ${saved.revision}` : "NOT SAVED (storage failed) &mdash; these attachments are the only copy"
  }</p>`;
  const contactBlock = contactNote
    ? `<p style="margin:0 0 12px;color:${INK};font-size:14px;"><strong>Reply to:</strong> ${esc(contactNote)}</p>`
    : "";
  const partsBlock = parts
    ? `<div style="margin:18px 0 0;">${partsListHtml(parts)}</div>`
    : `<p style="margin:14px 0 0;color:${INK};font-size:13px;">No parts list was included — the print files are attached.</p>`;
  const filesNote = panelCount
    ? `<strong>${panelCount} panel print files</strong> are attached — print and position each one separately on the bed. The <strong>OVERVIEW</strong> attachment shows the assembled layout (do not print it).`
    : `The print-ready file is attached to this email.`;
  // Flagged when there is uploaded art with nothing on record — the one case an
  // operator must not skim past. Escaped like every other body string.
  const artworkAlarm = artworkNote.includes("NO RIGHTS ATTESTATION");
  const artworkBlock = artworkNote
    ? `<p style="margin:0 0 12px;padding:8px 12px;border:3px solid ${INK};border-radius:12px;background:${artworkAlarm ? "#ffe2e2" : PAGE};color:${INK};font-size:13px;font-weight:${artworkAlarm ? "bold" : "normal"};">${esc(artworkNote)}</p>`
    : "";
  return shell(
    `New school frame order — ${esc(designName || "Untitled")}`,
    `
    <p style="margin:0 0 14px;display:inline-block;padding:6px 14px;background:${BLUE};color:${PAGE};font-size:13px;font-weight:bold;text-transform:uppercase;border:3px solid ${INK};border-radius:99px;">New school order</p>
    <p style="margin:0 0 8px;color:${INK};font-size:14px;">
      <strong>Design:</strong> ${esc(designName || "Untitled")}
    </p>
    ${savedBlock}
    ${contactBlock}
    <p style="margin:0 0 12px;color:${INK};font-size:13px;">${filesNote}</p>
    ${artworkBlock}
    ${partsBlock}`,
    "myschoolframe",
  );
}

function schoolOrderText(
  designName: string,
  panelCount = 0,
  artworkNote = "",
  contactNote = "",
  saved: SchoolOrderInput["saved"] = null,
): string {
  return [
    `NEW SCHOOL FRAME ORDER`,
    ``,
    `Design: ${designName || "Untitled"}`,
    `Saved as: ${saved ? `${saved.code} · revision ${saved.revision}` : "NOT SAVED (storage failed) — these attachments are the only copy"}`,
    ...(contactNote ? [`Reply to: ${contactNote}`] : []),
    ...(artworkNote ? [``, artworkNote] : []),
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

  const from = senderFor("myschoolframe");
  const to = teamRecipientsFor("myschoolframe");
  // Strip control chars from the subject so a crafted design name can't inject a
  // header line; the HTML body escapes it separately via esc().
  const subjectName = (o.designName || "Untitled").replace(/[\r\n\t]+/g, " ").slice(0, 120);

  try {
    await sendOrThrow(new Resend(apiKey), {
      from,
      to,
      subject: `SCHOOL ORDER — ${subjectName}${o.saved ? ` — ${o.saved.code} r${o.saved.revision}` : ""}`,
      html: schoolOrderHtml(
        o.designName,
        o.partsList ?? null,
        panelAttachments.length,
        o.artworkNote ?? "",
        o.contactNote ?? "",
        o.saved ?? null,
      ),
      text: schoolOrderText(o.designName, panelAttachments.length, o.artworkNote ?? "", o.contactNote ?? "", o.saved ?? null),
      attachments,
    });
    return { ok: true };
  } catch (err) {
    console.error("[email-production] school order email failed:", err);
    return { ok: false, reason: "send-failed" };
  }
}

/**
 * The parent's link to their own saved design — THE ONE email that goes to an
 * address a parent typed (see the rule and its exception in lib/email-msf).
 *
 * Only ever called when the parent ticked "Email me a link" in the same request,
 * and only while `designLinkEmailAvailable()`. It carries the link and the code
 * and nothing else — no print files, no marketing — and replies go to
 * MySchoolFrame's inbox, never to a mailbox nobody reads. Never throws: failing
 * to send the link must not fail the send it belongs to; the result says which.
 */
export async function sendDesignLinkEmail(o: {
  to: string;
  code: string;
  url: string;
  schoolName: string | null;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !designLinkEmailAvailable()) return false;
  const where = o.schoolName ? ` ${o.schoolName}` : "";
  const html = shell(
    "Your frame design is saved",
    `
    <p style="margin:0 0 12px;color:${INK};font-size:15px;line-height:1.6;">Here&rsquo;s the link to your${esc(where)} frame design. Open it on any phone or computer to see it or keep working on it.</p>
    <p style="margin:18px 0;text-align:center;">
      <a href="${esc(o.url)}" style="display:inline-block;padding:12px 22px;background:${MSF_NAVY};color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;border:3px solid ${INK};border-radius:99px;">Open my design</a>
    </p>
    <p style="margin:0 0 8px;color:${INK};font-size:14px;">Your design code is <strong>${esc(o.code)}</strong>. If you talk to us about it, that&rsquo;s the number we&rsquo;ll ask for.</p>
    <p style="margin:0;color:${INK};font-size:13px;line-height:1.5;">Anyone with this link can open and change the design, so share it only with people you&rsquo;d like to help. Nothing prints until you&rsquo;ve seen it and said yes.</p>`,
    "myschoolframe",
  );
  const text = [
    `Your${where} frame design is saved.`,
    ``,
    `Open it on any phone or computer: ${o.url}`,
    ``,
    `Your design code is ${o.code}.`,
    `Anyone with this link can open and change the design, so share it only with people you'd like to help.`,
    `Nothing prints until you've seen it and said yes.`,
  ].join("\n");
  try {
    await sendOrThrow(new Resend(apiKey), {
      from: senderFor("myschoolframe"),
      to: [o.to],
      replyTo: msfOrderRecipients(),
      subject: `Your MySchoolFrame design (${o.code})`,
      html,
      text,
    });
    return true;
  } catch (err) {
    console.error("[email-production] design link email failed:", err);
    return false;
  }
}

/**
 * A staff member's one-time sign-in link to the /admin dashboard (lib/admin/auth).
 * The recipient is an address on the SERVER's staff list (ADMIN_EMAILS) — the
 * caller has already checked — so this keeps the rule that nothing a stranger
 * types becomes a recipient. Returns whether it went.
 */
export async function sendAdminSignInEmail(o: { to: string; url: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    await sendOrThrow(new Resend(apiKey), {
      from: senderFor("myschoolframe"),
      to: [o.to],
      subject: "Your MySchoolFrame dashboard sign-in link",
      text: [
        "Here is your sign-in link for the MySchoolFrame dashboard:",
        "",
        o.url,
        "",
        "It works once and expires in 15 minutes. If you didn't ask for it, ignore this email — nobody can use it without access to your inbox.",
      ].join("\n"),
    });
    return true;
  } catch (err) {
    console.error("[email-production] admin sign-in email failed:", err);
    return false;
  }
}

/**
 * Plain-text alert that somebody asked for a school we do not have.
 *
 * INTERNAL ONLY: it goes to MySchoolFrame's inbox (MSF_ORDER_EMAIL, default
 * bill@myschoolframe.com) and nowhere else. The REQUESTER is never mailed — their
 * address is in the body so a human can choose to reply; see the rule at the top
 * of lib/school-requests.ts.
 *
 * Here rather than in the route because this is the one module that constructs a
 * Resend client, and a second one somewhere else is a second place to get the
 * from-address, the key handling and the failure behaviour wrong. Same shape as
 * `sendFulfillmentFailureAlert` below it: never throws, logs and moves on, because
 * failing to notify ourselves must not fail the parent's request.
 */
export async function sendSchoolRequestAlert(
  req: { id: string; schoolName: string; city: string; state: string; email: string | null; note: string | null },
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const from = senderFor("myschoolframe");
  const to = teamRecipientsFor("myschoolframe");
  // Strip control chars from the subject so a crafted school name cannot inject a
  // header line — the same guard the school-order subject carries.
  const subjectName = req.schoolName.replace(/[\r\n\t]+/g, " ").slice(0, 120);
  try {
    await sendOrThrow(new Resend(apiKey), {
      from,
      to,
      subject: `SCHOOL REQUESTED — ${subjectName}`,
      text: `Somebody searched for a school we do not have and asked for it.\n\nSchool: ${req.schoolName}\nCity: ${req.city}, ${req.state}\nFrom: ${req.email ?? "(not given)"}\nNote: ${req.note ?? "(none)"}\nRequest id: ${req.id}\n\nDO NOT REPLY TO THE REQUESTER without deciding to — nothing has been sent to them.`,
    });
  } catch (err) {
    console.error("[email-production] school request alert failed:", err);
  }
}

/** Plain-text alert when fulfillment fails — guarantees a human is notified. A
 *  MySchoolFrame order alerts MySchoolFrame's inbox, from MySchoolFrame. */
export async function sendFulfillmentFailureAlert(
  orderId: string,
  sessionId: string,
  customerEmail: string | null,
  reason: string,
  brand: EmailBrand = "festive-frames",
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const from = senderFor(brand);
  const to = teamRecipientsFor(brand);
  if (!to.length) return;
  try {
    await sendOrThrow(new Resend(apiKey), {
      from,
      to,
      subject: `ORDER PAID but fulfillment FAILED — ${orderId}`,
      text: `An order was PAID but the production/customer emails could not be generated.\n\nOrder: ${orderId}\nStripe session: ${sessionId}\nCustomer: ${customerEmail ?? "unknown"}\nReason: ${reason}\n\nACTION: pull the design for this order and contact the customer. Do not assume it shipped.`,
    });
  } catch (err) {
    console.error("[email-production] failure alert ALSO failed:", err);
  }
}
