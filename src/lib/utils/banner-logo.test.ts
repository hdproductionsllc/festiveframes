import { describe, it, expect } from "vitest";
import { bannerConfigFor, bannerLogoLayout, sectionSupportsLogo, LOGO_HEIGHT_RATIO, LOGO_EDGE_RATIO } from "./banner-logo";
import type { BottomBarConfig } from "@/lib/types";

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
    // The crest sits INBOARD of the chrome inset (LOGO_EDGE_RATIO): flush against
    // it read as crowding the bevel, because a round mark looks closer to an edge
    // than a flat line of type at the same distance.
    const edge = BAR.inset + Math.round(BAR.height * LOGO_EDGE_RATIO);
    const left = bannerLogoLayout(logo("left"), BAR.width, BAR.height, BAR.inset)!;
    expect(left.leftX).toBe(edge);
    expect(left.rightX).toBeNull();
    expect(left.textX).toBeGreaterThan(edge); // pushed right past the crest

    const right = bannerLogoLayout(logo("right"), BAR.width, BAR.height, BAR.inset)!;
    expect(right.leftX).toBeNull();
    expect(right.textX).toBe(BAR.inset); // text starts at the edge again
    expect(right.rightX! + right.size).toBe(BAR.width - edge);
  });

  it("flanks BOTH sides symmetrically", () => {
    const edge = BAR.inset + Math.round(BAR.height * LOGO_EDGE_RATIO);
    const l = bannerLogoLayout(logo("both"), BAR.width, BAR.height, BAR.inset)!;
    expect(l.leftX).toBe(edge);
    expect(l.rightX! + l.size).toBe(BAR.width - edge);
    // Symmetry is the point: equal air on both sides, whatever the inset.
    expect(l.leftX).toBe(BAR.width - (l.rightX! + l.size));
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

describe("sectionSupportsLogo / bannerConfigFor", () => {
  const cfg = (over: Partial<BottomBarConfig> = {}): BottomBarConfig => ({
    text: "GO WILDCATS",
    fontFamily: "sans-serif",
    fontSize: 1,
    textColor: "#ffffff",
    backgroundColor: "#1B2A4A",
    textAlign: "center",
    letterSpacing: 0,
    ...over,
  });

  it("allows a crest on the bottom banner only", () => {
    expect(sectionSupportsLogo("bottom")).toBe(true);
    expect(sectionSupportsLogo("top")).toBe(false);
    expect(sectionSupportsLogo("wing-left")).toBe(false);
  });

  it("strips a crest the top strip is no longer allowed to carry", () => {
    // A design saved while the top bar could take one keeps the field forever; the
    // editor stopped offering the control, so nothing else could ever remove it.
    const withLogo = cfg({ logo: { url: "data:image/png;base64,x", placement: "left" } });
    expect(bannerConfigFor("top", withLogo).logo).toBeUndefined();
    expect(bannerConfigFor("bottom", withLogo).logo).toEqual(withLogo.logo);
  });

  it("returns the SAME object when there is nothing to strip, so renders don't churn", () => {
    const plain = cfg();
    expect(bannerConfigFor("top", plain)).toBe(plain);
    const withLogo = cfg({ logo: { url: "x", placement: "both" } });
    expect(bannerConfigFor("bottom", withLogo)).toBe(withLogo);
  });
});
