// ─────────────────────────────────────────────────────────────
// POST /api/school/submit — the SCHOOL builder's whole order path.
//
// "Design done" → an ORDER by EMAIL. No payment (owner: no payment flow needed).
// The client renders the assembled frame to a print-ready PNG (composeSchoolFrame)
// and POSTs { printPng, designName, partsList? }. This handler emails the print
// file + a parts summary to a SERVER-FIXED production inbox (SCHOOL_ORDERS_EMAIL,
// default orders@festiveframes.co) via the existing Resend stack.
//
// Trust boundary: EVERYTHING here is untrusted input.
//   - printPng must be a data:image/(png|jpeg) URL, size-bounded.
//   - designName is a bounded string (escaped downstream in the email HTML).
//   - partsList is COERCED to a clean typed shape before it can reach the email
//     renderer, so its raw numeric interpolation can't be turned into HTML injection.
//   - The recipient is NEVER read from the body — it's fixed server-side.
//
// When RESEND_API_KEY is unset the send no-ops and we answer honestly with
// { ok:false, reason:"email-not-configured" } — never a false "sent".
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { sendSchoolOrderEmail } from "@/lib/email-production";
import type { PartsList, PartsRow, PartsBar } from "@/lib/order/parts-list";
import type { TileSpan } from "@/lib/types";

export const runtime = "nodejs";

const DATA_URL_RE = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/;

// Decoded-byte ceiling for the print image. A full-frame 300-DPI PNG is a few MB;
// this leaves generous headroom while rejecting anything abusive. The proxy
// (src/proxy.ts) caps the encoded request body first; this is the decoded guard.
const MAX_PRINT_BYTES = 18 * 1024 * 1024;

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
function coercePartsList(v: unknown): PartsList | null {
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

/** Filesystem-safe attachment base name derived from the design name. */
function safeName(designName: string): string {
  const s = designName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return s ? `${s}-print` : "school-frame-print";
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const { printPng, panels, designName, partsList } = (body ?? {}) as Record<string, unknown>;

  // ── Validate the print image (type + size). ──
  if (typeof printPng !== "string" || !DATA_URL_RE.test(printPng)) {
    return NextResponse.json({ ok: false, error: "A valid print image (PNG/JPEG) is required." }, { status: 400 });
  }
  const b64 = printPng.slice(printPng.indexOf(",") + 1);
  if (base64Bytes(b64) > MAX_PRINT_BYTES) {
    return NextResponse.json({ ok: false, error: "Print image is too large." }, { status: 413 });
  }

  // ── Validate the design name. ──
  if (typeof designName !== "string" || designName.length > 200) {
    return NextResponse.json({ ok: false, error: "Invalid design name." }, { status: 400 });
  }
  const name = designName.trim() || "Untitled";

  // ── Validate the optional per-panel print files (left/right/top/bottom + a little
  //    slack). Each must be a valid, size-bounded image data URL; anything malformed is
  //    dropped so the assembled overview still sends. ──
  const panelImages: { name: string; dataUrl: string }[] = [];
  if (Array.isArray(panels)) {
    for (const p of panels.slice(0, 8)) {
      const rec = (p ?? {}) as Record<string, unknown>;
      const url = rec.dataUrl;
      if (typeof url !== "string" || !DATA_URL_RE.test(url)) continue;
      if (base64Bytes(url.slice(url.indexOf(",") + 1)) > MAX_PRINT_BYTES) {
        return NextResponse.json({ ok: false, error: "A panel image is too large." }, { status: 413 });
      }
      const label = typeof rec.name === "string" ? rec.name : "";
      panelImages.push({ name: `${safeName(name)}-${str(label, 40).replace(/[^a-z0-9]+/gi, "-").toLowerCase() || `panel-${panelImages.length + 1}`}`, dataUrl: url });
    }
  }

  // ── Send (recipient is server-fixed inside sendSchoolOrderEmail). ──
  const result = await sendSchoolOrderEmail({
    designName: name,
    printPng: { name: `${safeName(name)}-OVERVIEW`, dataUrl: printPng },
    panels: panelImages,
    partsList: coercePartsList(partsList),
  });

  if (result.ok) return NextResponse.json({ ok: true }, { status: 200 });

  switch (result.reason) {
    case "email-not-configured":
      // Not an error the client did wrong — the send path just isn't live yet.
      return NextResponse.json({ ok: false, reason: "email-not-configured" }, { status: 200 });
    case "invalid-attachment":
      return NextResponse.json({ ok: false, error: "Could not read the print image." }, { status: 400 });
    case "attachment-too-large":
      return NextResponse.json({ ok: false, error: "Print image is too large." }, { status: 413 });
    default:
      return NextResponse.json({ ok: false, error: "Could not send your order right now." }, { status: 502 });
  }
}
