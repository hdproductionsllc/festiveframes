// ─────────────────────────────────────────────────────────────
// Order draft store + idempotency guard.
//
// A custom order's design + rendered artifacts are POSTed to /api/order/draft
// BEFORE the customer is sent to Stripe, and stashed here keyed by orderId.
// After payment, fulfillment can fire from two places (the /thanks success
// page relay and the Stripe webhook); both converge on fulfillOrder(), and
// markFulfilled() guarantees the production emails send exactly once.
//
// DURABILITY: when DATABASE_URL is set (production — Neon Postgres), drafts and
// the fulfillment claim live in Postgres, so a paid design ALWAYS survives a
// Railway redeploy/restart or a second instance. When DATABASE_URL is absent
// (local dev), it transparently falls back to per-process in-memory Maps.
//
// All four store functions are async (return Promises). Nothing here silently
// drops: a DB error is logged (never the connection string) and rethrown so the
// caller's failure-alert path fires.
// ─────────────────────────────────────────────────────────────

import type { Pool as PgPool } from "pg";

import type { PartsList } from "@/lib/order/parts-list";
import type { NamedImage } from "@/lib/email-production";

export interface OrderArtifacts {
  proof: NamedImage | null;
  printSheets: NamedImage[];
  banners: NamedImage[];
}

export interface OrderDraft {
  orderId: string;
  parts: PartsList;
  artifacts: OrderArtifacts;
  /** Raw design JSON, kept so Bill can regenerate a print sheet on desktop. */
  design?: unknown;
  savedAt: number;
}

/** One line of a multi-design cart: which stored design, and how many of it. */
export interface CartLineRef {
  orderId: string;
  quantity: number;
}

/**
 * A cart draft groups several design drafts under one checkout. Only the
 * lightweight {orderId, quantity} refs live here — each design's heavy parts +
 * artifacts stay in its own order_drafts row, looked up at fulfillment.
 */
export interface CartDraft {
  cartId: string;
  lines: CartLineRef[];
  savedAt: number;
}

/**
 * A design a visitor saved to continue later (the "Save my design → email a
 * restore link" flow). Keyed by an opaque token that rides in the emailed
 * `/build?restore=<token>` link. `design` is the full serialized builder state.
 */
export interface SavedDesign {
  token: string;
  email: string;
  name: string | null;
  design: unknown;
  savedAt: number;
}

// 24 hours: long enough that a multi-frame cart assembled across a session (design
// one frame, come back, design another) never finds an earlier design's draft
// already swept. Drafts are tiny refs + artifacts; holding them a day is cheap.
const TTL_MS = 24 * 60 * 60 * 1000;
const TTL_SQL = "24 hours";
const USE_DB = !!process.env.DATABASE_URL;

// ── Postgres path ────────────────────────────────────────────────────────────

let pool: PgPool | null = null;
let initPromise: Promise<void> | null = null;

