// ─────────────────────────────────────────────────────────────
// SAVED SCHOOL DESIGNS — the record behind "Send design" and the parent's link.
//
// Before this, a MySchoolFrame design lived only in the parent's browser: Send
// emailed Bill a picture and kept nothing, so neither side could reopen the design
// they were talking about. Now every Send stores a REVISION of a DESIGN, and the
// parent gets a link that reopens it on any device. Architecture and the options
// weighed: tasks/school-saved-designs-and-proof-approval.md.
//
//   school_designs            one row per design — what a link points at
//   school_design_revisions   IMMUTABLE snapshots, numbered 1, 2, 3 … per design
//   school_artifacts          the rendered print files, content-addressed by sha256
//
// THE RULES THAT MAKE IT TRUSTWORTHY
// - A revision is never edited. "Revision 3" in Bill's inbox always means the same
//   pixels; a change is revision 4. That is what a proof approval (phase 2, the
//   `approved_*` columns) will point at.
// - The link's secret is never stored: only sha256(token). A leaked row cannot be
//   turned into a working link. The id — and the short code DERIVED from it — name
//   a design and unlock nothing, so they may travel to inboxes, Stripe and logs.
// - Kept 18 months after the last revision (owner, 2026-09-25): the warranty is a
//   year, and a claim needs the design. Swept opportunistically, at most daily.
//
// Postgres when DATABASE_URL is set, an in-memory Map otherwise — the same shape
// as order/school-ledger.ts and school-requests.ts. SERVER ONLY (requires `pg`).
// ─────────────────────────────────────────────────────────────

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { Pool as PgPool } from "pg";
import type { OrderContact } from "@/lib/order/order-contact";

/** One rendered file on a revision: the overview proof or a print panel. */
export interface RevisionImage {
  name: string;
  /** A data:image/(png|jpeg);base64 URL — decoded and stored by hash. */
  dataUrl: string;
}

export interface RevisionInput {
  /** The editable builder state (`LoadableDesign`), exactly as the builder sent it. */
  design: unknown;
  /** The coerced parts list, or null. */
  parts: unknown;
  /** The assembled overview — the image a parent sees and (phase 2) approves. */
  proof: RevisionImage;
  /** The separately printed panels. */
  panels: RevisionImage[];
  /** The artwork attestation on the design when it was sent (or null). */
  artworkRights: unknown;
  /** The frame geometry the files were drawn on (SCHOOL_SHIPPING_VARIANT then). */
  variant: string;
  createdBy: "parent" | "team";
}

/** Who sent it — the send sheet's contact, exactly as the route validated it. */
export type DesignContact = OrderContact;

/** What a save hands back. `token` is the raw secret — shown to the parent once,
 *  put in their link, and never persisted. */
export interface SavedDesignRef {
  id: string;
  code: string;
  revision: number;
  token: string;
  /** True when this save started a new design rather than adding to one. */
  created: boolean;
}

export interface OpenedDesign {
  id: string;
  code: string;
  revision: number;
  school: string | null;
  design: unknown;
  savedAt: number;
}

/** A stored image: its hash, type and bytes. */
interface Artifact {
  sha256: string;
  mime: string;
  bytes: Buffer;
}

interface StoredImageRef {
  name: string;
  sha256: string;
  mime: string;
}

const USE_DB = !!process.env.DATABASE_URL;
export const RETENTION_SQL = "18 months";
const SWEEP_EVERY_MS = 24 * 60 * 60 * 1000;

// ── The short code ───────────────────────────────────────────────────────────

// Crockford base32: no I, L, O or U, so a code read aloud over the phone survives.
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * The human name for a design, e.g. "MSF-7K3Q-X2PA": the id's first 40 bits in
 * Crockford base32. DERIVED, never stored — a code that is computed from the id
 * cannot disagree with it. 40 bits keeps accidental collisions out of reach at any
 * volume this product will see, and it is a label, not a key: it unlocks nothing.
 */
export function designCode(id: string): string {
  // 40 bits fits a double exactly (2^53), so plain arithmetic is exact here.
  let n = parseInt(id.replace(/-/g, "").slice(0, 10).padEnd(10, "0"), 16);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out = CROCKFORD[n % 32] + out;
    n = Math.floor(n / 32);
  }
  return `MSF-${out.slice(0, 4)}-${out.slice(4)}`;
}

// ── Secrets and images ───────────────────────────────────────────────────────

/** 32 random bytes, URL-safe. The only copy lives in the parent's link. */
function newToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** A token is 43 base64url characters; anything else is not one of ours. */
export function isWellFormedToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

const DATA_URL_RE = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/;

function toArtifact(img: RevisionImage): Artifact | null {
  const m = DATA_URL_RE.exec(img.dataUrl);
  if (!m) return null;
  const bytes = Buffer.from(m[2], "base64");
  return { sha256: createHash("sha256").update(bytes).digest("hex"), mime: m[1], bytes };
}

