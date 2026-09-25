// ─────────────────────────────────────────────────────────────
// A school design as the builder submits it — checked once, saved once.
//
// Two routes take a design from the builder: SEND (/api/school/submit, save +
// email the team) and BUY (/api/school/designs/save, save only — the proof sheet
// and checkout come next). They must validate and store it identically, so the
// rules live here and both routes call them.
//
// Trust boundary: EVERYTHING in the body is untrusted.
//   - images must be data:image/(png|jpeg) URLs, size-bounded;
//   - the parts list is COERCED to a clean typed shape before it can reach an
//     email renderer, and the square-badge rule is enforced on it;
//   - nothing here decides who receives anything.
// ─────────────────────────────────────────────────────────────

import { coerceArtworkRights, type ArtworkRights } from "@/lib/order/artwork-rights";
import type { PartsList, PartsRow, PartsBar } from "@/lib/order/parts-list";
import { nonSquareBadgeRows, SCHOOL_BADGES_ARE_SQUARE, SQUARE_RULE_MESSAGE } from "@/lib/order/square-badges";
import type { TileSpan } from "@/lib/types";
import { SCHOOL_SHIPPING_VARIANT, SCHOOL_VARIANTS, type SchoolVariantId } from "@/data/school-variants";
import { resolveSchoolKit } from "@/data/school-resolve";
import type { SchoolKit } from "@/data/school-kits";
import { SITE_URL } from "@/config/season";
import { saveSchoolDesign, type DesignContact, type SavedDesignRef } from "./store";

const DATA_URL_RE = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/;

// Decoded-byte ceiling per image. A full-frame 300-DPI PNG is a few MB; this
// leaves headroom while refusing anything abusive. The proxy (src/proxy.ts) caps
// the encoded request body first; this is the decoded guard.
const MAX_IMAGE_BYTES = 28 * 1024 * 1024;
/** Uploaded originals a design may carry (a tray of mascots is a handful). */
const MAX_ORIGINALS = 12;

/** Decoded byte size of a base64 payload (no allocation). */
function base64Bytes(b64: string): number {
  const len = b64.length;
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((len * 3) / 4) - pad;
}

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const boolean = (v: unknown): boolean => v === true;

/** A >=1 integer span, so a coerced parts list is always geometrically sane. */
function coerceSpan(v: unknown): TileSpan {
  const s = (v ?? {}) as Record<string, unknown>;
  return {
    cols: Math.max(1, Math.round(num(s.cols, 1))),
    rows: Math.max(1, Math.round(num(s.rows, 1))),
  };
}

function coerceRow(v: unknown): PartsRow {
  const r = (v ?? {}) as Record<string, unknown>;
  return {
    sku: str(r.sku, 80),
    name: str(r.name, 200),
    pieceId: str(r.pieceId, 120),
    color: str(r.color, 40),
    qty: Math.max(0, Math.round(num(r.qty))),
    span: coerceSpan(r.span),
    size: str(r.size, 60),
    dieCut: boolean(r.dieCut),
  };
}

function coerceBar(v: unknown): PartsBar {
  const b = (v ?? {}) as Record<string, unknown>;
  return {
    text: str(b.text, 200),
    fontFamily: str(b.fontFamily, 80),
    row: str(b.row, 20),
    widthUnits: Math.max(0, Math.round(num(b.widthUnits))),
    widthIn: str(b.widthIn, 20),
    heightIn: str(b.heightIn, 20),
    qr: boolean(b.qr),
  };
}

/**
 * Coerce an untrusted body value into a clean PartsList (or null). Every string is
 * bounded and every number is a real finite number, so downstream HTML rendering
 * (partsListHtml) is safe: it escapes strings and interpolates only true numbers.
 * We deliberately keep ONLY the flat-list fields the email renders (a PanelPartsList
 * is a superset, so its extra `panels` are simply dropped).
 */