/** Lazily create the singleton pool. Neon requires SSL. */
function getPool(): PgPool {
  if (!pool) {
    // Require lazily so the in-memory path never loads pg.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg") as typeof import("pg");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

/** Run schema init exactly once (cached promise). */
function ensureSchema(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const p = getPool();
      await p.query(`
        CREATE TABLE IF NOT EXISTS order_drafts (
          order_id  text PRIMARY KEY,
          design    jsonb,
          parts     jsonb,
          artifacts jsonb,
          saved_at  timestamptz NOT NULL DEFAULT now()
        )
      `);
      await p.query(`
        CREATE TABLE IF NOT EXISTS order_fulfilled (
          order_id     text PRIMARY KEY,
          fulfilled_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await p.query(`
        CREATE TABLE IF NOT EXISTS order_carts (
          cart_id  text PRIMARY KEY,
          lines    jsonb NOT NULL,
          saved_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await p.query(`
        CREATE TABLE IF NOT EXISTS saved_designs (
          token      text PRIMARY KEY,
          email      text NOT NULL,
          name       text,
          design     jsonb NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await p.query(`
        CREATE TABLE IF NOT EXISTS subscribers (
          email        text PRIMARY KEY,
          subscribed_at timestamptz NOT NULL DEFAULT now()
        )
      `);
    })().catch((err) => {
      // Reset so a later call can retry schema init.
      initPromise = null;
      console.error("[order/store] schema init failed:", err instanceof Error ? err.message : err);
      throw err;
    });
  }
  return initPromise;
}

// ── In-memory fallback path ──────────────────────────────────────────────────

const memDrafts = new Map<string, OrderDraft>();
const memCarts = new Map<string, CartDraft>();
const memFulfilled = new Set<string>();
const memSavedDesigns = new Map<string, SavedDesign>();
const memSubscribers = new Set<string>();

function memSweep(): void {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, d] of memDrafts) if (d.savedAt < cutoff) memDrafts.delete(id);
  for (const [id, c] of memCarts) if (c.savedAt < cutoff) memCarts.delete(id);
}

// ── Public API (async; DB-backed when DATABASE_URL is set) ────────────────────

export async function saveDraft(draft: Omit<OrderDraft, "savedAt">): Promise<void> {
  if (!USE_DB) {
    memSweep();
    memDrafts.set(draft.orderId, { ...draft, savedAt: Date.now() });
    return;
  }

  await ensureSchema();
  const p = getPool();
  try {
    await p.query(
      `INSERT INTO order_drafts (order_id, design, parts, artifacts, saved_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (order_id) DO UPDATE
         SET design = EXCLUDED.design,
             parts = EXCLUDED.parts,
             artifacts = EXCLUDED.artifacts,
             saved_at = now()`,
      [
        draft.orderId,
        JSON.stringify(draft.design ?? null),
        JSON.stringify(draft.parts),
        JSON.stringify(draft.artifacts),
      ],
    );
  } catch (err) {
    console.error("[order/store] saveDraft failed:", err instanceof Error ? err.message : err);
    throw err;
  }

  // Opportunistic TTL cleanup — best-effort, never break a save.
  try {
    await p.query(`DELETE FROM order_drafts WHERE saved_at < now() - interval '${TTL_SQL}'`);
  } catch (err) {
    console.error("[order/store] TTL cleanup failed:", err instanceof Error ? err.message : err);
  }
}

/** Stash a cart (its design refs + quantities) before sending the buyer to Stripe. */
export async function saveCartDraft(cartId: string, lines: CartLineRef[]): Promise<void> {
  if (!USE_DB) {
    memSweep();
    memCarts.set(cartId, { cartId, lines, savedAt: Date.now() });
    return;
  }

  await ensureSchema();
  const p = getPool();
  try {
    await p.query(
      `INSERT INTO order_carts (cart_id, lines, saved_at)
       VALUES ($1, $2, now())
       ON CONFLICT (cart_id) DO UPDATE
         SET lines = EXCLUDED.lines, saved_at = now()`,
      [cartId, JSON.stringify(lines)],
    );
  } catch (err) {
    console.error("[order/store] saveCartDraft failed:", err instanceof Error ? err.message : err);
    throw err;
  }

  try {
    await p.query(`DELETE FROM order_carts WHERE saved_at < now() - interval '${TTL_SQL}'`);
  } catch (err) {
    console.error("[order/store] cart TTL cleanup failed:", err instanceof Error ? err.message : err);
  }
}

export async function getCartDraft(cartId: string): Promise<CartDraft | undefined> {
  if (!USE_DB) {
    return memCarts.get(cartId);
  }

  await ensureSchema();
  const p = getPool();
  try {
    const { rows } = await p.query(
      `SELECT cart_id, lines, saved_at FROM order_carts WHERE cart_id = $1`,
      [cartId],
    );
    if (rows.length === 0) return undefined;
    const r = rows[0];
    return {
      cartId: r.cart_id,
      lines: r.lines as CartLineRef[],
      savedAt: r.saved_at instanceof Date ? r.saved_at.getTime() : new Date(r.saved_at).getTime(),
    };
  } catch (err) {
    console.error("[order/store] getCartDraft failed:", err instanceof Error ? err.message : err);
    throw err;
  }
}

export async function getDraft(orderId: string): Promise<OrderDraft | undefined> {
  if (!USE_DB) {
    return memDrafts.get(orderId);
  }

  await ensureSchema();
  const p = getPool();
  try {
    const { rows } = await p.query(
      `SELECT order_id, design, parts, artifacts, saved_at
         FROM order_drafts WHERE order_id = $1`,
      [orderId],
    );
    if (rows.length === 0) return undefined;
    const r = rows[0];
    // pg returns jsonb columns already parsed; timestamptz as a Date.
    return {
      orderId: r.order_id,
      design: r.design ?? undefined,
      parts: r.parts as PartsList,
      artifacts: r.artifacts as OrderArtifacts,
      savedAt: r.saved_at instanceof Date ? r.saved_at.getTime() : new Date(r.saved_at).getTime(),
    };
  } catch (err) {
    console.error("[order/store] getDraft failed:", err instanceof Error ? err.message : err);
    throw err;
  }
}

/**
 * Atomically claims fulfillment for an orderId. Returns true only for the
 * FIRST caller; every subsequent caller (webhook retry, page refresh, the
 * other trigger) gets false and must no-op.
 *
 * In Postgres the claim is an INSERT ... ON CONFLICT DO NOTHING RETURNING —
 * exactly one row is returned to the first writer, even across instances and
 * even when no draft row exists. In memory it's a single-threaded check-and-set.
 */
export async function markFulfilled(orderId: string): Promise<boolean> {
  if (!USE_DB) {
    if (memFulfilled.has(orderId)) return false;
    memFulfilled.add(orderId);
    return true;
  }

  await ensureSchema();
  const p = getPool();
  try {
    const { rows } = await p.query(
      `INSERT INTO order_fulfilled (order_id) VALUES ($1)
       ON CONFLICT (order_id) DO NOTHING
       RETURNING order_id`,
      [orderId],
    );
    return rows.length > 0;
  } catch (err) {
    console.error("[order/store] markFulfilled failed:", err instanceof Error ? err.message : err);
    throw err;
  }
}

/** Release a claim so a later trigger can retry (used when a claim can't proceed). */
export async function unmarkFulfilled(orderId: string): Promise<void> {
  if (!USE_DB) {
    memFulfilled.delete(orderId);
    return;
  }

  await ensureSchema();
  const p = getPool();
  try {
    await p.query(`DELETE FROM order_fulfilled WHERE order_id = $1`, [orderId]);
  } catch (err) {
    console.error("[order/store] unmarkFulfilled failed:", err instanceof Error ? err.message : err);
    throw err;
  }
}

// ── Newsletter subscribers ────────────────────────────────────────────────────

/**
 * Records a signup and returns true ONLY the first time an email is seen — so the
 * team is notified once per genuinely-new subscriber, never again for a repeat (or
 * a bot hammering the form). The table itself is the durable capture; the email to
 * the team is just a heads-up. Email is expected pre-normalized (trimmed/lowercased).
 *
 * Postgres: INSERT ... ON CONFLICT DO NOTHING RETURNING → one row to the first
 * writer only, correct across instances. In memory: a single-process check-and-set.
 */
export async function recordSubscriber(email: string): Promise<boolean> {
  if (!USE_DB) {
    if (memSubscribers.has(email)) return false;
    memSubscribers.add(email);
    return true;
  }

  await ensureSchema();
  const p = getPool();
  try {
    const { rows } = await p.query(
      `INSERT INTO subscribers (email) VALUES ($1)
       ON CONFLICT (email) DO NOTHING
       RETURNING email`,
      [email],
    );
    return rows.length > 0;
  } catch (err) {
    console.error("[order/store] recordSubscriber failed:", err instanceof Error ? err.message : err);
    throw err;
  }
}

// ── Saved designs (the "continue your design" restore flow) ───────────────────

/** Persist a saved design under its token (INSERT; tokens are freshly generated). */
export async function saveSavedDesign(d: Omit<SavedDesign, "savedAt">): Promise<void> {
  if (!USE_DB) {
    memSavedDesigns.set(d.token, { ...d, savedAt: Date.now() });
    return;
  }
  await ensureSchema();
  const p = getPool();
  try {
    await p.query(
      `INSERT INTO saved_designs (token, email, name, design, created_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (token) DO UPDATE
         SET email = EXCLUDED.email, name = EXCLUDED.name,
             design = EXCLUDED.design, created_at = now()`,
      [d.token, d.email, d.name, JSON.stringify(d.design ?? null)],
    );
  } catch (err) {
    console.error("[order/store] saveSavedDesign failed:", err instanceof Error ? err.message : err);
    throw err;
  }
}

/** Fetch a saved design by token (jsonb comes back pre-parsed). undefined if unknown. */
export async function getSavedDesign(token: string): Promise<SavedDesign | undefined> {
  if (!USE_DB) return memSavedDesigns.get(token);
  await ensureSchema();
  const p = getPool();
  try {
    const { rows } = await p.query(
      `SELECT token, email, name, design, created_at FROM saved_designs WHERE token = $1`,
      [token],
    );
    if (rows.length === 0) return undefined;
    const r = rows[0];
    return {
      token: r.token,
      email: r.email,
      name: r.name ?? null,
      design: r.design,
      savedAt: r.created_at instanceof Date ? r.created_at.getTime() : new Date(r.created_at).getTime(),
    };
  } catch (err) {
    console.error("[order/store] getSavedDesign failed:", err instanceof Error ? err.message : err);
    throw err;
  }
}
