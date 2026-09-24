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

export async function sendOrThrow(resend: Resend, msg: ResendMessage): Promise<{ id: string }> {
  const { data, error } = await resend.emails.send(msg);
  if (error || !data) {
    throw new Error(`Resend ${error?.name ?? "error"}: ${error?.message ?? "no result returned"}`);
  }
  return data;
}
