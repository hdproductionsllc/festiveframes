// ─────────────────────────────────────────────────────────────
// POST /api/school/submit — the SCHOOL builder's whole order path.
//
// "Design done" → an ORDER by EMAIL. No payment (owner: no payment flow needed).
// The client renders the assembled frame to a print-ready PNG (composeSchoolFrame)
// and POSTs { printPng, designName, partsList? }. This handler emails the print
// file + a parts summary to a SERVER-FIXED production inbox (MSF_ORDER_EMAIL,
// default bill@myschoolframe.com — lib/email-msf) via the existing Resend stack.
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
//
// SAVE FIRST, EMAIL SECOND (2026-09-25). Every send now also stores a revision of
// the design (lib/school-designs) and answers with its code and the parent's
// link, so the design can be reopened on any device and Bill's email names the
// exact frozen revision. A failed save never blocks the email — the team still
// gets the design, and the answer says there is no link — and a failed email
// never loses the save. Both outcomes are reported, never assumed.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { sendSchoolOrderEmail } from "@/lib/email-production";
import { artworkRightsLine, coerceArtworkRights } from "@/lib/order/artwork-rights";
import { CONTACT_PROBLEM_COPY, coerceOrderContact, orderContactLine } from "@/lib/order/order-contact";
import type { PartsList, PartsRow, PartsBar } from "@/lib/order/parts-list";
import { nonSquareBadgeRows, SCHOOL_BADGES_ARE_SQUARE, SQUARE_RULE_MESSAGE } from "@/lib/order/square-badges";
import type { TileSpan } from "@/lib/types";
import { saveSchoolDesign, type SavedDesignRef } from "@/lib/school-designs/store";
import { sendDesignLinkEmail } from "@/lib/email-production";
import { SCHOOL_SHIPPING_VARIANT, SCHOOL_VARIANTS, type SchoolVariantId } from "@/data/school-variants";
import { resolveSchoolKit } from "@/data/school-resolve";
import { SITE_URL } from "@/config/season";

export const runtime = "nodejs";

const DATA_URL_RE = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/;