export function coercePartsList(v: unknown): PartsList | null {
  if (!v || typeof v !== "object") return null;
  const p = v as Record<string, unknown>;
  const rows = Array.isArray(p.rows) ? p.rows.slice(0, 500).map(coerceRow) : [];
  const bars = Array.isArray(p.bars) ? p.bars.slice(0, 50).map(coerceBar) : [];
  const qr = (p.qr ?? {}) as Record<string, unknown>;
  return {
    designName: str(p.designName, 200),
    plateState: str(p.plateState, 40),
    tileSizeInches: num(p.tileSizeInches, 0),
    qr: { enabled: boolean(qr.enabled), url: str(qr.url, 500) },
    rows,
    totalTiles: Math.max(0, Math.round(num(p.totalTiles))),
    totalCells: Math.max(0, Math.round(num(p.totalCells))),
    bars,
  };
}

/** The { id, token } a browser holds for a design it sent before, or null. The
 *  store checks the token; this only refuses shapes that cannot be one. */
function coerceLink(v: unknown): { id: string; token: string } | null {
  if (!v || typeof v !== "object") return null;
  const { id, token } = v as Record<string, unknown>;
  return typeof id === "string" && typeof token === "string" && id.length <= 64 && token.length <= 64
    ? { id, token }
    : null;
}

/** Filesystem-safe attachment base name derived from the design name. */
function safeName(designName: string): string {
  const s = designName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return s ? `${s}-print` : "myschoolframe-print";
}

/** A submission that passed every check. */
export interface Submission {
  /** The order name for the team: "[school-slug] Design name". */
  name: string;
  schoolSlug: string | null;
  kit: SchoolKit | undefined;
  variant: SchoolVariantId;
  parts: PartsList | null;
  overview: { name: string; dataUrl: string };
  panels: { name: string; dataUrl: string }[];
  originals: { fullResId: string; dataUrl: string }[];
  artUploaded: boolean;
  artworkRights: ArtworkRights | null;
  /** The editable design, or null from a builder too old to send it. */
  design: object | null;
  link: { id: string; token: string } | null;
}

export type SubmissionCheck = { ok: true; value: Submission } | { ok: false; status: number; body: Record<string, unknown> };

const refuse = (status: number, error: string, extra: Record<string, unknown> = {}): SubmissionCheck => ({
  ok: false,
  status,
  body: { ok: false, error, ...extra },
});

