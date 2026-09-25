// ─────────────────────────────────────────────────────────────
// SCHOOL ORDERS — a paid, approved revision on its way to the printer.
//
// An order does not carry files. It points at ONE revision of a saved design
// (store.ts), whose files are immutable and kept, so:
//   - nothing can replace an order's files once checkout starts — there is no
//     draft to overwrite (review 2026-09-25, #3);
//   - nothing sweeps them after 24 hours — revisions with orders are never swept
//     (review #4).
//
// THE STAGES, and the one rule each enforces:
//   awaiting_payment  created at checkout, for an APPROVED revision only
//   paid              Stripe said so. Recorded before, and independently of, any
//                     attempt to produce it — payment is a fact about money
//   sent              the production email went out. Set only AFTER it did
//   held              a human must look (no approval on record, files that no
//                     longer hash to what was approved). Never printed as-is
//
// CRASH SAFETY (review #2). Producing an order is a CLAIM with an expiry, not a
// flag: `claim` stamps `claim_until` and the sender marks `sent` only once the
// email is out. A process killed between the two leaves a claim that simply
// expires, and the next trigger (Stripe redelivers for three days; the parent's
// thanks page asks again) takes it over. The order row IS the retry job — there
// is no second queue to drift from it. The sends carry Resend idempotency keys,
// so a takeover after an email that did go out does not send it twice.
//
// Storage: db.ts (`storageMode`). SERVER ONLY.
// ─────────────────────────────────────────────────────────────

import { randomUUID } from "node:crypto";
import { ensureSchema, getPool, storageMode } from "./db";

export type SchoolOrderStatus = "awaiting_payment" | "paid" | "sent" | "held";

export interface SchoolOrder {
  orderId: string;
  designId: string;
  revision: number;
  proofSha256: string;
  school: string | null;
  status: SchoolOrderStatus;
  sessionId: string | null;
  paymentStatus: string | null;
  attempts: number;
  lastError: string | null;
}

/** How long a producer holds an order before another may take it over. Long
 *  enough for a production email with print attachments; short enough that a
 *  crashed attempt is retried within a Stripe redelivery or two. */
export const CLAIM_LEASE_MS = 10 * 60 * 1000;

export type ClaimResult = "claimed" | "sent" | "held" | "busy" | "unpaid" | "missing";

// ── Memory (dev/tests) — on globalThis for the same reason as store.ts ────────
interface MemOrder extends SchoolOrder {
  claimUntil: number | null;
}
const g = globalThis as typeof globalThis & { __msfSchoolOrders?: Map<string, MemOrder> };
const memOrders = (g.__msfSchoolOrders ??= new Map<string, MemOrder>());

function fromRow(r: Record<string, unknown>): SchoolOrder {
  return {
    orderId: String(r.order_id),
    designId: String(r.design_id),
    revision: Number(r.revision),
    proofSha256: String(r.proof_sha256),
    school: (r.school_slug as string | null) ?? null,
    status: r.status as SchoolOrderStatus,
    sessionId: (r.session_id as string | null) ?? null,
    paymentStatus: (r.payment_status as string | null) ?? null,
    attempts: Number(r.attempts ?? 0),
    lastError: (r.last_error as string | null) ?? null,
  };
}

function unavailable(): never {
  throw new Error("School orders need a database: DATABASE_URL is not set in production.");
}

/** Create the order for an approved revision. The id is the server's, never the
 *  browser's. Throws when it cannot be stored — checkout must not start then. */
export async function createSchoolOrder(o: {
  designId: string;
  revision: number;
  proofSha256: string;
  school: string | null;
}): Promise<SchoolOrder> {
  const order: SchoolOrder = {
    orderId: randomUUID(),
    designId: o.designId,
    revision: o.revision,
    proofSha256: o.proofSha256,
    school: o.school,
    status: "awaiting_payment",
    sessionId: null,
    paymentStatus: null,
    attempts: 0,
    lastError: null,
  };
  const mode = storageMode();
  if (mode === "unavailable") unavailable();
  if (mode === "memory") {
    memOrders.set(order.orderId, { ...order, claimUntil: null });
    return order;
  }
  await ensureSchema();
  await getPool().query(
    `INSERT INTO school_orders (order_id, design_id, revision, proof_sha256, school_slug, status)
     VALUES ($1, $2, $3, $4, $5, 'awaiting_payment')`,
    [order.orderId, order.designId, order.revision, order.proofSha256, order.school],
  );
  return order;
}

