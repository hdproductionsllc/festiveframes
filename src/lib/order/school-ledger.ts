// ─────────────────────────────────────────────────────────────
// THE FUNDRAISER LEDGER — what a school has actually earned.
//
// The gap this closes is not technical. Stripe already carried the school slug
// and the per-frame donation in session metadata, so the money was always
// traceable; what was missing was an ANSWER to the only question a booster club
// asks, which is "how do we know what we earned". A number nobody can see is not
// a fundraiser, it is a promise.
//
// Written at WEBHOOK time, not read from Stripe on demand, for three reasons.
// Checkout Sessions are not searchable by metadata, so a live query would mean
// paging the whole account. A booster page must not fail because Stripe is slow.
// And the number has to be stable: it is going in an email to a club treasurer.
//
// IDEMPOTENT by order id. Stripe redelivers webhooks freely, and a fundraiser
// total that double-counts a retry is worse than no total at all.
//
// Mirrors order/store.ts exactly: Postgres when DATABASE_URL is set, an
// in-memory Map otherwise, and every DB error logged (never the connection
// string) and rethrown.
// ─────────────────────────────────────────────────────────────

import type { Pool as PgPool } from "pg";

export interface SchoolOrderRow {
  orderId: string;
  school: string;
  donationCents: number;
  paidAt: number;
}

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

const EMPTY = (school: string): SchoolTotals => ({
  school,
  frames: 0,
  raisedCents: 0,
  frames30d: 0,
  raised30dCents: 0,
  firstAt: null,
  lastAt: null,
});

const USE_DB = !!process.env.DATABASE_URL;
const DAY30_MS = 30 * 24 * 60 * 60 * 1000;

// ── In-memory fallback (local dev) ───────────────────────────────────────────
const memOrders = new Map<string, SchoolOrderRow>();

// ── Postgres ─────────────────────────────────────────────────────────────────
let pool: PgPool | null = null;
let initPromise: Promise<void> | null = null;

function getPool(): PgPool {
  if (!pool) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg") as typeof import("pg");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

function ensureSchema(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const p = getPool();
      // NO TTL on this table, unlike the draft tables it sits beside. A draft is
      // scaffolding and expires in a day; this is the money record a school is
      // owed against, and it is kept.
      await p.query(`
        CREATE TABLE IF NOT EXISTS school_orders (
          order_id       text PRIMARY KEY,
          school         text NOT NULL,
          donation_cents integer NOT NULL,
          paid_at        timestamptz NOT NULL DEFAULT now()
        )
      `);
      await p.query(
        `CREATE INDEX IF NOT EXISTS school_orders_school_idx ON school_orders (school, paid_at)`,
      );
    })().catch((err) => {
      initPromise = null; // let a later call retry rather than caching the failure
      throw err;
    });
  }
  return initPromise;
}

/**
 * Record one paid school frame. Safe to call repeatedly for the same order.
 *
 * Never throws to the caller: this runs inside the Stripe webhook, and failing
 * to write a fundraiser row must not cause Stripe to retry an order that has
 * already been fulfilled. A miss is logged loudly and the total is a little low,
 * which is recoverable; a redelivered fulfillment is not.
 */
export async function recordSchoolOrder(row: {
  orderId: string;
  school: string;
  donationCents: number;
}): Promise<void> {
  if (!row.orderId || !row.school) return;
  const donationCents = Number.isFinite(row.donationCents)
    ? Math.max(0, Math.round(row.donationCents))
    : 0;

  try {
    if (!USE_DB) {
      if (!memOrders.has(row.orderId)) {
        memOrders.set(row.orderId, {
          orderId: row.orderId,
          school: row.school,
          donationCents,
          paidAt: Date.now(),
        });
      }
      return;
    }
    await ensureSchema();
    await getPool().query(
      `INSERT INTO school_orders (order_id, school, donation_cents, paid_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (order_id) DO NOTHING`,
      [row.orderId, row.school, donationCents],
    );
  } catch (err) {
    console.error(
      "[school-ledger] recordSchoolOrder failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

/** Everything one school has raised. Returns zeroes rather than throwing. */
export async function schoolTotals(school: string): Promise<SchoolTotals> {
  if (!school) return EMPTY(school);
  try {
    if (!USE_DB) {
      const rows = [...memOrders.values()].filter((r) => r.school === school);
      return fold(school, rows);
    }
    await ensureSchema();
    const { rows } = await getPool().query(
      `SELECT order_id, school, donation_cents, paid_at
         FROM school_orders WHERE school = $1`,
      [school],
    );
    return fold(
      school,
      rows.map((r: Record<string, unknown>) => ({
        orderId: String(r.order_id),
        school: String(r.school),
        donationCents: Number(r.donation_cents),
        paidAt:
          r.paid_at instanceof Date ? r.paid_at.getTime() : new Date(String(r.paid_at)).getTime(),
      })),
    );
  } catch (err) {
    console.error("[school-ledger] schoolTotals failed:", err instanceof Error ? err.message : err);
    return EMPTY(school);
  }
}

function fold(school: string, rows: SchoolOrderRow[]): SchoolTotals {
  const cut = Date.now() - DAY30_MS;
  const t = EMPTY(school);
  for (const r of rows) {
    t.frames += 1;
    t.raisedCents += r.donationCents;
    if (r.paidAt >= cut) {
      t.frames30d += 1;
      t.raised30dCents += r.donationCents;
    }
    if (t.firstAt === null || r.paidAt < t.firstAt) t.firstAt = r.paidAt;
    if (t.lastAt === null || r.paidAt > t.lastAt) t.lastAt = r.paidAt;
  }
  return t;
}

/** Test seam: the in-memory path, so a suite can exercise folding without a DB. */
export const __memOrdersForTest = memOrders;
