import { describe, it, expect } from "vitest";
import {
  decodeRaster,
  decodeVector,
  finishCandidate,
  prepareCandidate,
  BADGE_REQUIREMENT,
  MAX_SOURCE_PIXELS,
  VECTOR_SHORT_SIDE_PX,
} from "./prepare-artwork.server";
import { MAX_DECODE_PIXELS, PREVIEW_MAX_PX } from "./raster-safety";
import { MIN_BADGE_PIXELS } from "./rank-candidates";
import { parseSchoolPage } from "./index";
import { EDLIO_PAGE } from "./__fixtures__/edlio-page";
import type { LogoCandidate } from "./types";
import type { Pixels } from "@/lib/utils/artwork-qc";

// The INLINE-SVG path takes no network at all — the markup arrived with the page —
// which is what makes the most dangerous code in this feature testable in a sandbox
// where every CONNECT is answered "403". These are real @napi-rs/canvas renders, not
// mocks: the whole point of the black-blob finding is that it only shows up when
// something actually rasterises.

const candidate = (over: Partial<LogoCandidate> = {}): LogoCandidate => ({
  url: "",
  kind: "inline-svg",
  source: "inline-svg",
  score: 50,
  risks: [],
  offset: 0,
  ...over,
});

/** A crest that paints itself with PRESENTATION ATTRIBUTES — the form that survives. */
const SAFE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">' +
  '<rect x="0" y="0" width="200" height="200" fill="#C8102E"/>' +
  '<circle cx="100" cy="100" r="60" fill="#FFD100"/>' +
  "</svg>";

/**
 * The DEFAULT ADOBE ILLUSTRATOR EXPORT: fills in an internal stylesheet, shapes
 * painted by class. Measured against @napi-rs/canvas 1.0.1 this rasterises to
 * meanRGB [0,0,0] — a correctly-sized, correctly-shaped, fully-opaque black blob
 * where the crest should be, and it passes every check in artwork-qc.
 */
const ILLUSTRATOR_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">' +
  "<style>.st0{fill:#C8102E;} .st1{fill:#FFD100;}</style>" +
  '<rect class="st0" x="0" y="0" width="200" height="200"/>' +
  '<circle class="st1" cx="100" cy="100" r="60"/>' +
  "</svg>";

