// ─────────────────────────────────────────────────────────────
// SAVED SCHOOL DESIGNS — the record behind "Send design", the parent's link, and
// every school order.
//
// Before this, a MySchoolFrame design lived only in the parent's browser: Send
// emailed Bill a picture and kept nothing, so neither side could reopen the design
// they were talking about. Now every Send (and every Buy) stores a REVISION of a
// DESIGN, and the parent gets a link that reopens it on any device. Architecture
// and the options weighed: tasks/school-saved-designs-and-proof-approval.md.
//
//   school_designs            one row per design — what a link points at
//   school_design_revisions   IMMUTABLE snapshots, numbered 1, 2, 3 … per design
//   school_artifacts          print files AND uploaded originals, by sha256
//   (school_orders            a paid, approved revision — orders.ts)
//
// THE RULES THAT MAKE IT TRUSTWORTHY
// - A revision's content is never edited. "Revision 3" in Bill's inbox always
//   means the same pixels; a change is revision 4. The ONE write a revision takes
//   is its approval, set once and never cleared.
// - Sending the SAME content again reuses its revision (the fingerprint): a retry
//   after a failed email, or a double tap, is not "version 2" of nothing.
// - The link's secret is never stored: only sha256(token). The id — and the short
//   code DERIVED from it — name a design and unlock nothing.
// - EVERYTHING a revision points at is on the server. An uploaded photo's
//   print-resolution original used to stay in the uploader's IndexedDB, so a design
//   reopened on another phone printed from its preview (review 2026-09-25, #1). The
//   originals are stored here now, keyed by the design's own `fullResId`, and
//   restored under that same id when the link is opened.
// - Kept 18 months after the last revision (owner, 2026-09-25); a design with an
//   order is never swept. Swept opportunistically, at most daily.
//
// Where it lives: see db.ts (`storageMode`) — Postgres, memory in dev/tests, and
// NOTHING in production without a database. SERVER ONLY.
// ─────────────────────────────────────────────────────────────

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { OrderContact } from "@/lib/order/order-contact";
import { ensureSchema, getPool, storageMode } from "./db";
import { collectFullResIds } from "./full-res-ids";

export { collectFullResIds };

/** One rendered or uploaded image, as it arrives: a data:image/(png|jpeg) URL. */
export interface RevisionImage {
  name: string;
  dataUrl: string;
}

export interface RevisionInput {
  /** The editable builder state (`LoadableDesign`), exactly as the builder sent it. */
  design: unknown;
  /** The coerced parts list, or null. */
  parts: unknown;
  /** The assembled overview — the image a parent sees and approves. */
  proof: RevisionImage;
  /** The separately printed panels. */
  panels: RevisionImage[];
  /** Uploaded photos' print-resolution originals, by the design's `fullResId`. */
  originals?: Array<{ fullResId: string; dataUrl: string }>;
  /** The artwork attestation on the design when it was sent (or null). */
  artworkRights: unknown;
  /** The frame geometry the files were drawn on (SCHOOL_SHIPPING_VARIANT then). */
  variant: string;
  createdBy: "parent" | "team";
}

/** Who sent it — the send sheet's contact. Null on a Buy (Stripe collects it). */
export type DesignContact = OrderContact;

/** What a save hands back. `token` is the raw secret — shown to the parent, put in
 *  their link, never persisted. */
export interface SavedDesignRef {
  id: string;
  code: string;
  revision: number;
  token: string;
  /** True when this save started a new design rather than adding to one. */
  created: boolean;
  /** True when the content matched the latest revision, which was reused. */
  reused: boolean;
}

export interface OpenedDesign {
  id: string;
  code: string;
  revision: number;
  school: string | null;
  design: unknown;
  /** Uploaded originals this design's revision holds, to restore on this device. */
  originals: Array<{ fullResId: string; sha256: string }>;
  savedAt: number;
}

/** A stored image reference on a revision. */
export interface StoredImageRef {
  name: string;
  sha256: string;
  mime: string;
}

/** A revision as the order path reads it. */
export interface RevisionRecord {
  designId: string;
  code: string;
  n: number;
  school: string | null;
  design: unknown;
  parts: unknown;
  proof: StoredImageRef;
  panels: StoredImageRef[];
  artworkRights: unknown;
  approval: { at: number; wordingVersion: string } | null;
}

interface Artifact {
  sha256: string;
  mime: string;
  bytes: Buffer;
}

interface OriginalRef {
  fullResId: string;
  sha256: string;
  mime: string;
}

