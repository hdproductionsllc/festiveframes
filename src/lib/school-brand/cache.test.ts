import { beforeEach, describe, expect, it } from "vitest";
import {
  __memBrandsForTest,
  getCachedBrand,
  persistScannedBrand,
  putCachedBrand,
} from "@/lib/school-brand/cache";
import type { ColorCandidate } from "@/lib/school-brand/types";

// ─── The brand cache ─────────────────────────────────────────────────────────
//
// DATABASE_URL is unset in the suite, so every call here takes the in-memory
// path — the same one local dev takes. What is worth pinning is not the storage
// (that is the ledger's pattern, already proven) but the RULE: a scan may fill in
// a roster school's colours and may never touch an authored kit's.

const candidate = (hex: string, hits: number): ColorCandidate => ({
  hex,
  confidence: 0.9,
  source: "css-variable",
  hits,
  role: "primary",
  neutral: false,
});

beforeEach(() => __memBrandsForTest.clear());

describe("round trip", () => {
  it("stores and returns what a scan found", async () => {
    await putCachedBrand("lincoln-high-school-lincoln-ne", {
      colors: ["#7A0E1F", "#FFFFFF"],
      sourceUrl: "https://lincolnhigh.example/",
      scannedAt: 1_760_000_000_000,
    });
    expect(await getCachedBrand("lincoln-high-school-lincoln-ne")).toEqual({
      colors: ["#7A0E1F", "#FFFFFF"],
      sourceUrl: "https://lincolnhigh.example/",
      scannedAt: 1_760_000_000_000,
    });
  });

  it("is a miss for a school nobody has scanned", async () => {
    expect(await getCachedBrand("nobody-has-scanned-this")).toBeNull();
  });

  it("refuses junk rather than repainting a frame with it", async () => {
    // A cached value goes straight onto a physical product's preview. "red" and
    // "#FFF" are not colours this renderer can use.
    await putCachedBrand("x", { colors: ["red", "#FFF"], sourceUrl: "u", scannedAt: 1 });
    expect(await getCachedBrand("x")).toBeNull();
    await putCachedBrand("", { colors: ["#123456"], sourceUrl: "u", scannedAt: 1 });
    expect(__memBrandsForTest.size).toBe(0);
  });

  it("lets a later scan correct an earlier one", async () => {
    await putCachedBrand("x", { colors: ["#111111"], sourceUrl: "a", scannedAt: 1 });
    await putCachedBrand("x", { colors: ["#222222"], sourceUrl: "b", scannedAt: 2 });
    expect((await getCachedBrand("x"))?.colors).toEqual(["#222222"]);
  });
});

describe("who a scan is allowed to recolour", () => {
  const colors = [candidate("#7A0E1F", 5), candidate("#FFFFFF", 4), candidate("#CCCCCC", 1)];

  it("remembers a ROSTER school's colours", async () => {
    // A real roster slug: Albertville High School, Albertville AL.
    const slug = "albertville-high-school-albertville-al";
    await persistScannedBrand(slug, colors, "https://albertvillehigh.example/about");
    const got = await getCachedBrand(slug);
    // Only the colours that cleared the same `hits` floor buildBrandKit applies —
    // the single-hit grey is a carousel, not a brand colour.
    expect(got?.colors).toEqual(["#7A0E1F", "#FFFFFF"]);
    expect(got?.sourceUrl).toBe("https://albertvillehigh.example/about");
  });

  it("NEVER overwrites an authored kit", async () => {
    // SLUH's colours were sampled from the school's own artwork. A scan of a CMS
    // that declares its link blue as --color-primary does not get to replace them.
    await persistScannedBrand("sluh-jr-bills", colors, "https://sluh.example/");
    expect(await getCachedBrand("sluh-jr-bills")).toBeNull();
    expect(__memBrandsForTest.size).toBe(0);
  });

  it("NEVER overwrites an authored kit reached by its roster slug either", async () => {
    // The same school under the name the federal directory files it as. It
    // redirects to the authored page, so caching against it would store colours
    // for a URL that never renders them — and would be one rename away from
    // reaching the authored kit.
    const rosterSlug = "st-louis-university-high-school-saint-louis-mo";
    await persistScannedBrand(rosterSlug, colors, "https://sluh.example/");
    expect(await getCachedBrand(rosterSlug)).toBeNull();
    expect(__memBrandsForTest.size).toBe(0);
  });

  it("does nothing for an unknown slug, or a scan with no solid colours", async () => {
    await persistScannedBrand("no-such-school-anywhere-zz", colors, "https://x.example/");
    await persistScannedBrand(
      "albertville-high-school-albertville-al",
      [candidate("#CCCCCC", 1)],
      "https://x.example/",
    );
    await persistScannedBrand("", colors, "https://x.example/");
    expect(__memBrandsForTest.size).toBe(0);
  });
});