describe("the black-blob defence, both halves (constraint 1)", () => {
  it("refuses the Illustrator export at SOURCE level, before anything renders", () => {
    // Source-level refusal, not a score penalty. A penalised-but-present candidate
    // still wins on a page where it is the only candidate — which is precisely the
    // page a small school has.
    return prepareCandidate(candidate({ svgSource: ILLUSTRATOR_SVG })).then((r) => {
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error("expected a refusal");
      expect(r.rejected.reason).toBe("svg-render-risk");
      expect(r.rejected.detail).toMatch(/internal-stylesheet/);
      expect(r.rejected.detail).toMatch(/class-styled/);
    });
  });

  it("CONFIRMS the measurement: that same SVG really does render flat black", async () => {
    // If this ever stops being true the source-level gate becomes over-strict and
    // this test is where we would find out — which is why the measurement is
    // asserted rather than only quoted in a comment.
    const decoded = await decodeVector(ILLUSTRATOR_SVG);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    const { data } = decoded.px;
    let n = 0;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 250) continue;
      n++;
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    expect(n).toBeGreaterThan(0);
    expect(sum / n).toBeLessThan(10); // the measured value was exactly 0
  });

  it("catches a black blob at PIXEL level if the source scan is bypassed", async () => {
    // The second gate, reached by handing `finishCandidate` the raster directly.
    // It accuses only because the SOURCE declared #C8102E and the pixels have none
    // of it — pixels alone cannot tell a dropped fill from a black logo.
    const decoded = await decodeVector(ILLUSTRATOR_SVG);
    if (!decoded.ok) throw new Error("decode failed");
    const r = finishCandidate(candidate(), decoded.px, {
      isVector: true,
      source: ILLUSTRATOR_SVG,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.rejected.reason).toBe("black-blob");
    expect(r.rejected.detail).toMatch(/#C8102E/);
  });

  it("does NOT accuse a mark that is genuinely black", async () => {
    // Plenty of school marks really are a solid black seal. The check must not eat
    // them, which is why it needs the source and not just the pixels.
    const blackMark =
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
      '<circle cx="100" cy="100" r="80" fill="#000000"/></svg>';
    const r = await prepareCandidate(candidate({ svgSource: blackMark }));
    expect(r.ok).toBe(true);
  });

  it("passes a crest that uses presentation attributes, and keeps its colours", async () => {
    const r = await prepareCandidate(candidate({ svgSource: SAFE_SVG }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.candidate.usable).toBe(true);
    expect(r.candidate.fullRes.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });
});

describe("vector rasterisation size", () => {
  it("renders the SHORT side past the badge floor, on a square AND on a wide bar", async () => {
    // Scaling by the LONG side is the obvious version and it is wrong: a 6:1
    // wordmark scaled to 600 long has a 100px short side, which our own resolution
    // gate then refuses — the exact dead end constraint 5 exists to prevent.
    const square = await decodeVector(SAFE_SVG);
    const bar = await decodeVector(
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="100"><rect width="600" height="100" fill="#0B1B3A"/></svg>',
    );
    for (const d of [square, bar]) {
      expect(d.ok).toBe(true);
      if (!d.ok) continue;
      expect(Math.min(d.px.width, d.px.height)).toBeGreaterThanOrEqual(VECTOR_SHORT_SIDE_PX);
      expect(Math.min(d.px.width, d.px.height)).toBeGreaterThan(MIN_BADGE_PIXELS);
      expect(d.px.width * d.px.height).toBeLessThanOrEqual(MAX_DECODE_PIXELS);
    }
  });

  it("never renders a vector smaller than it declares itself", async () => {
    const big = await decodeVector(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1500"><rect width="1500" height="1500" fill="#C8102E"/></svg>',
    );
    expect(big.ok).toBe(true);
    if (!big.ok) return;
    expect(big.px.width).toBe(1500);
  });

  it("says so when an SVG has no intrinsic size, instead of blaming the artwork", async () => {
    // A sizeless SVG renders at 0x0 rather than failing, and a 0x0 raster reads
    // downstream as `near-empty` — which points the user at the wrong problem.
    const r = await decodeVector('<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#f00"/></svg>');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(["no-intrinsic-size", "decode-failed"]).toContain(r.reason);
  });
});

describe("decodeRaster — the refusals all happen before a decoder is touched", () => {
  const bytes = (...v: number[]) => Uint8Array.from(v);

  it("refuses ICO and TIFF, the two formats that exit the process with SIGSEGV", async () => {
    const ico = bytes(0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x20, 0x20, 0, 0, 0, 0, 0, 0, 0, 0);
    const tiff = bytes(0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    for (const b of [ico, tiff]) {
      const r = await decodeRaster(b, "image/png"); // lying content-type, ignored
      expect(r.ok).toBe(false);
      if (r.ok) continue;
      expect(r.reason).toBe("undecodable-format");
      expect(r.detail).toMatch(/SIGSEGV/);
    }
  });

  it("refuses a header it cannot read rather than decoding blind", async () => {
    // Unknown size means the allocation cannot be bounded, and an unbounded
    // allocation is the +480 MB failure this path exists to prevent.
    const truncatedPng = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    const r = await decodeRaster(truncatedPng);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(["unreadable-header", "decode-failed"]).toContain(r.reason);
  });

  it("refuses a header that declares more pixels than the decoder could survive", async () => {
    // The header is read first precisely so this refusal costs 24 bytes rather than
    // the 1.6 GB `loadImage` would spend expanding a 20000x20000 frame.
    const b = new Uint8Array(32);
    b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    b.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8);
    b.set([0, 0, 0x4e, 0x20], 16); // 20000
    b.set([0, 0, 0x4e, 0x20], 20); // 20000
    const r = await decodeRaster(b);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("too-large");
    expect(20000 * 20000).toBeGreaterThan(MAX_SOURCE_PIXELS);
  });
});

/**
 * A properly cut mark: an opaque crest on a TRANSPARENT field.
 *
 * Not a flat fill of the whole frame, which was the first version of this fixture
 * and quietly broke every assertion built on it: a fully-opaque image trips
 * `background-opaque`, `repairArtwork` then flood-fills the "background" away, and
 * since a flat fill is ALL background the repaired image comes back empty and
 * `near-empty` fires as an error. The fixture has to look like real cut-out art or
 * it tests the repair path instead of the thing under test.
 */
const mark = (w: number, h: number): Pixels => {
  const data = new Uint8ClampedArray(w * h * 4);
  const x0 = Math.floor(w * 0.15);
  const x1 = Math.ceil(w * 0.85);
  const y0 = Math.floor(h * 0.15);
  const y1 = Math.ceil(h * 0.85);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < x0 || x >= x1 || y < y0 || y >= y1) continue;
      const i = (y * w + x) * 4;
      // Two colours so the art has internal structure — a single flat colour would
      // also look like a black blob to `rasterSanity` if it were dark.
      const stripe = ((x + y) >> 4) & 1;
      data[i] = stripe ? 200 : 255;
      data[i + 1] = stripe ? 16 : 209;
      data[i + 2] = stripe ? 46 : 0;
      data[i + 3] = 255;
    }
  }
  return { data, width: w, height: h };
};

