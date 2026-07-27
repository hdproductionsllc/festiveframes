import { describe, it, expect } from "vitest";
import { buildBrandKit, bannerTextOn, type SchoolBrandKit } from "./apply-brand";
import { luminance } from "@/lib/utils/tile-theme";
import type { SchoolProfile, TextCandidate, ColorCandidate } from "./types";

// The kit is the demo's most visible moment — paste a URL, watch the frame become
// the school's — so its refusals matter as much as its successes. A half-filled
// template ("HOME OF THE" with no mascot, a link-blue reskin) reads as a mail merge
// gone wrong, and every refusal case here is one of those failures pinned shut.

const tc = (value: string, confidence: number): TextCandidate => ({
  value, confidence, source: "test",
});
const cc = (hex: string, hits: number, confidence = 0.9): ColorCandidate =>
  ({ hex, hits, confidence, source: "test", role: "primary" }) as ColorCandidate;

const profile = (over: Partial<SchoolProfile>): SchoolProfile =>
  ({
    pageUrl: "https://west.example.org",
    host: "west.example.org",
    platform: "unknown",
    platformConfidence: 0,
    platformSignals: [],
    names: [tc("Parkway West High School", 0.9)],
    mottos: [tc("Tradition and Excellence", 0.8)],
    mascots: [tc("Longhorns", 0.92)],
    colors: [cc("#8A1F2B", 5), cc("#C9A34A", 3)],
    logos: [],
    droppedLogos: [],
    ...over,
  }) as SchoolProfile;

describe("buildBrandKit", () => {
  it("builds the full kit from a confident profile", () => {
    const kit = buildBrandKit(profile({}))!;
    expect(kit.schoolName).toBe("Parkway West High School");
    expect(kit.primary).toBe("#8A1F2B");
    expect(kit.secondary).toBe("#C9A34A");
    // The classic gym-wall stack, in the seeded design's own shape: top strip,
    // mascot headline, school name in the tagline tier.
    expect(kit.top.text).toBe("HOME OF THE");
    expect(kit.bottom.text).toBe("LONGHORNS");
    expect(kit.bottom.tagline).toBe("PARKWAY WEST HIGH SCHOOL");
    // Dark maroon → white type, by the same luminance rule the tile edges use.
    expect(kit.top.textColor).toBe("#FFFFFF");
    expect(kit.bottom.backgroundColor).toBe("#8A1F2B");
  });

  it("falls back to the motto when no mascot clears the auto floor", () => {
    const kit = buildBrandKit(profile({ mascots: [tc("Newsletter", 0.3)] }))!;
    expect(kit.mascot).toBeNull();
    // No mascot → the name takes the headline and the motto the tagline slot's
    // place; "HOME OF THE" with nothing under it never ships.
    expect(kit.top.text).toBe("PARKWAY WEST HIGH SCHOOL");
    expect(kit.bottom.text).toBe("TRADITION AND EXCELLENCE");
    expect(kit.bottom.tagline).toBeUndefined();
  });

  it("REFUSES rather than half-fills: no confident name", () => {
    expect(buildBrandKit(profile({ names: [tc("Skip to content", 0.2)] }))).toBeNull();
  });

  it("REFUSES rather than half-fills: no corroborated colour", () => {
    // One hit = probably a carousel accent, not the school's colour. Reskinning to a
    // guess is worse than keeping the defaults.
    expect(buildBrandKit(profile({ colors: [cc("#0000EE", 1)] }))).toBeNull();
  });

  it("REFUSES when neither mascot nor motto is usable", () => {
    expect(
      buildBrandKit(profile({ mascots: [], mottos: [tc("x", 0.1)] })),
    ).toBeNull();
  });

  it("secondary skips duplicates of the primary", () => {
    const kit = buildBrandKit(profile({ colors: [cc("#8A1F2B", 5), cc("#8A1F2B", 4)] }))!;
    expect(kit.secondary).toBeNull();
  });

  it("records WHY in order, so a change of opinion cannot ship silently", () => {
    const notes = buildBrandKit(profile({}))!.notes.join(" | ");
    expect(notes).toContain('name "Parkway West High School"');
    expect(notes).toContain("primary #8A1F2B");
    expect(notes).toContain('mascot "Longhorns"');
  });
});

describe("bannerTextOn", () => {
  it("white type on a dark field, dark type on a light one", () => {
    expect(bannerTextOn("#1B2A4A")).toBe("#FFFFFF");
    expect(bannerTextOn("#F5E9C8")).toBe("#1e1b17");
  });
});

// Type-level guard: the kit's banner shapes must stay assignable to the store's
// config patch, or applying them becomes a cast at the call site.
const _assign: SchoolBrandKit["top"] extends Partial<import("@/lib/types").BottomBarConfig>
  ? true
  : never = true;
void _assign;

describe("frame body colour — the largest area of the product", () => {
  it("uses the SECONDARY so the banners do not vanish into the body", () => {
    const kit = buildBrandKit(profile({}))!;
    expect(kit.frameColor).toBe("#C9A34A");
    expect(kit.frameColor).not.toBe(kit.top.backgroundColor);
  });

  it("darkens the primary when the school has only one colour", () => {
    const kit = buildBrandKit(profile({ colors: [cc("#8A1F2B", 5)] }))!;
    expect(kit.secondary).toBeNull();
    // Related to the banners, and clearly separated from them.
    expect(kit.frameColor).not.toBe("#8A1F2B");
    expect(luminance(kit.frameColor)).toBeLessThan(luminance("#8A1F2B"));
  });
});
