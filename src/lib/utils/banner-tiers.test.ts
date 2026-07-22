import { describe, it, expect } from "vitest";
import {
  bannerBands,
  BANNER_HEADLINE_FRACTION,
  BANNER_GAP_FRACTION,
  BANNER_TAGLINE_FRACTION,
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
