// ─────────────────────────────────────────────────────────────────────────────
// POST /api/school/brand-asset — "paste the image link itself"
//
// The companion to `brand-scan`, and the answer to its one unfixable blind spot.
//
// `brand-scan` reads a PAGE: markup, then linked stylesheets, then a second hop to
// the athletics/brand pages. That reaches a lot, but it cannot reach a logo the CMS
// injects with JavaScript, and there is no amount of parsing that will — it would
// need a headless browser rendering somebody else's site, per scan.
//
// A human, meanwhile, finds that same file in about ten seconds: right-click the
// crest, Copy image address. On the real site this was root-caused against, the
// owner did exactly that while the scanner was still returning staff photos. This
// route exists so that ten seconds is the whole fix.
//
// It is deliberately THIN. Every safety property and every quality judgement is
// already implemented next door and is reused verbatim rather than restated:
//   - `checkUrlShape` / `assertPublicUrl` / `fetchGuarded`  → SSRF, redirects, size
//   - `prepareCandidate`                                    → magic-byte allowlist,
//     the 4 MP decode cap, SVG black-blob refusal, artwork-qc, repair, full-res +
//     preview packaging
//   - `upgradeCandidateUrl`                                 → the Cloudinary/CMS
//     resizer strip, so pasting the 512px variant still yields the original
//
// Which means the pasted-link path inherits, for free, the two failures that were
// reproduced the hard way: a TIFF served from a `.png` URL cannot reach the decoder,
// and an Illustrator SVG cannot ship as a black silhouette.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

import { describeOutcome, type OutcomeCopy, type PageOutcome } from "@/lib/school-brand";
import { assertPublicUrl, checkUrlShape } from "@/lib/school-brand/guard.server";
import { upgradeCandidateUrl } from "@/lib/school-brand/rank-candidates";
import {
  prepareCandidate,
  type RejectedCandidate,
  type ScanCandidate,
} from "@/lib/school-brand/prepare-artwork.server";
import type { LogoCandidate } from "@/lib/school-brand/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export type BrandAssetResponse =
  | { ok: true; candidate: ScanCandidate; upgraded: boolean }
  /** Fetched and refused — too small, undecodable, a black-blob SVG. The user gets
   *  the real reason, because unlike a page scan they chose this exact file. */
  | { ok: false; rejected: RejectedCandidate }
  | { ok: false; outcome: PageOutcome; copy: OutcomeCopy };

/** Build the minimal candidate `prepareCandidate` needs from a bare URL. */
function candidateFor(url: string): LogoCandidate {
  return {
    url,
    // Kind from the EXTENSION only, which is a guess — `prepareCandidate` sniffs the
    // actual bytes and refuses a mismatch. A CMS serving a PNG from a `.svg` path is
    // exactly the case the sniffer exists for.
    kind: /\.svg(\?|#|$)/i.test(url) ? "svg-file" : "raster",
    source: "pasted-link",
    score: 0,
    risks: [],
    offset: -1,
  } as LogoCandidate;
}

export async function POST(req: Request) {
  let url: string;
  try {
    const body = (await req.json()) as { url?: unknown };
    url = typeof body.url === "string" ? body.url.trim() : "";
  } catch {
    return NextResponse.json<BrandAssetResponse>(
      { ok: false, outcome: { kind: "unreachable" }, copy: describeOutcome({ kind: "unreachable" }) },
      { status: 400 },
    );
  }

  const shape = checkUrlShape(url);
  if (!shape.ok) {
    const outcome: PageOutcome = { kind: "unreachable" };
    return NextResponse.json<BrandAssetResponse>(
      { ok: false, outcome, copy: describeOutcome(outcome) },
      { status: 400 },
    );
  }

  try {
    await assertPublicUrl(shape.url.toString());
  } catch {
    // The ONE opaque message, same as the page scan and for the same reason: a host
    // that resolves to 10.0.0.5 must not read differently from one that does not
    // resolve at all, or this endpoint becomes an internal-network scanner.
    const outcome: PageOutcome = { kind: "unreachable" };
    return NextResponse.json<BrandAssetResponse>(
      { ok: false, outcome, copy: describeOutcome(outcome) },
      { status: 200 },
    );
  }

  const asked = shape.url.toString();

  // TRY THE ORIGINAL FIRST, exactly as with a scanned candidate. A pasted link is
  // usually the resized variant the page displayed — the URL the owner copied off a
  // real site carried `f_auto,q_auto,t_image_size_2` and served 512px — so strip the
  // transform and prefer the bigger answer, falling back when the guess 404s.
  const upgrade = upgradeCandidateUrl(asked);
  if (upgrade) {
    try {
      const better = await prepareCandidate(candidateFor(upgrade));
      if (better.ok && better.candidate.usable) {
        return NextResponse.json<BrandAssetResponse>(
          { ok: true, candidate: better.candidate, upgraded: true },
          { status: 200 },
        );
      }
    } catch {
      // A stripped URL that does not exist is the expected failure of a guess.
    }
  }

  let result;
  try {
    result = await prepareCandidate(candidateFor(asked));
  } catch (err) {
    return NextResponse.json<BrandAssetResponse>(
      {
        ok: false,
        rejected: {
          url: asked,
          kind: "raster",
          reason: "unexpected",
          detail: err instanceof Error ? err.message : "Preparing this image failed.",
        },
      },
      { status: 200 },
    );
  }

  if (!result.ok) {
    return NextResponse.json<BrandAssetResponse>(
      { ok: false, rejected: result.rejected },
      { status: 200 },
    );
  }

  return NextResponse.json<BrandAssetResponse>(
    { ok: true, candidate: result.candidate, upgraded: false },
    { status: 200 },
  );
}
