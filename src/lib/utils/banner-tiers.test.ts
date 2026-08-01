import { describe, it, expect } from "vitest";
import {
  bannerBands,
  BANNER_HEADLINE_FRACTION,
  BANNER_GAP_FRACTION,
  BANNER_TAGLINE_FRACTION,
  trackingPx,
  widthLimitedFont,
  MAX_TRACKING_EM,
  INK_BLEED_EM,
} from "./banner-tiers";

// The two-tier bottom banner splits its content box into a big headline band over a
// smaller tagline band. The on-screen render (SectionTextElement) and the print render
// (drawTextBlock) both call bannerBands, so this pins the shared geometry.

describe("bannerBands", () => {
  it("fractions sum to 1 (headline + gap + tagline fill the box)", () => {
    expect(BANNER_HEADLINE_FRACTION + BANNER_GAP_FRACTION + BANNER_TAGLINE_FRACTION).toBeCloseTo(1, 10);
  });

  it("headline is the taller band; tagline is smaller", () => {
    const b = bannerBands(1000);
    expect(b.headlineH).toBe(600);
    expect(b.taglineH).toBe(320);
    expect(b.headlineH).toBeGreaterThan(b.taglineH);
  });

  it("the tagline band starts below the headline band plus the gap", () => {
    const b = bannerBands(1000);
    expect(b.headlineTop).toBe(0);
    expect(b.taglineTop).toBe(600 + 80); // headlineH + gap(8%)
    // …and the bottom of the tagline band lands exactly at the content bottom.
    expect(b.taglineTop + b.taglineH).toBeCloseTo(1000, 10);
  });

  it("scales linearly with the box height", () => {
    const b = bannerBands(500);
    expect(b.headlineH).toBe(300);
    expect(b.taglineH).toBe(160);
    expect(b.taglineTop).toBe(340);
  });
});

// ─── Tracking, and what actually has to fit ──────────────────────────────────
//
// The stored letterSpacing is in PIXELS, and the same stored 4 is a whisper on a
// print sheet thousands of pixels wide and a hundred pixels of a phone's
// two-hundred-pixel banner. On a 390px phone the long school name was fitted to
// 7.9px in a 21px-tall bar and still overflowed, so the bar clipped its first
// letter — small, thick and cut off.

describe("trackingPx", () => {
  it("leaves the stored spacing alone wherever it is already sane", () => {
    // Desktop preview and print sheet: both well inside the cap, both unchanged.
    expect(trackingPx(4, 32)).toBe(4);
    expect(trackingPx(2, 55)).toBe(2);
    expect(trackingPx(4, 900)).toBe(4);
  });

  it("caps it against the font when the font is small", () => {
    // The phone case: 4px of tracking on 11px type is not tracking, it is a gap.
    expect(trackingPx(4, 11)).toBeCloseTo(11 * MAX_TRACKING_EM, 6);
    expect(trackingPx(4, 11)).toBeLessThan(4);
  });

  it("never returns a negative gap", () => {
    expect(trackingPx(4, 0)).toBe(0);
    expect(trackingPx(4, -10)).toBe(0);
  });
});

describe("widthLimitedFont", () => {
  // A 25-character line whose glyph run is 14.2 ems — the SLUH name in Graduate.
  const EM = 14.2;
  const N = 25;

  const inkWidth = (f: number) => EM * f + trackingPx(4, f) * N + INK_BLEED_EM * f;

  it("fills the width it is given, with the tracking it will actually use", () => {
    for (const contentW of [209, 400, 562, 3000]) {
      const f = widthLimitedFont(EM, N, 4, contentW);
      expect(inkWidth(f), `overflowed at contentW=${contentW}`).toBeLessThanOrEqual(contentW + 0.01);
      // ...and is not needlessly small: it should be filling the box, not hiding in it.
      expect(inkWidth(f)).toBeGreaterThan(contentW * 0.98);
    }
  });

  it("reserves the spacing after the LAST character too", () => {
    // CSS and canvas both add it. Reserving one fewer is how a line fitted to the
    // pixel came out one gap too wide and clipped.
    const f = widthLimitedFont(EM, N, 4, 3000);
    expect(EM * f + 4 * N + INK_BLEED_EM * f).toBeLessThanOrEqual(3000 + 0.01);
  });

  it("counts the merrow stroke, which is ink and sits outside the glyphs", () => {
    // Without it the fit is exactly one stroke too wide at every size.
    const withBleed = widthLimitedFont(EM, N, 0, 1000);
    expect(withBleed).toBeLessThan(1000 / EM);
  });

  it("rescues the starved phone case rather than shrinking the type to nothing", () => {
    const phone = widthLimitedFont(EM, N, 4, 209);
    expect(phone).toBeGreaterThan(10); // was 7.9 and clipped
    expect(trackingPx(4, phone)).toBeLessThan(4);
  });

  it("changes nothing at print scale", () => {
    // The cap must not bind where the current output is already right.
    const print = widthLimitedFont(EM, N, 4, 3000);
    expect(trackingPx(4, print)).toBe(4);
  });
});
