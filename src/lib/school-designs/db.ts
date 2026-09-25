// ─────────────────────────────────────────────────────────────
// The one database connection and schema behind saved school designs AND school
// orders (store.ts, orders.ts). One pool, one schema init, one answer to "where
// does this live".
//
// WHERE IT LIVES — `storageMode()`:
//   "db"          DATABASE_URL is set: Postgres.
//   "memory"      no DATABASE_URL in development or tests: an in-process Map.
//   "unavailable" no DATABASE_URL in PRODUCTION. Nothing is stored, and callers
//                 say so. A "saved" design held in memory would hand a parent a
//                 working link that dies at the next deploy, and a paid order held
//                 in memory is a paid order lost — so production refuses rather
//                 than pretending (review 2026-09-25, #6).
//
// SERVER ONLY — it requires `pg`.
// ─────────────────────────────────────────────────────────────

import type { Pool as PgPool } from "pg";

export type StorageMode = "db" | "memory" | "unavailable";

export function storageMode(): StorageMode {
  if (process.env.DATABASE_URL) return "db";
  return process.env.NODE_ENV === "production" ? "unavailable" : "memory";
}

let pool: PgPool | null = null;
let initPromise: Promise<void> | null = null;

export function getPool(): PgPool {
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

export function ensureSchema(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const p = getPool();
      await p.query(`
        CREATE TABLE IF NOT EXISTS school_designs (
          id          uuid PRIMARY KEY,
          token_hash  text NOT NULL UNIQUE,
          school_slug text,
          contact     jsonb,
          created_at  timestamptz NOT NULL DEFAULT now(),
          updated_at  timestamptz NOT NULL DEFAULT now()
        )
      `);
      // A Buy saves before Stripe has the parent's email, so contact may be null.
      await p.query(`ALTER TABLE school_designs ALTER COLUMN contact DROP NOT NULL`);
      await p.query(`
        CREATE TABLE IF NOT EXISTS school_design_revisions (
          design_id      uuid NOT NULL REFERENCES school_designs(id) ON DELETE CASCADE,
          n              integer NOT NULL,
          design         jsonb NOT NULL,
          parts          jsonb,
          proof          jsonb NOT NULL,
          panels         jsonb NOT NULL,
          artifact_shas  text[] NOT NULL,
          artwork_rights jsonb,
          variant        text NOT NULL,
          created_by     text NOT NULL,
          created_at     timestamptz NOT NULL DEFAULT now(),
          approved_at              timestamptz,
          approval_wording_version text,
          approver_ip              text,
          approver_user_agent      text,
          PRIMARY KEY (design_id, n)
        )
      `);
      // Added after the first deploy (2026-09-25): the content fingerprint that
      // makes an unchanged re-send reuse its revision, and the uploaded originals.
      await p.query(`ALTER TABLE school_design_revisions ADD COLUMN IF NOT EXISTS fingerprint text`);
      await p.query(`ALTER TABLE school_design_revisions ADD COLUMN IF NOT EXISTS originals jsonb`);
      await p.query(`
        CREATE TABLE IF NOT EXISTS school_artifacts (
          sha256     text PRIMARY KEY,
          mime       text NOT NULL,
          bytes      bytea NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await p.query(
        `CREATE INDEX IF NOT EXISTS school_designs_updated_idx ON school_designs (updated_at)`,
      );
      // A school ORDER is a paid, approved revision. Its files are the revision's,
      // which never change — so there is nothing on an order to replace or sweep.
      await p.query(`
        CREATE TABLE IF NOT EXISTS school_orders (
          order_id       uuid PRIMARY KEY,
          design_id      uuid NOT NULL REFERENCES school_designs(id),
          revision       integer NOT NULL,
          proof_sha256   text NOT NULL,
          school_slug    text,
          status         text NOT NULL,
          session_id     text,
          payment_status text,
          amount_cents   integer,
          claim_until    timestamptz,
          attempts       integer NOT NULL DEFAULT 0,
          last_error     text,
          created_at     timestamptz NOT NULL DEFAULT now(),
          paid_at        timestamptz,
          sent_at        timestamptz,
          FOREIGN KEY (design_id, revision) REFERENCES school_design_revisions(design_id, n)
        )
      `);
    })().catch((err) => {
      initPromise = null; // let a later call retry rather than caching the failure
      throw err;
    });
  }
  return initPromise;
}