describe("full-res vs preview (constraint 4)", () => {
  it("returns the full-res at its decoded size and the preview capped at 1200px", () => {
    const r = finishCandidate(candidate({ kind: "raster", url: "https://x/logo.png" }), mark(2000, 1600), {
      isVector: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // The full-res is untouched. This is the field that goes to putFullRes and the
    // print sheet; handing it the preview is the bug that is invisible on every
    // screen and only shows up on the printed part.
    expect(r.candidate.fullRes.width).toBe(2000);
    expect(r.candidate.fullRes.height).toBe(1600);
    expect(Math.max(r.candidate.preview.width, r.candidate.preview.height)).toBe(PREVIEW_MAX_PX);
    expect(r.candidate.preview.width).toBeLessThan(r.candidate.fullRes.width);
    // And they are genuinely different images, not the same bytes relabelled.
    expect(r.candidate.preview.dataUrl).not.toBe(r.candidate.fullRes.dataUrl);
  });

  it("leaves preview === full-res when the art is already small", () => {
    const r = finishCandidate(candidate({ kind: "raster" }), mark(500, 500), { isVector: false });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.candidate.preview.dataUrl).toBe(r.candidate.fullRes.dataUrl);
  });
});

describe("the resolution gate (constraint 5)", () => {
  it("marks a typical 200px school header logo UNUSABLE, because it is", () => {
    // ~100 DPI on a 2" badge. This is the most common real input and the reason the
    // empty state is the most likely outcome rather than the sad path.
    const r = finishCandidate(candidate({ kind: "raster" }), mark(200, 200), { isVector: false });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.candidate.usable).toBe(false);
    expect(r.candidate.resolution.blocked).toBe(true);
    expect(r.candidate.qc.findings.some((f) => f.code === "resolution-low")).toBe(true);
  });

  it("agrees with artwork-qc at the boundary, so there is no dead end between them", () => {
    // The two used to disagree (150 here, 200 there) and the gap was a state the
    // user could walk into and not walk out of: this module called a 300px logo
    // usable, the picker offered it, the crop modal refused it, and there was no
    // third screen. `MIN_DPI` is now literally `BLOCK_DPI`; both are consulted.
    const under = finishCandidate(candidate(), mark(MIN_BADGE_PIXELS - 8, MIN_BADGE_PIXELS - 8), {
      isVector: false,
    });
    const over = finishCandidate(candidate(), mark(MIN_BADGE_PIXELS + 8, MIN_BADGE_PIXELS + 8), {
      isVector: false,
    });
    expect(under.ok && under.candidate.usable).toBe(false);
    expect(over.ok && over.candidate.usable).toBe(true);
    if (under.ok) expect(under.candidate.resolution.blocked).toBe(true);
    if (over.ok) expect(over.candidate.resolution.blocked).toBe(false);
  });

  it("never blocks vector art, which has no pixels to be short of", () => {
    const r = finishCandidate(candidate(), mark(120, 120), { isVector: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.candidate.resolution.blocked).toBe(false);
    expect(r.candidate.resolution.message).toMatch(/Vector/);
  });

  it("judges against the 2x2 badge footprint the builder actually enforces", () => {
    // `sectionSupportsTiles` forces 2x2 as the floor — a 1x1 badge does not exist —
    // so judging against anything smaller would pass art the builder then refuses.
    expect(BADGE_REQUIREMENT.span).toEqual({ cols: 2, rows: 2 });
    expect(BADGE_REQUIREMENT.tileSizeInches).toBe(0.991);
  });
});

describe("QC repairs are reported and re-measured", () => {
  it("cuts a baked-in background and says what it did", () => {
    // A flat opaque field with a mark in the middle: `background-opaque` fires,
    // `repairArtwork` cuts it, and the re-analysis is what the response reports —
    // a report taken BEFORE the repair is stale about the thing the repair touched.
    const w = 500;
    const h = 500;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const inMark = x > 150 && x < 350 && y > 150 && y < 350;
        data[i] = inMark ? 200 : 255;
        data[i + 1] = inMark ? 16 : 255;
        data[i + 2] = inMark ? 46 : 255;
        data[i + 3] = 255;
      }
    }
    const r = finishCandidate(candidate({ kind: "raster" }), { data, width: w, height: h }, {
      isVector: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.candidate.qc.repairs.length).toBeGreaterThan(0);
    expect(r.candidate.qc.repairs.join(" ")).toMatch(/background/i);
    // The finding is gone from the RE-analysis, which is the point of re-measuring.
    expect(r.candidate.qc.findings.some((f) => f.code === "background-opaque")).toBe(false);
  });
});

