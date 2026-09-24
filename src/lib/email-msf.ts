// ─────────────────────────────────────────────────────────────
// MySchoolFrame's mail identity: who it is FROM and which inbox it goes TO.
//
// One deployment sells two products. Festive Frames (the holiday kit) keeps
// EMAIL_FROM / ADMIN_ORDER_EMAIL / PRODUCTION_EMAILS exactly as they were;
// MySchoolFrame reads its own two variables here, so moving the school product
// to its own mailbox cannot touch a holiday order and vice versa.
//
// Env (server only):
//   MSF_ORDER_EMAIL  comma-separated inbox(es) for every MySchoolFrame internal
//                    email: paid school orders, send-sheet designs, "we don't
//                    have my school" requests, and the bcc on a parent's
//                    confirmation. Defaults to SCHOOL_CONTACT_EMAIL
//                    (bill@myschoolframe.com).
//   MSF_EMAIL_FROM   the sender, e.g. "MySchoolFrame <orders@myschoolframe.com>".
//                    Resend only sends from a domain verified in the Resend
//                    dashboard; until myschoolframe.com is, leave this UNSET and
//                    school mail goes out from EMAIL_FROM's (verified) mailbox
//                    under the MySchoolFrame display name, so orders keep flowing.
//
// THE RULE: every recipient here is server-fixed. Nothing a parent types — their
// email on the send sheet, a request form's address, a request body field — is
// ever read into a to/cc/bcc. Their address is printed in the body as "Reply to"
// so a human can choose to write back.
// ─────────────────────────────────────────────────────────────

import { SCHOOL_CONTACT_EMAIL } from "@/content/school-contact";

export const MSF_SENDER_NAME = "MySchoolFrame";

/** Resend's shared test sender — works with no verified domain at all. */
const RESEND_TEST_ADDRESS = "onboarding@resend.dev";

function list(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The inbox(es) every MySchoolFrame internal email goes to. Never empty. */
export function msfOrderRecipients(): string[] {
  const configured = list(process.env.MSF_ORDER_EMAIL);
  return configured.length ? configured : [SCHOOL_CONTACT_EMAIL];
}

/** The bare address inside `Name <addr>` (or the whole string when there is no name). */
function addressOf(from: string): string {
  return /<([^>]+)>/.exec(from)?.[1]?.trim() ?? from.trim();
}

/**
 * The From line for MySchoolFrame mail.
 *
 * MSF_EMAIL_FROM when set (a myschoolframe.com sender, once that domain is
 * verified in Resend). Otherwise EMAIL_FROM's mailbox with the display name
 * swapped for MySchoolFrame — the inbox list says MySchoolFrame and delivery
 * rides the domain that is already verified. Otherwise Resend's test sender.
 */
export function msfFrom(): string {
  const own = process.env.MSF_EMAIL_FROM?.trim();
  if (own) return own.includes("<") ? own : `${MSF_SENDER_NAME} <${own}>`;
  const shared = process.env.EMAIL_FROM?.trim();
  return `${MSF_SENDER_NAME} <${shared ? addressOf(shared) : RESEND_TEST_ADDRESS}>`;
}