/** Split a revision's images into refs (kept on the row) and bytes (stored once). */
function prepareImages(rev: RevisionInput): { proof: StoredImageRef; panels: StoredImageRef[]; artifacts: Artifact[] } | null {
  const proofArt = toArtifact(rev.proof);
  if (!proofArt) return null;
  const artifacts = [proofArt];
  const panels: StoredImageRef[] = [];
  for (const p of rev.panels) {
    const a = toArtifact(p);
    if (!a) continue;
    artifacts.push(a);
    panels.push({ name: p.name, sha256: a.sha256, mime: a.mime });
  }
  return {
    proof: { name: rev.proof.name, sha256: proofArt.sha256, mime: proofArt.mime },
    panels,
    artifacts,
  };
}

// ── In-memory path (local dev, and every test) ───────────────────────────────

interface MemDesign {
  id: string;
  tokenHash: string;
  school: string | null;
  contact: DesignContact;
  createdAt: number;
  updatedAt: number;
  revisions: Array<{
    n: number;
    design: unknown;
    parts: unknown;
    proof: StoredImageRef;
    panels: StoredImageRef[];
    artworkRights: unknown;
    variant: string;
    createdBy: "parent" | "team";
    createdAt: number;
  }>;
}

// On globalThis, not module scope: in `next dev` a route that is edited reloads
// with a FRESH copy of this module, and a module-scope Map would then split —
// the send route saving into one, the open route reading another (a saved link
// that 404s, seen in the local walkthrough). One process, one store.
const memGlobal = globalThis as typeof globalThis & {
  __msfSchoolDesigns?: Map<string, MemDesign>;
  __msfSchoolArtifacts?: Map<string, Artifact>;
};
const memDesigns = (memGlobal.__msfSchoolDesigns ??= new Map<string, MemDesign>());
const memArtifacts = (memGlobal.__msfSchoolArtifacts ??= new Map<string, Artifact>());

// ── Postgres path ────────────────────────────────────────────────────────────

let pool: PgPool | null = null;
let initPromise: Promise<void> | null = null;
let lastSweep = 0;

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
        CREATE TABLE IF NOT EXISTS school_designs (
          id          uuid PRIMARY KEY,
          token_hash  text NOT NULL UNIQUE,
          school_slug text,
          contact     jsonb NOT NULL,
          created_at  timestamptz NOT NULL DEFAULT now(),
          updated_at  timestamptz NOT NULL DEFAULT now()
        )
      `);
      // The approved_* columns are phase 2's (a recorded proof approval). They are
      // created now, null, so that phase adds behaviour and no migration.
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
    })().catch((err) => {
      initPromise = null; // let a later call retry rather than caching the failure
      throw err;
    });
  }
  return initPromise;
}

/**
 * Retention: drop designs untouched for 18 months (revisions cascade), then any
 * image no surviving revision points at. Best-effort and at most daily — a sweep
 * that fails must never fail a parent's send.
 */
async function sweep(): Promise<void> {
  if (Date.now() - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = Date.now();
  try {
    const p = getPool();
    await p.query(`DELETE FROM school_designs WHERE updated_at < now() - interval '${RETENTION_SQL}'`);
    await p.query(
      `DELETE FROM school_artifacts a
        WHERE a.created_at < now() - interval '1 day'
          AND NOT EXISTS (SELECT 1 FROM school_design_revisions r WHERE a.sha256 = ANY(r.artifact_shas))`,
    );
  } catch (err) {
    console.error("[school-designs] sweep failed:", err instanceof Error ? err.message : err);
  }
}

// ── The two operations ───────────────────────────────────────────────────────

/**
 * Store one revision. With a valid `link` (the id + token this browser holds for
 * a design) it is added to that design as the next revision; otherwise — no link,
 * or one that no longer matches — a NEW design is started. A stale link never
 * fails a send: the parent's work is saved either way.
 *
 * Returns null when nothing could be stored (bad proof image, database down). The
 * caller still emails the team: a send must not be lost because the save was.
 */
export async function saveSchoolDesign(input: {
  link?: { id: string; token: string } | null;
  school: string | null;
  contact: DesignContact;
  revision: RevisionInput;
}): Promise<SavedDesignRef | null> {
  const images = prepareImages(input.revision);
  if (!images) return null;
  const rev = input.revision;
  const link = input.link && isWellFormedToken(input.link.token) ? input.link : null;

  try {
    if (!USE_DB) return saveInMemory(input, images, link);

    await ensureSchema();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      for (const a of images.artifacts) {
        await client.query(
          `INSERT INTO school_artifacts (sha256, mime, bytes) VALUES ($1, $2, $3)
           ON CONFLICT (sha256) DO NOTHING`,
          [a.sha256, a.mime, a.bytes],
        );
      }

      // An existing design, if the link still opens one. FOR UPDATE serialises two
      // sends from the same design so they cannot both claim revision n.
      let id: string | null = null;
      let token = "";
      if (link && /^[0-9a-f-]{36}$/i.test(link.id)) {
        const found = await client.query<{ id: string }>(
          `SELECT id FROM school_designs WHERE id = $1 AND token_hash = $2 FOR UPDATE`,
          [link.id, hashToken(link.token)],
        );
        if (found.rows[0]) {
          id = found.rows[0].id;
          token = link.token;
        }
      }
      const created = id === null;
      if (created) {
        id = randomUUID();
        token = newToken();
        await client.query(
          `INSERT INTO school_designs (id, token_hash, school_slug, contact) VALUES ($1, $2, $3, $4)`,
          [id, hashToken(token), input.school, JSON.stringify(input.contact)],
        );
      } else {
        await client.query(
          `UPDATE school_designs SET contact = $2, school_slug = COALESCE($3, school_slug), updated_at = now()
            WHERE id = $1`,
          [id, JSON.stringify(input.contact), input.school],
        );
      }
      const next = await client.query<{ n: number }>(
        `SELECT COALESCE(MAX(n), 0) + 1 AS n FROM school_design_revisions WHERE design_id = $1`,
        [id],
      );
      const n = Number(next.rows[0].n);
      await client.query(
        `INSERT INTO school_design_revisions
           (design_id, n, design, parts, proof, panels, artifact_shas, artwork_rights, variant, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id,
          n,
          JSON.stringify(rev.design ?? null),
          rev.parts == null ? null : JSON.stringify(rev.parts),
          JSON.stringify(images.proof),
          JSON.stringify(images.panels),
          images.artifacts.map((a) => a.sha256),
          rev.artworkRights == null ? null : JSON.stringify(rev.artworkRights),
          rev.variant,
          rev.createdBy,
        ],
      );
      await client.query("COMMIT");
      void sweep();
      return { id: id!, code: designCode(id!), revision: n, token, created };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[school-designs] save failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

