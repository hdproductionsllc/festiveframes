// ─────────────────────────────────────────────────────────────
// SCHOOL ORDERS — the one record of a school order, from checkout to printer,
// and therefore the FUNDRAISER LEDGER: every school total is summed from here.
//
// An order does not carry files. It points at ONE revision of a saved design
// (store.ts), whose files are immutable and kept, so:
//   - nothing can replace an order's files once checkout starts (review
//     2026-09-25, #3);
//   - nothing sweeps them after 24 hours (review #4).
//
// THE STAGES, and the one rule each enforces:
//   awaiting_payment  created at checkout, for an APPROVED revision only
//   paid              Stripe said so. Recorded before, and independently of, any
//                     attempt to produce it — payment is a fact about money
//   sent              the production email went out. Set only AFTER it did
//   held              a human must look (no approval on record, files that no
//                     longer hash to what was approved, refunded before
//                     production). Never printed as-is
// plus `refunded_at`, which is about money, not production, and takes the order
// out of its school's total whatever stage it is in.
//
// ONE RECORD, NOT TWO. There used to be a separate ledger table (and it shared
// this table's name — whichever was created first silently won). Two copies of
// "what was sold" drift, and they did: a refund that Stripe delivered before the
// purchase found no ledger row and was lost (review #7). An order row exists from
// the moment checkout starts, before Stripe says anything, so a refund always
// finds its order, in whatever order the events arrive.
//
// CRASH SAFETY (review #2). Producing an order is a CLAIM with an expiry, not a
// flag: `claim` stamps `claim_until` and the sender marks `sent` only once the
// email is out. A process killed between the two leaves a claim that simply
// expires, and the next trigger (Stripe redelivers for three days; the parent's
// thanks page asks again) takes it over. The order row IS the retry job — there
// is no second queue to drift from it. Sends carry Resend idempotency keys, so a
// takeover after an email that did go out does not send it twice.
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
  /** The per-frame donation promised to the school, in cents, fixed at checkout. */
  donationCents: number;
  status: SchoolOrderStatus;
  sessionId: string | null;
  /** Stripe's word: "paid", or "no_payment_required" for a 100%-off code. */
  paymentStatus: string | null;
  amountCents: number | null;
  attempts: number;
  lastError: string | null;
  createdAt: number;
  paidAt: number | null;
  sentAt: number | null;
  refundedAt: number | null;
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

const ms = (v: unknown): number | null => (v == null ? null : new Date(v as string | Date).getTime());

function fromRow(r: Record<string, unknown>): SchoolOrder {
  return {
    orderId: String(r.order_id),
    designId: String(r.design_id),
    revision: Number(r.revision),
    proofSha256: String(r.proof_sha256),
    school: (r.school_slug as string | null) ?? null,
    donationCents: Number(r.donation_cents ?? 0),
    status: r.status as SchoolOrderStatus,
    sessionId: (r.session_id as string | null) ?? null,
    paymentStatus: (r.payment_status as string | null) ?? null,
    amountCents: r.amount_cents == null ? null : Number(r.amount_cents),
    attempts: Number(r.attempts ?? 0),
    lastError: (r.last_error as string | null) ?? null,
    createdAt: ms(r.created_at) ?? 0,
    paidAt: ms(r.paid_at),
    sentAt: ms(r.sent_at),
    refundedAt: ms(r.refunded_at),
  };
}

function strip(m: MemOrder): SchoolOrder {
  const { claimUntil: _c, ...order } = m;
  void _c;
  return order;
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
  donationCents: number;
}): Promise<SchoolOrder> {
  const order: SchoolOrder = {
    orderId: randomUUID(),
    designId: o.designId,
    revision: o.revision,
    proofSha256: o.proofSha256,
    school: o.school,
    donationCents: Math.max(0, Math.round(o.donationCents)),
    status: "awaiting_payment",
    sessionId: null,
    paymentStatus: null,
    amountCents: null,
    attempts: 0,
    lastError: null,
    createdAt: Date.now(),
    paidAt: null,
    sentAt: null,
    refundedAt: null,
  };
  const mode = storageMode();
  if (mode === "unavailable") unavailable();
  if (mode === "memory") {
    memOrders.set(order.orderId, { ...order, claimUntil: null });
    return order;
  }
  await ensureSchema();
  await getPool().query(
    `INSERT INTO school_orders (order_id, design_id, revision, proof_sha256, school_slug, donation_cents, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'awaiting_payment')`,
    [order.orderId, order.designId, order.revision, order.proofSha256, order.school, order.donationCents],
  );
  return order;
}

