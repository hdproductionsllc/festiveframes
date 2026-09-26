import type { Resend } from "resend";
import { msfUnverifiedSenderFallback } from "@/lib/email-msf";

// ─── The ONE way this codebase sends an email ────────────────────────────────
//
// Resend's SDK (v6) never throws on a failed send. An API rejection ("domain not
// verified", a validation error, a rate limit) and even a network error come back
// as `{ data: null, error }`. Every send here was written as `try { await send }
// catch`, so a rejected production email for a paid order was treated as
// delivered: the fulfilment claim was kept, no alert fired, Stripe was told 200,
// and the order vanished with nothing but the Stripe record left.
//
// So the result is checked in exactly one place, and a failure THROWS — which is
// what every existing catch block (release the claim, alert, retry without the
// print sheets, report send-failed) was already written to handle.
// `resend-send.test.ts` fails if a direct `.emails.send(` appears anywhere else.

export type ResendMessage = Parameters<Resend["emails"]["send"]>[0];

/**
 * `idempotencyKey`: the same key within 24 hours sends at most once — Resend
 * answers a repeat with the first result. The order path uses one per email per
 * order, so an attempt that is retried after a crash cannot mail Bill twice. A
 * key must name one exact message: the same key with DIFFERENT content is refused.
 */
export async function sendOrThrow(
  resend: Resend,
  msg: ResendMessage,
  opts?: { idempotencyKey?: string },
): Promise<{ id: string }> {
  const send = (m: ResendMessage, key?: string) =>
    key ? resend.emails.send(m, { idempotencyKey: key }) : resend.emails.send(m);
  let { data, error } = await send(msg, opts?.idempotencyKey);

  // THE SAFETY NET: a MySchoolFrame sender Resend will not send from (its domain
  // is not verified in this key's account) is resent ONCE from the fallback
  // sender (lib/email-msf `msfUnverifiedSenderFallback`). Its own idempotency key,
  // because Resend refuses one key reused with different content.
  const fallback = error && /not verified/i.test(error.message ?? "") ? msfUnverifiedSenderFallback(msg.from) : null;
  if (fallback) {
    console.error(
      `[resend] SENDER REJECTED — "${msg.from}" is not verified in this Resend account. Resending from "${fallback}". Fix MSF_EMAIL_FROM or RESEND_API_KEY.`,
    );
    ({ data, error } = await send({ ...msg, from: fallback }, opts?.idempotencyKey ? `${opts.idempotencyKey}/fallback-sender` : undefined));
  }

  if (error || !data) {
    throw new Error(`Resend ${error?.name ?? "error"}: ${error?.message ?? "no result returned"}`);
  }
  return data;
}
