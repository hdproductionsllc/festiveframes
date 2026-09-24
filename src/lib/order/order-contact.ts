// ─── Who to answer about a sent design ───────────────────────────────────────
//
// "Send design" used to POST the print files with nothing about the person who
// sent them, under a page promising "We'll follow up with ordering details". Every
// design that arrived in the pilot was unanswerable. The send sheet now asks for a
// parent's email (required), a phone (optional) and who the frame is for, and this
// module is the ONE statement of what a valid contact is: the sheet checks it
// before the button enables, and the route checks it again on arrival, because the
// body is untrusted whatever the sheet did.
//
// The address is for a HUMAN to reply to. Nothing in the system mails it: the
// production email goes to the server-fixed orders inbox and carries this as a
// line of text. See `orderContactLine`.

export interface OrderContact {
  email: string;
  phone?: string;
  /** Who the frame is for, in the buyer's own chip words ("My student"). */
  forWhom?: string;
}

export const CONTACT_EMAIL_MAX = 254;
export const CONTACT_PHONE_MAX = 32;
export const CONTACT_FOR_MAX = 60;

/**
 * Deliberately plain: one @, a dot in the domain, no spaces or angle brackets. It
 * does not try to be RFC 5322 — the point is catching a typo on a phone keyboard
 * and refusing header-shaped input, not certifying a mailbox.
 */
const EMAIL_RE = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]{2,}$/;
/** Digits and the punctuation people type in a phone number, 7+ digits. */
const PHONE_CHARS_RE = /^[0-9+().\-\s]+$/;

export type ContactProblem = "email-missing" | "email-invalid" | "phone-invalid";

export const CONTACT_PROBLEM_COPY: Record<ContactProblem, string> = {
  "email-missing": "Add an email so we can reach you about this design.",
  "email-invalid": "That email doesn't look right. Check it and try again.",
  "phone-invalid": "That phone number doesn't look right. Leave it blank if you prefer.",
};

/** Control characters out, whitespace collapsed, bounded. */
function clean(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * Coerce an untrusted value into a contact, or say what is wrong with it. The
 * email is required; an empty phone or "for" is simply absent.
 */
export function coerceOrderContact(
  v: unknown,
): { ok: true; contact: OrderContact } | { ok: false; problem: ContactProblem } {
  const r = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const email = clean(r.email, CONTACT_EMAIL_MAX + 1);
  if (!email) return { ok: false, problem: "email-missing" };
  if (email.length > CONTACT_EMAIL_MAX || !EMAIL_RE.test(email)) return { ok: false, problem: "email-invalid" };
  const phone = clean(r.phone, CONTACT_PHONE_MAX + 1);
  if (phone) {
    const digits = phone.replace(/\D/g, "").length;
    if (phone.length > CONTACT_PHONE_MAX || !PHONE_CHARS_RE.test(phone) || digits < 7 || digits > 15) {
      return { ok: false, problem: "phone-invalid" };
    }
  }
  const forWhom = clean(r.forWhom, CONTACT_FOR_MAX);
  return {
    ok: true,
    contact: { email, ...(phone ? { phone } : {}), ...(forWhom ? { forWhom } : {}) },
  };
}

/**
 * The contact as ONE line of plain text for the production email — escaped by the
 * email's own renderer like every other body string. Says in words that the
 * address is a reply-to for a person, so nobody wires it up as a recipient.
 */
export function orderContactLine(c: OrderContact): string {
  const parts = [`Contact: ${c.email}`];
  if (c.phone) parts.push(`phone ${c.phone}`);
  if (c.forWhom) parts.push(`for: ${c.forWhom}`);
  return `${parts.join(" · ")} (reply by hand; the system has not emailed them)`;
}
