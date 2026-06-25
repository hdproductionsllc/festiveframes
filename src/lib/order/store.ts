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

const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
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
const memFulfilled = new Set<string>();

function memSweep(): void {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, d] of memDrafts) if (d.savedAt < cutoff) memDrafts.delete(id);
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
    await p.query(`DELETE FROM order_drafts WHERE saved_at < now() - interval '2 hours'`);
  } catch (err) {
    console.error("[order/store] TTL cleanup failed:", err instanceof Error ? err.message : err);
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