export async function getSchoolOrder(orderId: string): Promise<SchoolOrder | null> {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const mode = storageMode();
  if (mode === "unavailable") unavailable();
  if (mode === "memory") {
    const m = memOrders.get(orderId);
    if (!m) return null;
    const { claimUntil: _c, ...order } = m;
    void _c;
    return order;
  }
  await ensureSchema();
  const res = await getPool().query(`SELECT * FROM school_orders WHERE order_id = $1`, [orderId]);
  return res.rows[0] ? fromRow(res.rows[0]) : null;
}

/**
 * Record that Stripe took (or waived) payment. Idempotent, and only ever moves
 * `awaiting_payment` forward — a sent or held order is not reopened by a late
 * redelivery.
 */
export async function recordSchoolOrderPayment(
  orderId: string,
  p: { sessionId: string; paymentStatus: string; amountCents: number },
): Promise<void> {
  const mode = storageMode();
  if (mode === "unavailable") unavailable();
  if (mode === "memory") {
    const m = memOrders.get(orderId);
    if (m && m.status === "awaiting_payment") {
      Object.assign(m, { status: "paid", sessionId: p.sessionId, paymentStatus: p.paymentStatus });
    }
    return;
  }
  await ensureSchema();
  await getPool().query(
    `UPDATE school_orders
        SET status = 'paid', session_id = $2, payment_status = $3, amount_cents = $4, paid_at = now()
      WHERE order_id = $1 AND status = 'awaiting_payment'`,
    [orderId, p.sessionId, p.paymentStatus, p.amountCents],
  );
}

/**
 * Take the right to produce this order for `CLAIM_LEASE_MS`. Only a PAID order
 * with no live claim can be taken; an expired claim (a crashed attempt) can.
 */
export async function claimSchoolOrder(orderId: string, now = Date.now()): Promise<ClaimResult> {
  const mode = storageMode();
  if (mode === "unavailable") unavailable();
  if (mode === "memory") {
    const m = memOrders.get(orderId);
    if (!m) return "missing";
    if (m.status === "sent") return "sent";
    if (m.status === "held") return "held";
    if (m.status !== "paid") return "unpaid";
    if (m.claimUntil && m.claimUntil > now) return "busy";
    m.claimUntil = now + CLAIM_LEASE_MS;
    m.attempts += 1;
    return "claimed";
  }
  await ensureSchema();
  const p = getPool();
  const taken = await p.query(
    `UPDATE school_orders
        SET claim_until = now() + ($2 || ' milliseconds')::interval, attempts = attempts + 1
      WHERE order_id = $1 AND status = 'paid' AND (claim_until IS NULL OR claim_until < now())
      RETURNING order_id`,
    [orderId, String(CLAIM_LEASE_MS)],
  );
  if (taken.rows.length) return "claimed";
  const res = await p.query<{ status: SchoolOrderStatus }>(
    `SELECT status FROM school_orders WHERE order_id = $1`,
    [orderId],
  );
  const status = res.rows[0]?.status;
  if (!status) return "missing";
  if (status === "sent") return "sent";
  if (status === "held") return "held";
  if (status !== "paid") return "unpaid";
  return "busy";
}

/** The production email went out. The claim ends with the order done. */
export async function markSchoolOrderSent(orderId: string): Promise<void> {
  return finish(orderId, "sent", null);
}

/** A human must look before this is printed. Terminal until a person acts. */
export async function holdSchoolOrder(orderId: string, reason: string): Promise<void> {
  return finish(orderId, "held", reason);
}

/** This attempt failed: give the claim back so the next trigger retries. */
export async function releaseSchoolOrder(orderId: string, error: string): Promise<void> {
  const mode = storageMode();
  if (mode === "unavailable") unavailable();
  if (mode === "memory") {
    const m = memOrders.get(orderId);
    if (m) Object.assign(m, { claimUntil: null, lastError: error });
    return;
  }
  await ensureSchema();
  await getPool().query(
    `UPDATE school_orders SET claim_until = NULL, last_error = $2 WHERE order_id = $1`,
    [orderId, error.slice(0, 1000)],
  );
}

async function finish(orderId: string, status: "sent" | "held", reason: string | null): Promise<void> {
  const mode = storageMode();
  if (mode === "unavailable") unavailable();
  if (mode === "memory") {
    const m = memOrders.get(orderId);
    if (m) Object.assign(m, { status, claimUntil: null, lastError: reason ?? m.lastError });
    return;
  }
  await ensureSchema();
  await getPool().query(
    `UPDATE school_orders
        SET status = $2, claim_until = NULL,
            sent_at = CASE WHEN $2 = 'sent' THEN now() ELSE sent_at END,
            last_error = COALESCE($3, last_error)
      WHERE order_id = $1`,
    [orderId, status, reason],
  );
}

/** Test seam. */
export const __memSchoolOrdersForTest = memOrders;
