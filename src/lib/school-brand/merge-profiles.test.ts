import { describe, it, expect } from "vitest";
import { mergeProfiles } from "./merge-profiles";
import type { SchoolProfile, TextCandidate, ColorCandidate, LogoCandidate } from "./types";

const tc = (value: string, confidence: number): TextCandidate =>
  ({ value, confidence, source: "test" }) as TextCandidate;
const cc = (hex: string, hits: number, confidence = 0.8): ColorCandidate =>
  ({ hex, hits, confidence, source: "test", role: "primary" }) as ColorCandidate;
const lc = (url: string, score: number): LogoCandidate =>
  ({ url, score, source: "img-logo-token", tier: 2, filenameTokens: [], reasons: [] }) as unknown as LogoCandidate;

const prof = (over: Partial<SchoolProfile>): SchoolProfile =>
  ({
    pageUrl: "https://lincoln.org/",
    host: "lincoln.org",
    platform: "edlio",
    platformConfidence: 0.9,
    platformSignals: ["meta"],
    names: [],
    mottos: [],
    mascots: [],
    colors: [],
    logos: [],
    droppedLogos: [],
    ...over,
  }) as SchoolProfile;

describe("mergeProfiles", () => {
  it("is identity for no extras", () => {
    const entry = prof({ names: [tc("Lincoln High", 0.9)] });
    expect(mergeProfiles(entry, [])).toBe(entry);
  });

  it("accumulates colour HITS across pages — two pages agreeing is corroboration", () => {
    // This is the merge's whole reason to exist: the brand kit refuses a colour with
    // hits < 2, and a school that declares maroon once per page would otherwise
    // never clear the floor no matter how many pages agree.
    const entry = prof({ colors: [cc("#8A1F2B", 1)] });
    const athletics = prof({ colors: [cc("#8A1F2B", 1)] });
    const merged = mergeProfiles(entry, [athletics]);
    expect(merged.colors[0].hits).toBe(2);
  });

  it("dedupes logos by URL keeping the better score, and re-ranks", () => {
    const entry = prof({ logos: [lc("https://a/logo.png", 3), lc("https://a/small.png", 2)] });
    const extra = prof({ logos: [lc("https://a/logo.png", 5), lc("https://a/athletics.png", 4)] });
    const merged = mergeProfiles(entry, [extra]);
    expect(merged.logos.map((l) => l.score)).toEqual([5, 4, 2]);
  });

  it("dedupes text by value case-insensitively, keeping the more confident", () => {
    const entry = prof({ mascots: [tc("Lancers", 0.6)] });
    const extra = prof({ mascots: [tc("LANCERS", 0.9), tc("Eagles", 0.3)] });
    const merged = mergeProfiles(entry, [extra]);
    expect(merged.mascots[0]).toMatchObject({ value: "LANCERS", confidence: 0.9 });
    expect(merged.mascots).toHaveLength(2);
  });

  it("keeps the ENTRY page's identity — platform, host, url — untouched", () => {
    const entry = prof({});
    const extra = prof({ platform: "wordpress", host: "vendor.example", pageUrl: "https://vendor.example/x" });
    const merged = mergeProfiles(entry, [extra]);
    expect(merged.platform).toBe("edlio");
    expect(merged.host).toBe("lincoln.org");
    expect(merged.pageUrl).toBe("https://lincoln.org/");
  });
});