/** Check a builder's body. Contact is the SEND route's business, not this one's. */
export function checkSubmission(body: unknown): SubmissionCheck {
  const b = (body ?? {}) as Record<string, unknown>;

  // ── The print image (type + size). ──
  if (typeof b.printPng !== "string" || !DATA_URL_RE.test(b.printPng)) {
    return refuse(400, "A valid print image (PNG/JPEG) is required.");
  }
  if (base64Bytes(b.printPng.slice(b.printPng.indexOf(",") + 1)) > MAX_IMAGE_BYTES) {
    return refuse(413, "Print image is too large.");
  }

  // ── The design name, and the school it is for. The slug is folded into the
  //    order name so the team email says WHICH school's fundraiser it belongs to. ──
  if (typeof b.designName !== "string" || b.designName.length > 200) {
    return refuse(400, "Invalid design name.");
  }
  const schoolSlug = typeof b.school === "string" && /^[a-z0-9-]{1,60}$/.test(b.school) ? b.school : null;
  const name = `${schoolSlug ? `[${schoolSlug}] ` : ""}${b.designName.trim() || "Untitled"}`;

  // ── THE SQUARE RULE. The builder cannot seat a non-square badge, so a parts list
  //    carrying one came from a builder older than the rule or from somewhere else. ──
  const parts = coercePartsList(b.partsList);
  if (parts && SCHOOL_BADGES_ARE_SQUARE) {
    const bad = nonSquareBadgeRows(parts.rows);
    if (bad.length > 0) return refuse(400, SQUARE_RULE_MESSAGE, { nonSquare: bad.slice(0, 12) });
  }

  // ── The separately printed panels. Malformed ones are dropped so the overview
  //    still sends; an oversized one is refused. ──
  const panels: { name: string; dataUrl: string }[] = [];
  if (Array.isArray(b.panels)) {
    for (const p of b.panels.slice(0, 8)) {
      const rec = (p ?? {}) as Record<string, unknown>;
      const url = rec.dataUrl;
      if (typeof url !== "string" || !DATA_URL_RE.test(url)) continue;
      if (base64Bytes(url.slice(url.indexOf(",") + 1)) > MAX_IMAGE_BYTES) {
        return refuse(413, "A panel image is too large.");
      }
      const label = str(rec.name, 40).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      panels.push({ name: `${safeName(name)}-${label || `panel-${panels.length + 1}`}`, dataUrl: url });
    }
  }

  // ── Uploaded photos' print originals, so the design survives on another
  //    device. The store keeps only those the design itself references. ──
  const originals: { fullResId: string; dataUrl: string }[] = [];
  if (Array.isArray(b.originals)) {
    for (const o of b.originals.slice(0, MAX_ORIGINALS)) {
      const rec = (o ?? {}) as Record<string, unknown>;
      if (typeof rec.fullResId !== "string" || typeof rec.dataUrl !== "string" || !DATA_URL_RE.test(rec.dataUrl)) continue;
      if (base64Bytes(rec.dataUrl.slice(rec.dataUrl.indexOf(",") + 1)) > MAX_IMAGE_BYTES) {
        return refuse(413, "An uploaded photo is too large.");
      }
      originals.push({ fullResId: rec.fullResId, dataUrl: rec.dataUrl });
    }
  }

  const variant: SchoolVariantId =
    typeof b.variant === "string" && b.variant in SCHOOL_VARIANTS ? (b.variant as SchoolVariantId) : SCHOOL_SHIPPING_VARIANT;

  return {
    ok: true,
    value: {
      name,
      schoolSlug,
      kit: schoolSlug ? resolveSchoolKit(schoolSlug) : undefined,
      variant,
      parts,
      overview: { name: `${safeName(name)}-OVERVIEW`, dataUrl: b.printPng },
      panels,
      originals,
      artUploaded: b.artUploaded === true,
      artworkRights: coerceArtworkRights(b.artworkRights),
      design: b.design && typeof b.design === "object" ? (b.design as object) : null,
      link: coerceLink(b.link),
    },
  };
}

/** What the builder is told about the save: enough to reopen and to buy. */
export interface SavedOut {
  id: string;
  token: string;
  code: string;
  revision: number;
  /** The parent's link, or null (lab frame / no school: nowhere to reopen it). */
  url: string | null;
}

/**
 * Save a checked submission as a revision. Null when there was no design to save
 * or storage failed — the caller reports that honestly.
 */
export async function saveSubmission(
  s: Submission,
  contact: DesignContact | null,
): Promise<{ ref: SavedDesignRef; out: SavedOut } | null> {
  if (!s.design) return null;
  const ref = await saveSchoolDesign({
    link: s.link,
    school: s.schoolSlug,
    contact,
    revision: {
      design: s.design,
      parts: s.parts,
      proof: s.overview,
      panels: s.panels,
      originals: s.originals,
      artworkRights: s.artworkRights,
      variant: s.variant,
      createdBy: "parent",
    },
  });
  if (!ref) return null;
  return { ref, out: { id: ref.id, token: ref.token, code: ref.code, revision: ref.revision, url: designLink(s, ref.token) } };
}

/**
 * The parent's link. It reopens on /s/<slug>, which serves the SHIPPING frame, so
 * a design drawn on a lab fork gets none: opening it would lay it on a frame it
 * was never drawn against.
 *
 * The origin is SERVER-fixed — never the request's, or anyone could mint a
 * MySchoolFrame email pointing anywhere. And it is MySchoolFrame's own: the
 * SITE_URL env var is NOT read, because production still sets it to the holiday
 * domain (checked 2026-09-25), and a parent's link naming the other brand is the
 * mix-up the MSF sender exists to prevent. MSF_SITE_URL overrides for a local run.
 */
function designLink(s: Submission, token: string): string | null {
  if (!s.kit || s.variant !== SCHOOL_SHIPPING_VARIANT) return null;
  const origin = (process.env.MSF_SITE_URL || SITE_URL).replace(/\/$/, "");
  return `${origin}/s/${s.kit.slug}#d=${token}`;
}