export const RETENTION_SQL = "18 months";
const SWEEP_EVERY_MS = 24 * 60 * 60 * 1000;

// ── The short code ───────────────────────────────────────────────────────────

// Crockford base32: no I, L, O or U, so a code read aloud over the phone survives.
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * The human name for a design, e.g. "MSF-7K3Q-X2PA": the id's first 40 bits in
 * Crockford base32. DERIVED, never stored — a code that is computed from the id
 * cannot disagree with it. It is a label, not a key: it unlocks nothing.
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

export function sha256Of(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const DATA_URL_RE = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/;

function toArtifact(dataUrl: string): Artifact | null {
  const m = DATA_URL_RE.exec(dataUrl);
  if (!m) return null;
  const bytes = Buffer.from(m[2], "base64");
  return { sha256: sha256Of(bytes), mime: m[1], bytes };
}

/** A data URL for a stored artifact — how the order email attaches it. */
export function artifactDataUrl(a: { mime: string; bytes: Buffer }): string {
  return `data:${a.mime};base64,${a.bytes.toString("base64")}`;
}

interface Prepared {
  proof: StoredImageRef;
  panels: StoredImageRef[];
  originals: OriginalRef[];
  artifacts: Artifact[];
  fingerprint: string;
}

/** Split a revision's images into refs (kept on the row) and bytes (stored once),
 *  and fingerprint its content. */
function prepare(rev: RevisionInput): Prepared | null {
  const proofArt = toArtifact(rev.proof.dataUrl);
  if (!proofArt) return null;
  const artifacts = [proofArt];
  const panels: StoredImageRef[] = [];
  for (const p of rev.panels) {
    const a = toArtifact(p.dataUrl);
    if (!a) continue;
    artifacts.push(a);
    panels.push({ name: p.name, sha256: a.sha256, mime: a.mime });
  }
  // Only originals the design actually references — nothing else rides along.
  const referenced = new Set(collectFullResIds(rev.design));
  const originals: OriginalRef[] = [];
  for (const o of rev.originals ?? []) {
    if (!referenced.has(o.fullResId) || originals.some((x) => x.fullResId === o.fullResId)) continue;
    const a = toArtifact(o.dataUrl);
    if (!a) continue;
    artifacts.push(a);
    originals.push({ fullResId: o.fullResId, sha256: a.sha256, mime: a.mime });
  }
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        design: rev.design ?? null,
        parts: rev.parts ?? null,
        proof: proofArt.sha256,
        panels: panels.map((p) => p.sha256),
        originals: originals.map((o) => [o.fullResId, o.sha256]),
        variant: rev.variant,
        artworkRights: rev.artworkRights ?? null,
      }),
    )
    .digest("hex");
  return {
    proof: { name: rev.proof.name, sha256: proofArt.sha256, mime: proofArt.mime },
    panels,
    originals,
    artifacts,
    fingerprint,
  };
}

// ── In-memory path (local dev, and every test) ───────────────────────────────

interface MemRevision {
  n: number;
  design: unknown;
  parts: unknown;
  proof: StoredImageRef;
  panels: StoredImageRef[];
  originals: OriginalRef[];
  artworkRights: unknown;
  variant: string;
  createdBy: "parent" | "team";
  createdAt: number;
  fingerprint: string;
  approval: { at: number; wordingVersion: string; ip: string | null; userAgent: string | null } | null;
}