function saveInMemory(
  input: Parameters<typeof saveSchoolDesign>[0],
  images: NonNullable<ReturnType<typeof prepareImages>>,
  link: { id: string; token: string } | null,
): SavedDesignRef {
  for (const a of images.artifacts) if (!memArtifacts.has(a.sha256)) memArtifacts.set(a.sha256, a);
  const now = Date.now();
  let d = link ? memDesigns.get(link.id) : undefined;
  let token = link?.token ?? "";
  if (d && !sameHash(d.tokenHash, hashToken(token))) d = undefined;
  const created = !d;
  if (!d) {
    token = newToken();
    d = {
      id: randomUUID(),
      tokenHash: hashToken(token),
      school: input.school,
      contact: input.contact,
      createdAt: now,
      updatedAt: now,
      revisions: [],
    };
    memDesigns.set(d.id, d);
  } else {
    d.contact = input.contact;
    d.school = input.school ?? d.school;
    d.updatedAt = now;
  }
  const rev = input.revision;
  const n = d.revisions.length + 1;
  d.revisions.push({
    n,
    design: rev.design ?? null,
    parts: rev.parts ?? null,
    proof: images.proof,
    panels: images.panels,
    artworkRights: rev.artworkRights ?? null,
    variant: rev.variant,
    createdBy: rev.createdBy,
    createdAt: now,
  });
  return { id: d.id, code: designCode(d.id), revision: n, token, created };
}

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** The LATEST revision of the design this token opens, or null. */
export async function openSchoolDesign(token: string): Promise<OpenedDesign | null> {
  if (!isWellFormedToken(token)) return null;
  const tokenHash = hashToken(token);
  try {
    if (!USE_DB) {
      for (const d of memDesigns.values()) {
        if (!sameHash(d.tokenHash, tokenHash)) continue;
        const last = d.revisions[d.revisions.length - 1];
        if (!last) return null;
        return { id: d.id, code: designCode(d.id), revision: last.n, school: d.school, design: last.design, savedAt: last.createdAt };
      }
      return null;
    }
    await ensureSchema();
    const res = await getPool().query<{ id: string; school_slug: string | null; n: number; design: unknown; created_at: Date }>(
      `SELECT d.id, d.school_slug, r.n, r.design, r.created_at
         FROM school_designs d
         JOIN school_design_revisions r ON r.design_id = d.id
        WHERE d.token_hash = $1
        ORDER BY r.n DESC
        LIMIT 1`,
      [tokenHash],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      code: designCode(row.id),
      revision: Number(row.n),
      school: row.school_slug,
      design: row.design,
      savedAt: new Date(row.created_at).getTime(),
    };
  } catch (err) {
    console.error("[school-designs] open failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Test seams: the in-memory path, same shape as `__memOrdersForTest` on the ledger. */
export const __memSchoolDesignsForTest = memDesigns;
export const __memSchoolArtifactsForTest = memArtifacts;
