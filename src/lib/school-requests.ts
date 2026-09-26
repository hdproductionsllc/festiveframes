// ─────────────────────────────────────────────────────────────
// "CAN'T FIND YOUR SCHOOL?" — the one thing to do with a miss.
//
// The roster is 29,467 schools and the country has more: new schools, schools the
// federal extract filed under a name nobody uses, schools whose row we dropped.
// A parent who searches and finds nothing is the single most motivated visitor
// the site gets, and until now the page had nothing for them to do.
//
// So the miss is CAPTURED. It costs the parent four fields and it tells us which
// schools people are actually looking for — which is the only honest input into
// what to research next, and a better one than a map of St. Louis.
//
// WE DO NOT EMAIL THE REQUESTER. Ever. The only mail this sends is an internal
// alert to MySchoolFrame's inbox (MSF_ORDER_EMAIL, default bill@myschoolframe.com)
// — see lib/email-msf. The standing rule in CLAUDE.md is that nothing emails
// anybody without the owner's explicit say-so, and a stranger who typed their
// school's name into a box has not asked to hear from us.
//
// Mirrors order/school-ledger.ts exactly: Postgres when DATABASE_URL is set, an
// in-memory Map otherwise, every DB error logged (never the connection string).
// SERVER ONLY — it requires `pg`.
// ─────────────────────────────────────────────────────────────

import type { Pool as PgPool } from "pg";

export interface SchoolRequestRow {
  id: string;
  schoolName: string;
  city: string;
  state: string;
  /** Optional, and only ever used to reply BY HAND if the owner decides to. */
  email: string | null;
  note: string | null;
  createdAt: number;
}

const USE_DB = !!process.env.DATABASE_URL;

// ── In-memory fallback (local dev, and every test) ───────────────────────────
// On globalThis so every route in one `next dev` process shares it (a module-scope
// Map split between the form's route and the staff dashboard on a hot reload).
const memGlobal = globalThis as typeof globalThis & { __msfSchoolRequests?: Map<string, SchoolRequestRow> };
const memRequests = (memGlobal.__msfSchoolRequests ??= new Map<string, SchoolRequestRow>());

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
      await p.query(`
        CREATE TABLE IF NOT EXISTS school_requests (
          id          text PRIMARY KEY,
          school_name text NOT NULL,
          city        text NOT NULL,
          state       text NOT NULL,
          email       text,
          note        text,
          created_at  timestamptz NOT NULL DEFAULT now()
        )
      `);
      await p.query(
        `CREATE INDEX IF NOT EXISTS school_requests_created_idx ON school_requests (created_at)`,
      );
    })().catch((err) => {
      initPromise = null; // let a later call retry rather than caching the failure
      throw err;
    });
  }
  return initPromise;
}

/**
 * Record one request. Returns false when it could not be stored, so the route can
 * say so rather than thanking somebody for nothing.
 *
 * The id is generated here rather than by the database, so the memory path and
 * the Postgres path produce the same row and the alert can quote it either way.
 */
export async function recordSchoolRequest(
  input: Omit<SchoolRequestRow, "id" | "createdAt">,
): Promise<SchoolRequestRow | null> {
  const row: SchoolRequestRow = {
    id: `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: Date.now(),
    ...input,
  };
  try {
    if (!USE_DB) {
      memRequests.set(row.id, row);
      return row;
    }
    await ensureSchema();
    await getPool().query(
      `INSERT INTO school_requests (id, school_name, city, state, email, note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0))`,
      [row.id, row.schoolName, row.city, row.state, row.email, row.note, row.createdAt],
    );
    return row;
  } catch (err) {
    console.error(
      "[school-requests] recordSchoolRequest failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/** Requests, newest first — the staff dashboard's view. Empty rather than an
 *  error when storage fails: a dashboard page must still load. */
export async function listSchoolRequests(limit = 200): Promise<SchoolRequestRow[]> {
  try {
    if (!USE_DB) return [...memRequests.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
    await ensureSchema();
    const res = await getPool().query(
      `SELECT id, school_name, city, state, email, note, created_at FROM school_requests ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return res.rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      schoolName: String(r.school_name),
      city: String(r.city),
      state: String(r.state),
      email: (r.email as string | null) ?? null,
      note: (r.note as string | null) ?? null,
      createdAt: new Date(r.created_at as string).getTime(),
    }));
  } catch (err) {
    console.error("[school-requests] list failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

/** Test seam: the in-memory path, so a suite can exercise the route without a
 *  database. Same shape as `__memOrdersForTest` on the ledger. */
export const __memSchoolRequestsForTest = memRequests;