// Decoded-byte ceiling for the print image. A full-frame 300-DPI PNG is a few MB;
// this leaves generous headroom while rejecting anything abusive. The proxy
// (src/proxy.ts) caps the encoded request body first; this is the decoded guard.
const MAX_PRINT_BYTES = 28 * 1024 * 1024;

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

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const {
    printPng, panels, designName, partsList, school, artUploaded, artworkRights, contact,
    design, link, variant, emailLink,
  } = (body ?? {}) as Record<string, unknown>;

  // ── WHO TO ANSWER. A sent design with no way to reach its sender cannot be
  //    followed up, which is the whole promise of "Send design". Required, and
  //    checked here whatever the send sheet did. The address is text in the email
  //    for a person to reply to — it is never handed to Resend as a recipient. ──
  const who = coerceOrderContact(contact);
  if (!who.ok) {
    return NextResponse.json(
      { ok: false, error: CONTACT_PROBLEM_COPY[who.problem], field: who.problem.split("-")[0] },
      { status: 400 },
    );
  }

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
  let name = designName.trim() || "Untitled";
  const schoolSlug = typeof school === "string" && /^[a-z0-9-]{1,60}$/.test(school) ? school : null;
  // Optional school-kit slug from a /s/<slug> builder. Folded into the order name so
  // the production email says WHICH school's fundraiser this belongs to — that tag is
  // the whole donation-attribution trail until real tracking exists.
  if (schoolSlug) {
    name = `[${schoolSlug}] ${name}`;
  }

  // ── THE SQUARE RULE. The builder cannot seat a non-square badge, so a parts list
  //    carrying one came from a builder older than the rule or from somewhere else.
  //    Refuse it with a message a parent can act on, rather than emailing
  //    production a part that does not fit the frame. ──
  const parts = coercePartsList(partsList);
  if (parts && SCHOOL_BADGES_ARE_SQUARE) {
    const bad = nonSquareBadgeRows(parts.rows);
    if (bad.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: SQUARE_RULE_MESSAGE,
          nonSquare: bad.slice(0, 12),
        },
        { status: 400 },
      );
    }
  }

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
  // ── The artwork's provenance. The builder asks before it submits, so a design
  //    that arrives with uploaded art and no attestation came from somewhere else
  //    — the email says so in as many words rather than staying silent, because an
  //    operator who cannot tell is an operator who prints it. ──
  const artworkNote = artworkRightsLine(artUploaded === true, coerceArtworkRights(artworkRights));

  // Only the formatted `contactNote` rides along, for the production email to
  // print under the design name (see lib/order/order-contact). The parsed address
  // stays here: printed, never a recipient, and never on the email's input.
  const overview = { name: `${safeName(name)}-OVERVIEW`, dataUrl: printPng };

  // ── SAVE FIRST. The revision is stored before anything is emailed, so the code
  //    in Bill's inbox names a design that exists. A builder too old to send its
  //    `design` still emails exactly as before; it just gets no link. ──
  const variantId: SchoolVariantId =
    typeof variant === "string" && variant in SCHOOL_VARIANTS ? (variant as SchoolVariantId) : SCHOOL_SHIPPING_VARIANT;
  const linkIn = coerceLink(link);
  const saved: SavedDesignRef | null =
    design && typeof design === "object"
      ? await saveSchoolDesign({
          link: linkIn,
          school: schoolSlug,
          contact: who.contact,
          revision: {
            design,
            parts,
            proof: overview,
            panels: panelImages,
            artworkRights: coerceArtworkRights(artworkRights),
            variant: variantId,
            createdBy: "parent",
          },
        })
      : null;
  // The parent's link reopens on /s/<slug>, which serves the SHIPPING frame. A
  // design drawn on a lab fork is saved (Bill's email still names it) but gets no
  // parent link: opening it would lay it on a frame it was never drawn against.
  // The origin is SERVER-fixed — never the request's, or anyone could mint a
  // MySchoolFrame email pointing anywhere. And it is MySchoolFrame's own: the
  // SITE_URL env var is NOT read here, because production still sets it to the
  // holiday domain (checked 2026-09-25), and a parent's link reading
  // the holiday brand is the mix-up the MSF sender exists to prevent.
  // MSF_SITE_URL overrides it for a local run only.
  const kit = schoolSlug ? resolveSchoolKit(schoolSlug) : undefined;
  const origin = (process.env.MSF_SITE_URL || SITE_URL).replace(/\/$/, "");
  const url =
    saved && kit && variantId === SCHOOL_SHIPPING_VARIANT ? `${origin}/s/${kit.slug}#d=${saved.token}` : null;
  const savedOut = saved
    ? { id: saved.id, token: saved.token, code: saved.code, revision: saved.revision, url }
    : null;

  const order = {
    designName: name,
    printPng: overview,
    panels: panelImages,
    partsList: parts,
    artworkNote,
    contactNote: orderContactLine(who.contact),
    saved: saved ? { code: saved.code, revision: saved.revision } : null,
  };
  const result = await sendSchoolOrderEmail(order);

  // The parent's own link, ONLY when they asked in this request — the one email
  // that goes to an address a parent typed (lib/email-msf, the exception). Only
  // once the team HAS the design: a failed team send is retried by the parent, and
  // a link mailed on every attempt would land in their inbox twice.
  const linkEmailed =
    result.ok && emailLink === true && url && saved ? await sendDesignLinkEmail({
      to: who.contact.email,
      code: saved.code,
      url,
      schoolName: kit?.schoolName ?? null,
    }) : false;

  if (result.ok) return NextResponse.json({ ok: true, saved: savedOut, linkEmailed }, { status: 200 });

  switch (result.reason) {
    case "email-not-configured":
      // Not an error the client did wrong — the send path just isn't live yet.
      return NextResponse.json({ ok: false, reason: "email-not-configured", saved: savedOut, linkEmailed }, { status: 200 });
    // The failures still hand back what was SAVED, so the browser adopts the link
    // and a retry becomes the next revision of this design, not a second design.
    case "invalid-attachment":
      return NextResponse.json({ ok: false, error: "Could not read the print image.", saved: savedOut }, { status: 400 });
    case "attachment-too-large":
      return NextResponse.json({ ok: false, error: "Print image is too large.", saved: savedOut }, { status: 413 });
    default:
      return NextResponse.json({ ok: false, error: "Could not send your order right now.", saved: savedOut }, { status: 502 });
  }
}