export async function getSchoolOrder(orderId: string): Promise<SchoolOrder | null> {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const mode = storageMode();
  if (mode === "unavailable") unavailable();
  if (mode === "memory") {
    const m = memOrders.get(orderId);
    return m ? strip(m) : null;
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
      Object.assign(m, {
        status: "paid",
        sessionId: p.sessionId,
        paymentStatus: p.paymentStatus,
        amountCents: p.amountCents,
        paidAt: Date.now(),
      });
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
 * A FULL refund. Marked, never deleted, and idempotent (the first time is kept).
 * The row exists from checkout, so this works even when Stripe delivers the
 * refund before the purchase. Returns whether an order was marked.
 */
export async function markSchoolOrderRefunded(orderId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return false;
  const mode = storageMode();
  if (mode === "unavailable") unavailable();
  if (mode === "memory") {
    const m = memOrders.get(orderId);
    if (!m) return false;
    m.refundedAt ??= Date.now();
    return true;
  }
  await ensureSchema();
  const { rowCount } = await getPool().query(
    `UPDATE school_orders SET refunded_at = COALESCE(refunded_at, now()) WHERE order_id = $1`,
    [orderId],
  );
  return (rowCount ?? 0) > 0;
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
    if (m) {
      Object.assign(m, { status, claimUntil: null, lastError: reason ?? m.lastError });
      if (status === "sent") m.sentAt = Date.now();
    }
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

// ── The fundraiser, summed from the orders ───────────────────────────────────

export interface SchoolTotals {
  school: string;
  /** Paid frames carrying this school. */
  frames: number;
  /** Total donation owed to the school, in cents. */
  raisedCents: number;
  /** Frames in the last 30 days — what a club wants for "this season". */
  frames30d: number;
  raised30dCents: number;
  /** First and most recent paid order, epoch ms. Null when there are none. */
  firstAt: number | null;
  lastAt: number | null;
}

const DAY30_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * What COUNTS toward a school: money actually changed hands (`payment_status`
 * "paid" — a 100%-off code completes as "no_payment_required" and credits
 * nothing, because nothing was collected to send the club) and was not refunded.
 * Whether the frame has been printed yet does not matter: the school is owed for
 * the sale.
 */
function counts(o: SchoolOrder): boolean {
  return o.paymentStatus === "paid" && o.refundedAt === null && o.paidAt !== null;
}

function fold(school: string, orders: SchoolOrder[]): SchoolTotals {
  const cut = Date.now() - DAY30_MS;
  const t: SchoolTotals = { school, frames: 0, raisedCents: 0, frames30d: 0, raised30dCents: 0, firstAt: null, lastAt: null };
  for (const o of orders) {
    if (!counts(o)) continue;
    const at = o.paidAt!;
    t.frames += 1;
    t.raisedCents += o.donationCents;
    if (at >= cut) {
      t.frames30d += 1;
      t.raised30dCents += o.donationCents;
    }
    if (t.firstAt === null || at < t.firstAt) t.firstAt = at;
    if (t.lastAt === null || at > t.lastAt) t.lastAt = at;
  }
  return t;
}

/** Everything one school has raised. Zeroes, not an error, when storage fails —
 *  a club's page must not break because the database hiccuped. */
export async function schoolTotals(school: string): Promise<SchoolTotals> {
  const all = await allSchoolTotals().catch((err) => {
    console.error("[school-orders] schoolTotals failed:", err instanceof Error ? err.message : err);
    return [] as SchoolTotals[];
  });
  return all.find((t) => t.school === school) ?? fold(school, []);
}

/** Every school's totals, most raised first — the dashboard's Schools view. */
export async function allSchoolTotals(): Promise<SchoolTotals[]> {
  const orders = await listSchoolOrders({ limit: 100_000 });
  const bySchool = new Map<string, SchoolOrder[]>();
  for (const o of orders) {
    if (!o.school) continue;
    bySchool.set(o.school, [...(bySchool.get(o.school) ?? []), o]);
  }
  return [...bySchool.entries()]
    .map(([school, list]) => fold(school, list))
    .sort((a, b) => b.raisedCents - a.raisedCents || b.frames - a.frames);
}

/** Orders, newest first — the dashboard's Orders view. */
export async function listSchoolOrders(o: { limit?: number } = {}): Promise<SchoolOrder[]> {
  const limit = Math.max(1, Math.min(o.limit ?? 200, 100_000));
  const mode = storageMode();
  if (mode === "unavailable") unavailable();
  if (mode === "memory") {
    return [...memOrders.values()].map(strip).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  }
  await ensureSchema();
  const res = await getPool().query(`SELECT * FROM school_orders ORDER BY created_at DESC LIMIT $1`, [limit]);
  return res.rows.map(fromRow);
}

/** Test seam. */
export const __memSchoolOrdersForTest = memOrders;
