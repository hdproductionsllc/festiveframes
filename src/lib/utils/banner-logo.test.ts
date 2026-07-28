import { describe, it, expect } from "vitest";
import { bannerLogoLayout, LOGO_HEIGHT_RATIO } from "./banner-logo";

const BAR = { width: 800, height: 120, inset: 10 };
const logo = (placement: "left" | "right" | "both") => ({
  logo: { url: "data:image/png;base64,x", placement },
});

describe("bannerLogoLayout", () => {
  it("returns null with no crest, so the text-only path is untouched", () => {
    expect(bannerLogoLayout({}, BAR.width, BAR.height, BAR.inset)).toBeNull();
    expect(
      bannerLogoLayout({ logo: { url: "", placement: "left" } }, BAR.width, BAR.height, BAR.inset),
    ).toBeNull();
  });

  it("sizes the crest off the banner's CONTENT height, not its full height", () => {
    // Full height would put the mark through the bevel and read as a background
    // image rather than a lockup.
    const l = bannerLogoLayout(logo("left"), BAR.width, BAR.height, BAR.inset)!;
    expect(l.size).toBe(Math.round((BAR.height - BAR.inset * 2) * LOGO_HEIGHT_RATIO));
    expect(l.size).toBeLessThan(BAR.height);
  });

  it("centres the crest vertically", () => {
    const l = bannerLogoLayout(logo("left"), BAR.width, BAR.height, BAR.inset)!;
    expect(l.y + l.size / 2).toBeCloseTo(BAR.height / 2, 0);
  });

  it("takes width from the side the crest is on, and only that side", () => {
    const left = bannerLogoLayout(logo("left"), BAR.width, BAR.height, BAR.inset)!;
    expect(left.leftX).toBe(BAR.inset);
    expect(left.rightX).toBeNull();
    expect(left.textX).toBeGreaterThan(BAR.inset); // pushed right past the crest

    const right = bannerLogoLayout(logo("right"), BAR.width, BAR.height, BAR.inset)!;
    expect(right.leftX).toBeNull();
    expect(right.textX).toBe(BAR.inset); // text starts at the edge again
    expect(right.rightX! + right.size).toBe(BAR.width - BAR.inset);
  });

  it("flanks BOTH sides symmetrically", () => {
    const l = bannerLogoLayout(logo("both"), BAR.width, BAR.height, BAR.inset)!;
    expect(l.leftX).toBe(BAR.inset);
    expect(l.rightX! + l.size).toBe(BAR.width - BAR.inset);
    // Text centred between them.
    expect(l.textX + l.textWidth / 2).toBeCloseTo(BAR.width / 2, 0);
  });

  it("never starves the text below a third of the bar", () => {
    // A short, tall banner is the case where two crests would eat everything. The
    // banner's job is the words; past this point the crests overlap rather than the
    // text disappearing.
    const l = bannerLogoLayout(logo("both"), 200, 160, 10)!;
    expect(l.textWidth).toBeGreaterThanOrEqual(Math.round((200 - 20) / 3));
    expect(l.textWidth).toBeGreaterThan(0);
  });

  it("keeps the text inside the banner even when squeezed", () => {
    const l = bannerLogoLayout(logo("both"), 200, 160, 10)!;
    expect(l.textX).toBeGreaterThanOrEqual(0);
    expect(l.textX + l.textWidth).toBeLessThanOrEqual(200);
  });
});
