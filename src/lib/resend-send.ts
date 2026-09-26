import type { Resend } from "resend";

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
  const { data, error } = opts?.idempotencyKey
    ? await resend.emails.send(msg, { idempotencyKey: opts.idempotencyKey })
    : await resend.emails.send(msg);

  // A sender whose domain is not verified in THIS key's Resend account fails every
  // email it sends (seen live 2026-09-26: the domain was verified in a different
  // account). There is deliberately no fallback to another domain — customers only
  // ever see myschoolframe.com (the owner's rule, lib/email-msf) — so say plainly
  // what to fix. The order path alerts and retries on the throw below.
  if (error && /not verified/i.test(error.message ?? "")) {
    console.error(
      `[resend] SENDER REJECTED — "${String(msg.from)}" is not verified in the Resend account RESEND_API_KEY belongs to. Fix the key or the sender.`,
    );
  }

  if (error || !data) {
    throw new Error(`Resend ${error?.name ?? "error"}: ${error?.message ?? "no result returned"}`);
  }
  return data;
}
