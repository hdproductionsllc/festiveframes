// ─────────────────────────────────────────────────────────────
// THE FUNNEL — "of the parents who scanned, how many bought?" (2026-09-27).
//
// Anonymous events in our own database (Henry: no Google, no cookie banner).
// What is stored: the kind of step, a random per-browser id (made in the browser,
// kept in localStorage, never tied to a name or email), the school, the QR
// placement ("card", "bleachers"…) the browser first arrived by, and — for the
// steps that have one — the design or order id.
//
// The steps, in order:
//   scan      a trackable QR link was followed (/q/<school>/<placement>) — server
//   open      the school's builder was opened — browser beacon
//   engage    the parent did something in the builder (first tap/keypress) — beacon
//   send      a design was sent to the team — server (submit route)
//   checkout  checkout started for an approved proof — server (checkout route)
//   paid      Stripe confirmed payment — server (fulfill-school)
// "open"/"engage" come from the browser and can be lost; send/checkout/paid are
// recorded where they happen, so the numbers that matter are the reliable ones.
//
// Recording NEVER throws and never slows a parent down: a lost event is a
// slightly low count, which is fine; a failed send because of analytics is not.
//
// Storage: db.ts (`storageMode`); nothing in production without a database.
// SERVER ONLY.
// ─────────────────────────────────────────────────────────────

import { ensureSchema, getPool, storageMode } from "./db";

export const FUNNEL_STEPS = ["scan", "open", "engage", "send", "checkout", "paid"] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

/** Where a browser came from, as it travels with a design or an order. */
export interface Track {
  anonId: string;
  placement: string | null;
}

const ANON_RE = /^[A-Za-z0-9_-]{8,64}$/;
const PLACEMENT_RE = /^[a-z0-9-]{1,40}$/;
const SCHOOL_RE = /^[a-z0-9-]{1,60}$/;

export function isPlacement(v: unknown): v is string {
  return typeof v === "string" && PLACEMENT_RE.test(v);
}

/** The untrusted `track` a builder sends, or null. */
export function coerceTrack(v: unknown): Track | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  if (typeof r.anonId !== "string" || !ANON_RE.test(r.anonId)) return null;
  return { anonId: r.anonId, placement: isPlacement(r.placement) ? r.placement : null };
}

interface EventRow {
  at: number;
  kind: FunnelStep;
  anonId: string | null;
  school: string | null;
  placement: string | null;
  designId: string | null;
  orderId: string | null;
}

const g = globalThis as typeof globalThis & { __msfEvents?: EventRow[] };
const memEvents = (g.__msfEvents ??= []);

/** Record one step. Never throws. */
export async function recordEvent(e: {
  kind: FunnelStep;
  anonId?: string | null;
  school?: string | null;
  placement?: string | null;
  designId?: string | null;
  orderId?: string | null;
}): Promise<void> {
  try {
    if (!FUNNEL_STEPS.includes(e.kind)) return;
    const row: EventRow = {
      at: Date.now(),
      kind: e.kind,
      anonId: e.anonId && ANON_RE.test(e.anonId) ? e.anonId : null,
      school: e.school && SCHOOL_RE.test(e.school) ? e.school : null,
      placement: isPlacement(e.placement) ? e.placement : null,
      designId: e.designId ?? null,
      orderId: e.orderId ?? null,
    };
    const mode = storageMode();
    if (mode === "unavailable") return;
    if (mode === "memory") {
      memEvents.push(row);
      return;
    }
    await ensureSchema();
    await getPool().query(
      `INSERT INTO events (kind, anon_id, school_slug, placement, design_id, order_id) VALUES ($1, $2, $3, $4, $5, $6)`,
      [row.kind, row.anonId, row.school, row.placement, row.designId, row.orderId],
    );
  } catch (err) {
    console.error("[funnel] event not recorded:", err instanceof Error ? err.message : err);
  }
}

export interface FunnelRow {
  school: string;
  /** The QR placement, or "direct" for everyone who arrived another way. */
  placement: string;
  /** Scans are counted as scans; every later step counts distinct browsers. */
  steps: Record<FunnelStep, number>;
}

const DIRECT = "direct";

/**
 * The funnel for the last `days` days, one row per school × placement. "scan" is
 * the number of scans (a person scanning twice is two scans — it is what the QR
 * code did); every later step is the number of DISTINCT browsers that reached it.
 */
export async function funnel(days: number): Promise<FunnelRow[]> {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const mode = storageMode();
  let rows: Array<{ school: string; placement: string; kind: FunnelStep; n: number }> = [];
  if (mode === "unavailable") return [];
  if (mode === "memory") {
    const buckets = new Map<string, Set<string> | number>();
    for (const e of memEvents) {
      if (e.at < since || !e.school) continue;
      const k = `${e.school}|${e.placement ?? DIRECT}|${e.kind}`;
      if (e.kind === "scan") buckets.set(k, ((buckets.get(k) as number) ?? 0) + 1);
      else {
        const set = (buckets.get(k) as Set<string>) ?? new Set<string>();
        set.add(e.anonId ?? `${e.designId ?? e.orderId ?? Math.random()}`);
        buckets.set(k, set);
      }
    }
    rows = [...buckets.entries()].map(([k, v]) => {
      const [school, placement, kind] = k.split("|");
      return { school, placement, kind: kind as FunnelStep, n: typeof v === "number" ? v : v.size };
    });
  } else {
    await ensureSchema();
    const res = await getPool().query(
      `SELECT school_slug, COALESCE(placement, $2) AS placement, kind,
              CASE WHEN kind = 'scan' THEN count(*)
                   ELSE count(DISTINCT COALESCE(anon_id, design_id::text, order_id::text, id::text)) END AS n
         FROM events
        WHERE at >= to_timestamp($1 / 1000.0) AND school_slug IS NOT NULL
        GROUP BY 1, 2, 3`,
      [since, DIRECT],
    );
    rows = res.rows.map((r: Record<string, unknown>) => ({
      school: String(r.school_slug),
      placement: String(r.placement),
      kind: r.kind as FunnelStep,
      n: Number(r.n),
    }));
  }
  const out = new Map<string, FunnelRow>();
  for (const r of rows) {
    const k = `${r.school}|${r.placement}`;
    const row = out.get(k) ?? {
      school: r.school,
      placement: r.placement,
      steps: Object.fromEntries(FUNNEL_STEPS.map((s) => [s, 0])) as Record<FunnelStep, number>,
    };
    row.steps[r.kind] = r.n;
    out.set(k, row);
  }
  return [...out.values()].sort((a, b) => b.steps.scan - a.steps.scan || b.steps.open - a.steps.open);
}

/** Test seam. */
export const __memEventsForTest = memEvents;