interface MemDesign {
  id: string;
  tokenHash: string;
  school: string | null;
  contact: DesignContact | null;
  createdAt: number;
  updatedAt: number;
  revisions: MemRevision[];
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

function memByToken(token: string): MemDesign | undefined {
  const h = hashToken(token);
  for (const d of memDesigns.values()) if (sameHash(d.tokenHash, h)) return d;
  return undefined;
}

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

// ── Retention ────────────────────────────────────────────────────────────────

let lastSweep = 0;

/**
 * Drop designs untouched for 18 months — never one with an order (revisions
 * cascade) — then any image no surviving revision points at. Best-effort and at
 * most daily: a sweep that fails must never fail a parent's send.
 */
async function sweep(): Promise<void> {
  if (Date.now() - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = Date.now();
  try {
    const p = getPool();
    await p.query(
      `DELETE FROM school_designs d
        WHERE d.updated_at < now() - interval '${RETENTION_SQL}'
          AND NOT EXISTS (SELECT 1 FROM school_orders o WHERE o.design_id = d.id)`,
    );
    await p.query(
      `DELETE FROM school_artifacts a
        WHERE a.created_at < now() - interval '1 day'
          AND NOT EXISTS (SELECT 1 FROM school_design_revisions r WHERE a.sha256 = ANY(r.artifact_shas))`,
    );
  } catch (err) {
    console.error("[school-designs] sweep failed:", err instanceof Error ? err.message : err);
  }
}

// ── Save ─────────────────────────────────────────────────────────────────────

/**
 * Store one revision. With a valid `link` (the id + token this browser holds for
 * a design) it joins that design — as its next revision, or as its latest one
 * again when nothing changed. Otherwise — no link, or one that no longer matches
 * — a NEW design is started. A stale link never fails a send.
 *
 * Returns null when nothing could be stored (bad proof image, database down, no
 * database in production). The caller decides what that means for its request.
 */
export async function saveSchoolDesign(input: {
  link?: { id: string; token: string } | null;
  school: string | null;
  contact: DesignContact | null;
  revision: RevisionInput;
}): Promise<SavedDesignRef | null> {
  const prep = prepare(input.revision);
  if (!prep) return null;
  const rev = input.revision;
  const link = input.link && isWellFormedToken(input.link.token) ? input.link : null;
  const mode = storageMode();
  if (mode === "unavailable") {
    console.error("[school-designs] no DATABASE_URL in production — design NOT saved.");
    return null;
  }

  try {
    if (mode === "memory") return saveInMemory(input, prep, link);

    await ensureSchema();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      for (const a of prep.artifacts) {
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
          [id, hashToken(token), input.school, input.contact ? JSON.stringify(input.contact) : null],
        );
      } else {
        await client.query(
          `UPDATE school_designs
              SET contact = COALESCE($2, contact), school_slug = COALESCE($3, school_slug), updated_at = now()
            WHERE id = $1`,
          [id, input.contact ? JSON.stringify(input.contact) : null, input.school],
        );
        const last = await client.query<{ n: number; fingerprint: string | null }>(
          `SELECT n, fingerprint FROM school_design_revisions WHERE design_id = $1 ORDER BY n DESC LIMIT 1`,
          [id],
        );
        if (last.rows[0] && last.rows[0].fingerprint === prep.fingerprint) {
          await client.query("COMMIT");
          return { id: id!, code: designCode(id!), revision: Number(last.rows[0].n), token, created: false, reused: true };
        }
      }
      const next = await client.query<{ n: number }>(
        `SELECT COALESCE(MAX(n), 0) + 1 AS n FROM school_design_revisions WHERE design_id = $1`,
        [id],
      );
      const n = Number(next.rows[0].n);
      await client.query(
        `INSERT INTO school_design_revisions
           (design_id, n, design, parts, proof, panels, originals, artifact_shas, artwork_rights,
            variant, created_by, fingerprint)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          id,
          n,
          JSON.stringify(rev.design ?? null),
          rev.parts == null ? null : JSON.stringify(rev.parts),
          JSON.stringify(prep.proof),
          JSON.stringify(prep.panels),
          JSON.stringify(prep.originals),
          prep.artifacts.map((a) => a.sha256),
          rev.artworkRights == null ? null : JSON.stringify(rev.artworkRights),
          rev.variant,
          rev.createdBy,
          prep.fingerprint,
        ],
      );
      await client.query("COMMIT");
      void sweep();
      return { id: id!, code: designCode(id!), revision: n, token, created, reused: false };
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
  prep: Prepared,
  link: { id: string; token: string } | null,
): SavedDesignRef {
  for (const a of prep.artifacts) if (!memArtifacts.has(a.sha256)) memArtifacts.set(a.sha256, a);
  const now = Date.now();
  let d = link ? memDesigns.get(link.id) : undefined;
  let token = link?.token ?? "";
  if (d && !sameHash(d.tokenHash, hashToken(token))) d = undefined;
  const created = !d;
  if (!d) {
    token = newToken();
    d = { id: randomUUID(), tokenHash: hashToken(token), school: input.school, contact: input.contact, createdAt: now, updatedAt: now, revisions: [] };
    memDesigns.set(d.id, d);
  } else {
    d.contact = input.contact ?? d.contact;
    d.school = input.school ?? d.school;
    d.updatedAt = now;
    const last = d.revisions[d.revisions.length - 1];
    if (last && last.fingerprint === prep.fingerprint) {
      return { id: d.id, code: designCode(d.id), revision: last.n, token, created: false, reused: true };
    }
  }
  const rev = input.revision;
  const n = d.revisions.length + 1;
  d.revisions.push({
    n,
    design: rev.design ?? null,
    parts: rev.parts ?? null,
    proof: prep.proof,
    panels: prep.panels,
    originals: prep.originals,
    artworkRights: rev.artworkRights ?? null,
    variant: rev.variant,
    createdBy: rev.createdBy,
    createdAt: now,
    fingerprint: prep.fingerprint,
    approval: null,
  });
  return { id: d.id, code: designCode(d.id), revision: n, token, created, reused: false };
}

// ── Open ─────────────────────────────────────────────────────────────────────

/** The LATEST revision of the design this token opens, or null. */
export async function openSchoolDesign(token: string): Promise<OpenedDesign | null> {
  if (!isWellFormedToken(token)) return null;
  const mode = storageMode();
  if (mode === "unavailable") return null;
  try {
    if (mode === "memory") {
      const d = memByToken(token);
      const last = d?.revisions[d.revisions.length - 1];
      if (!d || !last) return null;
      return {
        id: d.id,
        code: designCode(d.id),
        revision: last.n,
        school: d.school,
        design: last.design,
        originals: last.originals.map(({ fullResId, sha256 }) => ({ fullResId, sha256 })),
        savedAt: last.createdAt,
      };
    }
    await ensureSchema();
    const res = await getPool().query<{
      id: string;
      school_slug: string | null;
      n: number;
      design: unknown;
      originals: OriginalRef[] | null;
      created_at: Date;
    }>(
      `SELECT d.id, d.school_slug, r.n, r.design, r.originals, r.created_at
         FROM school_designs d
         JOIN school_design_revisions r ON r.design_id = d.id
        WHERE d.token_hash = $1
        ORDER BY r.n DESC
        LIMIT 1`,
      [hashToken(token)],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      code: designCode(row.id),
      revision: Number(row.n),
      school: row.school_slug,
      design: row.design,
      originals: (row.originals ?? []).map(({ fullResId, sha256 }) => ({ fullResId, sha256 })),
      savedAt: new Date(row.created_at).getTime(),
    };
  } catch (err) {
    console.error("[school-designs] open failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * One uploaded ORIGINAL, for the device that holds this design's token — so a
 * link opened on a new phone restores print-quality photos. Only an image one of
 * this design's revisions lists as an original: the token is not a key to every
 * file on the server, and print panels are not handed out here.
 */
export async function getDesignOriginal(
  token: string,
  sha256: string,
): Promise<{ mime: string; bytes: Buffer } | null> {
  if (!isWellFormedToken(token) || !/^[0-9a-f]{64}$/.test(sha256)) return null;
  const mode = storageMode();
  if (mode === "unavailable") return null;
  try {
    if (mode === "memory") {
      const d = memByToken(token);
      if (!d || !d.revisions.some((r) => r.originals.some((o) => o.sha256 === sha256))) return null;
      const a = memArtifacts.get(sha256);
      return a ? { mime: a.mime, bytes: a.bytes } : null;
    }
    await ensureSchema();
    const res = await getPool().query<{ mime: string; bytes: Buffer }>(
      `SELECT a.mime, a.bytes
         FROM school_artifacts a
        WHERE a.sha256 = $2
          AND EXISTS (
            SELECT 1 FROM school_designs d
              JOIN school_design_revisions r ON r.design_id = d.id
             WHERE d.token_hash = $1
               AND r.originals @> jsonb_build_array(jsonb_build_object('sha256', $2::text))
          )`,
      [hashToken(token), sha256],
    );
    return res.rows[0] ?? null;
  } catch (err) {
    console.error("[school-designs] original fetch failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Approve, and read back for an order ──────────────────────────────────────

/**
 * Record the parent's "yes" on revision `n` of the design this token opens. Set
 * ONCE: approving an approved revision is a no-op that answers the first
 * approval. Returns the revision as approved, or null (wrong token, no such
 * revision, no storage).
 */
export async function approveRevision(
  token: string,
  n: number,
  who: { wordingVersion: string; ip: string | null; userAgent: string | null },
): Promise<RevisionRecord | null> {
  if (!isWellFormedToken(token) || !Number.isInteger(n) || n < 1) return null;
  const mode = storageMode();
  if (mode === "unavailable") return null;
  try {
    if (mode === "memory") {
      const d = memByToken(token);
      const r = d?.revisions.find((x) => x.n === n);
      if (!d || !r) return null;
      r.approval ??= { at: Date.now(), wordingVersion: who.wordingVersion, ip: who.ip, userAgent: who.userAgent };
      return memRecord(d, r);
    }
    await ensureSchema();
    const res = await getPool().query<{ design_id: string }>(
      `UPDATE school_design_revisions r
          SET approved_at = COALESCE(r.approved_at, now()),
              approval_wording_version = COALESCE(r.approval_wording_version, $3),
              approver_ip = COALESCE(r.approver_ip, $4),
              approver_user_agent = COALESCE(r.approver_user_agent, $5)
         FROM school_designs d
        WHERE d.id = r.design_id AND d.token_hash = $1 AND r.n = $2
        RETURNING r.design_id`,
      [hashToken(token), n, who.wordingVersion, who.ip, who.userAgent?.slice(0, 300) ?? null],
    );
    const designId = res.rows[0]?.design_id;
    return designId ? getRevision(designId, n) : null;
  } catch (err) {
    console.error("[school-designs] approve failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

function memRecord(d: MemDesign, r: MemRevision): RevisionRecord {
  return {
    designId: d.id,
    code: designCode(d.id),
    n: r.n,
    school: d.school,
    design: r.design,
    parts: r.parts,
    proof: r.proof,
    panels: r.panels,
    artworkRights: r.artworkRights,
    approval: r.approval ? { at: r.approval.at, wordingVersion: r.approval.wordingVersion } : null,
  };
}

/** Revision `n` of the design this token opens — checkout's read: the token
 *  proves the browser holds the design it is about to pay for. */
export async function getRevisionByToken(token: string, n: number): Promise<RevisionRecord | null> {
  if (!isWellFormedToken(token) || !Number.isInteger(n) || n < 1) return null;
  const mode = storageMode();
  if (mode === "unavailable") return null;
  if (mode === "memory") {
    const d = memByToken(token);
    const r = d?.revisions.find((x) => x.n === n);
    return d && r ? memRecord(d, r) : null;
  }
  await ensureSchema();
  const res = await getPool().query<{ id: string }>(`SELECT id FROM school_designs WHERE token_hash = $1`, [hashToken(token)]);
  return res.rows[0] ? getRevision(res.rows[0].id, n) : null;
}

/** Revision `n` of a design, by id — the order path's read. */
export async function getRevision(designId: string, n: number): Promise<RevisionRecord | null> {
  const mode = storageMode();
  if (mode === "unavailable") return null;
  if (mode === "memory") {
    const d = memDesigns.get(designId);
    const r = d?.revisions.find((x) => x.n === n);
    return d && r ? memRecord(d, r) : null;
  }
  await ensureSchema();
  const res = await getPool().query<{
    school_slug: string | null;
    design: unknown;
    parts: unknown;
    proof: StoredImageRef;
    panels: StoredImageRef[];
    artwork_rights: unknown;
    approved_at: Date | null;
    approval_wording_version: string | null;
  }>(
    `SELECT d.school_slug, r.design, r.parts, r.proof, r.panels, r.artwork_rights,
            r.approved_at, r.approval_wording_version
       FROM school_design_revisions r
       JOIN school_designs d ON d.id = r.design_id
      WHERE r.design_id = $1 AND r.n = $2`,
    [designId, n],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    designId,
    code: designCode(designId),
    n,
    school: row.school_slug,
    design: row.design,
    parts: row.parts,
    proof: row.proof,
    panels: row.panels,
    artworkRights: row.artwork_rights,
    approval: row.approved_at
      ? { at: new Date(row.approved_at).getTime(), wordingVersion: row.approval_wording_version ?? "" }
      : null,
  };
}

/** The bytes of one stored image — the order path attaches them. */
export async function getArtifact(sha256: string): Promise<{ mime: string; bytes: Buffer } | null> {
  const mode = storageMode();
  if (mode === "unavailable") return null;
  if (mode === "memory") {
    const a = memArtifacts.get(sha256);
    return a ? { mime: a.mime, bytes: a.bytes } : null;
  }
  await ensureSchema();
  const res = await getPool().query<{ mime: string; bytes: Buffer }>(
    `SELECT mime, bytes FROM school_artifacts WHERE sha256 = $1`,
    [sha256],
  );
  return res.rows[0] ?? null;
}

/** Test seams: the in-memory path, same shape as `__memOrdersForTest` on the ledger. */
export const __memSchoolDesignsForTest = memDesigns;
export const __memSchoolArtifactsForTest = memArtifacts;
