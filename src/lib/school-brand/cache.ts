// ─────────────────────────────────────────────────────────────
// THE BRAND CACHE — one parent's scan colours every other parent's frame.
//
// A thin kit (data/thin-kit.ts) opens in neutral navy, because we have never seen
// the school's colours and guessing them prints a wrong product. The scanner at
// /api/school/brand-scan can find them from the school's own website — but it ran
// per visitor and threw the answer away when the tab closed, so the second parent
// from that school did the same work and the ninth never bothered.
//
// So the scan's result is KEPT, keyed by slug. The next parent from that school
// lands on a frame already in their colours, and a school inches from "we have
// never heard of you" towards "this is ours" without anybody hand-authoring a kit.
//
// ROSTER SLUGS ONLY. An authored kit's colours were researched, sometimes sampled
// from the school's own artwork, and occasionally confirmed; a drive-by scan of a
// CMS that declares its link blue as `--color-primary` must never overwrite that.
// `persistScannedBrand` below is the one gate, and `cache.test.ts` pins it.
//
// Mirrors order/school-ledger.ts exactly: Postgres when DATABASE_URL is set, an
// in-memory Map otherwise, every DB error logged (never the connection string)
// and swallowed. A cache that throws is worse than a cache that misses — this
// sits in the render path of a page whose whole job is to open fast.
//
// SERVER ONLY. It requires `pg`.
// ─────────────────────────────────────────────────────────────

import type { Pool as PgPool } from "pg";
import { brandColorHexes } from "./apply-brand";
import type { ColorCandidate } from "./types";
import { resolveSchoolSlug } from "@/data/school-resolve";

export interface CachedBrand {
  /** Ranked brand hexes, best first, `#RRGGBB`. The FRAME's three surfaces are
   *  derived from these by `assignSurfaces` (school-brand/apply-brand.ts) rather
   *  than stored, so a change to that rule reaches every cached school at once —
   *  storing the three would freeze today's rule into the database. */
  colors: string[];
  /** The page the colours came from. Shown to the parent in `colorSource`, so it
   *  is a claim we have to be able to point at. */
  sourceUrl: string;
  /** Epoch ms. */
  scannedAt: number;
}

const USE_DB = !!process.env.DATABASE_URL;

// ── In-memory fallback (local dev, and every test) ───────────────────────────
const memBrands = new Map<string, CachedBrand>();

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
      // `colors` is TEXT holding a JSON array rather than jsonb: the value is
      // read back whole and never queried into, and text needs no agreement with
      // the driver about how a jsonb column decodes.
      //
      // No TTL. A school's colours do not expire, and a rescan simply overwrites.
      await p.query(`
        CREATE TABLE IF NOT EXISTS school_brand_cache (
          slug       text PRIMARY KEY,
          colors     text NOT NULL,
          source_url text NOT NULL,
          scanned_at timestamptz NOT NULL DEFAULT now()
        )
      `);
    })().catch((err) => {
      initPromise = null; // let a later call retry rather than caching the failure
      throw err;
    });
  }
  return initPromise;
}

/** Only real six-digit hexes reach the renderer; a scan that returned junk must
 *  not repaint anyone's frame. */
function cleanColors(colors: unknown): string[] {
  if (!Array.isArray(colors)) return [];
  return colors
    .filter((c): c is string => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c))
    .map((c) => c.toUpperCase())
    .slice(0, 6);
}

/** A school's cached colours, or null. Never throws. */
export async function getCachedBrand(slug: string): Promise<CachedBrand | null> {
  if (!slug) return null;
  try {
    if (!USE_DB) return memBrands.get(slug) ?? null;
    await ensureSchema();
    const { rows } = await getPool().query(
      `SELECT colors, source_url, scanned_at FROM school_brand_cache WHERE slug = $1`,
      [slug],
    );
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    let parsed: unknown = [];
    try {
      parsed = JSON.parse(String(row.colors));
    } catch {
      return null;
    }
    const colors = cleanColors(parsed);
    if (!colors.length) return null;
    return {
      colors,
      sourceUrl: String(row.source_url),
      scannedAt:
        row.scanned_at instanceof Date
          ? row.scanned_at.getTime()
          : new Date(String(row.scanned_at)).getTime(),
    };
  } catch (err) {
    console.error(
      "[brand-cache] getCachedBrand failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * Record what a scan found. Last scan wins.
 *
 * Never throws: this runs after a successful scan has already been returned to
 * the parent who ran it, and failing to remember the answer must not turn their
 * working result into an error.
 */
export async function putCachedBrand(slug: string, brand: CachedBrand): Promise<void> {
  const colors = cleanColors(brand?.colors);
  if (!slug || !colors.length) return;
  const sourceUrl = String(brand.sourceUrl ?? "").slice(0, 2048);
  const scannedAt = Number.isFinite(brand.scannedAt) ? brand.scannedAt : Date.now();

  try {
    if (!USE_DB) {
      memBrands.set(slug, { colors, sourceUrl, scannedAt });
      return;
    }
    await ensureSchema();
    await getPool().query(
      `INSERT INTO school_brand_cache (slug, colors, source_url, scanned_at)
       VALUES ($1, $2, $3, to_timestamp($4 / 1000.0))
       ON CONFLICT (slug) DO UPDATE
         SET colors = EXCLUDED.colors,
             source_url = EXCLUDED.source_url,
             scanned_at = EXCLUDED.scanned_at`,
      [slug, JSON.stringify(colors), sourceUrl, scannedAt],
    );
  } catch (err) {
    console.error(
      "[brand-cache] putCachedBrand failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Remember what a scan found, IF this slug is a school we may remember it for.
 *
 * ROSTER SLUGS ONLY. An authored kit's colours were researched — SLUH's and
 * MICDS's were sampled from the schools' own artwork — and a drive-by scan of a
 * CMS that declares its link blue as `--color-primary` must never overwrite them.
 * `resolveSchoolSlug` is the one place that knows which kind of slug this is, so
 * the check is a lookup rather than a rule restated at the call site; an authored
 * slug, a roster slug that redirects to an authored kit, and an unknown slug all
 * fall through doing nothing.
 *
 * It lives here rather than in the route because a Next route file may only
 * export its HTTP handlers, and a rule this consequential should be reachable by
 * a test rather than reasoned about.
 */
export async function persistScannedBrand(
  slug: string,
  colors: ColorCandidate[],
  sourceUrl: string,
): Promise<void> {
  if (!slug) return;
  const resolved = resolveSchoolSlug(slug);
  if (resolved.kind !== "roster") return;
  const hexes = brandColorHexes(colors);
  if (!hexes.length) return;
  await putCachedBrand(resolved.kit.slug, { colors: hexes, sourceUrl, scannedAt: Date.now() });
}

/** Test seam: the in-memory path, so a suite can exercise the round trip without
 *  a database. Same shape as `__memOrdersForTest` on the ledger. */
export const __memBrandsForTest = memBrands;