describe("the crashing format is genuinely reachable from ranking", () => {
  it("a real fixture ranks /favicon.ico as a candidate this route would fetch", async () => {
    // This is the join between the pure ranker and the guard, and it is why the
    // allowlist is not defensive programming. `collectLogoCandidates` deliberately
    // keeps favicons — an apple-touch-icon is often 180px and occasionally 512px, and
    // "too small to print" is more useful to the user than a page that looks like it
    // has no logo. The consequence is that `/favicon.ico` reaches the fetch loop on a
    // completely ordinary school page, and ICO is one of the two formats measured to
    // exit the process with SIGSEGV. Without the sniffer, this candidate takes the
    // container down and every concurrent request with it.
    const profile = parseSchoolPage(EDLIO_PAGE, "https://lincolnhigh.org/");
    const ico = profile.logos.find((l) => l.url.endsWith("/favicon.ico"));
    expect(ico, "the fixture should still rank a .ico candidate").toBeDefined();

    // And the bytes that candidate would return are refused before any decoder runs.
    const icoBytes = new Uint8Array(32);
    icoBytes.set([0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x20, 0x20], 0);
    const r = await decodeRaster(icoBytes, "image/x-icon");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.detail).toMatch(/SIGSEGV/);
  });
});

describe("prepareCandidate refuses malformed inline candidates without fetching", () => {
  it("rejects an inline SVG with no source attached", async () => {
    const r = await prepareCandidate(candidate({ svgSource: undefined }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.rejected.reason).toBe("no-source");
  });

  it("rejects an inline SVG that sets type with <text>", async () => {
    // <text> needs the school's licensed face installed on the render host. It is
    // not, so the mark comes out substituted at the wrong width — or not at all.
    const r = await prepareCandidate(
      candidate({
        svgSource:
          '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100"><text x="10" y="50" fill="#C8102E">Lincoln High</text></svg>',
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.rejected.reason).toBe("svg-render-risk");
    expect(r.rejected.detail).toMatch(/text-element/);
  });
});
