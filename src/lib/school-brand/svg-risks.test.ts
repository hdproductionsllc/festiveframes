import { describe, it, expect } from "vitest";
import type { Pixels } from "@/lib/utils/artwork-qc";
import { analyzeArtwork, isUsable } from "@/lib/utils/artwork-qc";
import {
  declaredFillColors,
  isSvgSafeToRaster,
  rasterSanity,
  SVG_RISK_COPY,
  svgRenderRisks,
} from "./svg-risks";
import { ILLUSTRATOR_SVG_PAGE, SAFE_INLINE_SVG } from "./__fixtures__/illustrator-svg-page";

/** The Illustrator export, lifted out of the fixture page. */
const ILLUSTRATOR_SVG = ILLUSTRATOR_SVG_PAGE.slice(
  ILLUSTRATOR_SVG_PAGE.indexOf("<svg"),
  ILLUSTRATOR_SVG_PAGE.indexOf("</svg>") + 6,
);

/** A disc of flat colour on transparency, with an anti-aliased edge. */
function disc(
  size: number,
  rgb: [number, number, number],
): Pixels {
  const data = new Uint8ClampedArray(size * size * 4);
  const r = size / 2 - 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - size / 2, y - size / 2);
      const a = d <= r ? 255 : d <= r + 1 ? Math.round(255 * (r + 1 - d)) : 0;
      const i = (y * size + x) * 4;
      if (a === 0) continue;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = a;
    }
  }
  return { data, width: size, height: size };
}

describe("svgRenderRisks — the Illustrator black-blob idiom", () => {
  it("flags the default Illustrator export on both of its tells", () => {
    const risks = svgRenderRisks(ILLUSTRATOR_SVG);
    expect(risks).toContain("internal-stylesheet");
    expect(risks).toContain("class-styled");
  });

  it("flags every construct the brief names", () => {
    expect(svgRenderRisks(`<svg><style>.a{fill:red}</style></svg>`)).toContain("internal-stylesheet");
    expect(svgRenderRisks(`<svg><path class="st0"/></svg>`)).toContain("class-styled");
    expect(svgRenderRisks(`<svg><path fill="currentColor"/></svg>`)).toContain("current-color");
    expect(svgRenderRisks(`<svg><use href="#crest"/></svg>`)).toContain("use-reference");
    expect(svgRenderRisks(`<svg><text x="0">LHS</text></svg>`)).toContain("text-element");
    expect(svgRenderRisks(`<svg><image href="/crest.png"/></svg>`)).toContain("embedded-image");
    expect(svgRenderRisks(`<svg><image xlink:href="/crest.png"/></svg>`)).toContain("embedded-image");
  });

  it("passes the export that actually survives a headless render", () => {
    // If everything were flagged, "safe" would be indistinguishable from "we do not
    // support SVG" — and SVG is the one format with no resolution floor at all.
    expect(svgRenderRisks(SAFE_INLINE_SVG)).toEqual([]);
    expect(isSvgSafeToRaster(SAFE_INLINE_SVG)).toBe(true);
  });

  it("has copy for every code it can emit", () => {
    const emitted = new Set<string>();
    for (const src of [
      ILLUSTRATOR_SVG,
      `<svg><path fill="currentColor"/></svg>`,
      `<svg><use href="#a"/></svg>`,
      `<svg><text>a</text></svg>`,
      `<svg><image href="/a.png"/></svg>`,
      `<svg><foreignObject></foreignObject></svg>`,
      `<svg><script>1</script></svg>`,
    ]) {
      for (const r of svgRenderRisks(src)) emitted.add(r);
    }
    for (const code of emitted) {
      expect(SVG_RISK_COPY[code as keyof typeof SVG_RISK_COPY]).toBeTruthy();
    }
  });
});

describe("declaredFillColors", () => {
  it("reads colours out of the internal stylesheet, not only the attributes", () => {
    expect(declaredFillColors(ILLUSTRATOR_SVG)).toEqual(
      expect.arrayContaining(["#C8102E", "#FFFFFF", "#F2A900"]),
    );
  });

  it("expands the three-digit form so #FFF and #FFFFFF are one colour", () => {
    expect(declaredFillColors(`<svg><path fill="#f2a"/></svg>`)).toEqual(["#FF22AA"]);
  });
});

describe("rasterSanity — the backstop for what the source scan misses", () => {
  it("shows why the backstop is needed: QC calls the black blob perfect", () => {
    // The measured failure, reproduced as pixels: the crest renders as a flat black
    // silhouette. Everything artwork-qc knows how to check is satisfied by it.
    // Rendered at 600px so resolution is comfortably green (302 DPI on a 1.982"
    // badge) and blackness is the ONLY thing left for QC to object to. It doesn't.
    const blob = disc(600, [0, 0, 0]);
    const report = analyzeArtwork(blob, {
      span: { cols: 2, rows: 2 },
      tileSizeInches: 0.991,
      dpi: 300,
    });
    expect(isUsable(report)).toBe(true);
    expect(report.findings.filter((f) => f.severity === "error")).toEqual([]);

    // And here is the check that does catch it, because it also reads the source.
    const verdict = rasterSanity(blob, { source: ILLUSTRATOR_SVG });
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toBe("black-blob");
    expect(verdict.message).toContain("#C8102E");
  });

  it("accepts the same SVG when its colours actually made it into the pixels", () => {
    const red = disc(240, [200, 16, 46]);
    expect(rasterSanity(red, { source: ILLUSTRATOR_SVG }).ok).toBe(true);
  });

  it("does NOT accuse a school whose mark really is black", () => {
    // The false positive that makes a pixel-only check unusable: a black wordmark
    // and a dropped-fill silhouette are pixel-identical. The source is the tiebreak —
    // this file only ever asked for black, so black is the right answer.
    const blackWordmark = `<svg><path d="M0 0h10v10H0z" fill="#000000"/></svg>`;
    const verdict = rasterSanity(disc(240, [0, 0, 0]), { source: blackWordmark });
    expect(verdict.ok).toBe(true);
    expect(verdict.message).toContain("black mark");
  });

  it("declines to judge when it was given no source", () => {
    const verdict = rasterSanity(disc(240, [0, 0, 0]));
    expect(verdict.ok).toBe(true);
    expect(verdict.meanRGB?.[0]).toBeLessThan(10);
  });

  it("ignores an almost-empty raster, which is near-empty's job not ours", () => {
    const data = new Uint8ClampedArray(100 * 100 * 4);
    data[3] = 255; // one opaque black pixel in 10,000
    const verdict = rasterSanity({ data, width: 100, height: 100 }, { source: ILLUSTRATOR_SVG });
    expect(verdict.ok).toBe(true);
  });

  it("never reads RGB out of fully transparent pixels", () => {
    // Transparent RGB is undefined; reading it is how a bogus 49/255 measurement got
    // reported in this codebase once. Garbage under alpha=0 must not move the mean.
    const clean = disc(120, [200, 16, 46]);
    const dirty: Pixels = {
      data: new Uint8ClampedArray(clean.data),
      width: clean.width,
      height: clean.height,
    };
    for (let i = 0; i < dirty.data.length; i += 4) {
      if (dirty.data[i + 3] === 0) {
        dirty.data[i] = 255;
        dirty.data[i + 1] = 255;
        dirty.data[i + 2] = 255;
      }
    }
    expect(rasterSanity(dirty).meanRGB).toEqual(rasterSanity(clean).meanRGB);
  });
});
