import { describe, it, expect } from "vitest";
import { MIN_DPI } from "@/lib/utils/artwork-qc";
import { BLOCK_DPI, evaluateResolution } from "@/lib/utils/print-resolution";
import { scanPage } from "./html-scan";
import {
  collectLogoCandidates,
  gateByResolution,
  largestFromSrcset,
  manifestIconCandidates,
  upgradeCandidateUrl,
  imageHints,
  MIN_BADGE_INCHES,
  MIN_BADGE_PIXELS,
  rankLogoCandidates,
  scoreLogoCandidate,
  vendorRanges,
} from "./rank-candidates";
import { EDLIO_PAGE } from "./__fixtures__/edlio-page";
import { WORDPRESS_PAGE } from "./__fixtures__/wordpress-page";
import { FAVICON_ONLY_PAGE } from "./__fixtures__/favicon-only-page";
import { ILLUSTRATOR_SVG_PAGE } from "./__fixtures__/illustrator-svg-page";
import { VENDOR_MARK_PAGE } from "./__fixtures__/vendor-mark-page";

const edlio = scanPage(EDLIO_PAGE, "https://www.lincolnhs.org/");
const wp = scanPage(WORDPRESS_PAGE, "https://westbrookms.org/");
const bare = scanPage(FAVICON_ONLY_PAGE, "https://riverbendcharter.org/");
const illustrator = scanPage(ILLUSTRATOR_SVG_PAGE, "https://mesaverdeacademy.org/");
const finalsite = scanPage(VENDOR_MARK_PAGE, "https://marshallhs.org/");

describe("the vendor blocklist, which runs before anything else", () => {
  it("drops Edlio's own mark out of the school's header", () => {
    // It is clean inline SVG with presentation-attribute fills, at a sensible size,
    // inside a container whose class contains the word "logo". Every quality signal
    // this file has loves it. Only the blocklist can remove it.
    const { logos, dropped } = rankLogoCandidates(edlio);
    expect(dropped.some((d) => d.kind === "inline-svg" && d.dropped === "vendor-mark")).toBe(true);
    expect(logos.some((l) => l.kind === "inline-svg")).toBe(false);
  });

  it("drops the #fsPoweredByFinalsite mark the same way", () => {
    const { logos, dropped } = rankLogoCandidates(finalsite);
    expect(dropped.filter((d) => d.dropped === "vendor-mark").length).toBe(1);
    expect(logos.some((l) => l.kind === "inline-svg")).toBe(false);
  });

  it("excludes everything nested inside a vendor container, not just the container", () => {
    const ranges = vendorRanges(edlio);
    const svgStart = EDLIO_PAGE.indexOf("<svg");
    expect(ranges.some(([a, b]) => svgStart > a && svgStart < b)).toBe(true);
  });

  it("keeps a school crest that is HOSTED on the vendor's CDN", () => {
    // The opposite mistake, and the more damaging one: Finalsite hosts its
    // customers' own uploads on resources.finalsite.net. Matching the vendor's name
    // anywhere in the URL throws away the school's logo on every Finalsite site in
    // the country. Only the path and the surrounding markup may accuse an asset.
    const top = rankLogoCandidates(finalsite).logos[0];
    expect(top.url).toContain("resources.finalsite.net");
    expect(top.url).toContain("marshall-crest.png");
  });

  it("keeps the school's crest even though <body class=\"edlio-site\"> is its ancestor", () => {
    // A body class says who BUILT the site, not who owns this image. Reading the
    // full ancestor chain for vendor words dropped every image on the Edlio page,
    // including the crest — the first thing this fixture caught.
    const top = rankLogoCandidates(edlio).logos[0];
    expect(top.url).toBe("https://www.lincolnhs.org/pics/lincoln-crest.png");
  });

  it("drops the social icon sitting in the header next to the crest", () => {
    const { dropped } = rankLogoCandidates(wp);
    expect(dropped.some((d) => d.dropped === "social-icon" && d.url.includes("facebook"))).toBe(true);
  });

  it("keeps every drop, with its reason, instead of discarding it", () => {
    // "We found four things and dropped all four as vendor marks" is a minute of
    // debugging. "We found nothing" is an afternoon.
    for (const d of rankLogoCandidates(edlio).dropped) expect(d.dropped).toBeTruthy();
  });
});

describe("render risks are fatal, not a penalty", () => {
  it("drops the Illustrator SVG before it is ever ranked", () => {
    const { logos, dropped } = rankLogoCandidates(illustrator);
    expect(logos).toEqual([]);
    expect(dropped).toHaveLength(1);
    expect(dropped[0].dropped).toBe("svg-render-risk");
    expect(dropped[0].risks).toContain("internal-stylesheet");
  });

  it("measures the risk at collection time, so ranking never sees it", () => {
    const svg = collectLogoCandidates(illustrator).find((c) => c.kind === "inline-svg");
    expect(svg?.risks.length).toBeGreaterThan(0);
  });
});

describe("collection", () => {
  it("takes the lazy-loading attribute over a placeholder src", () => {
    const scan = scanPage(
      `<header class="site-header"><img class="logo" src="/img/1x1.gif" data-src="/img/crest.png" width="400" height="400"></header>`,
      "https://x.org/",
    );
    const urls = collectLogoCandidates(scan).map((c) => c.url);
    expect(urls).toContain("https://x.org/img/crest.png");
    expect(urls).not.toContain("https://x.org/img/1x1.gif");
  });

  it("ignores the page's decorative inline SVG icon set", () => {
    const scan = scanPage(
      `<main><svg viewBox="0 0 8 8"><path d="M0 0h8v8H0z" fill="#000"/></svg></main>`,
      "https://x.org/",
    );
    expect(collectLogoCandidates(scan).length).toBe(0);
  });

  it("finds a crest set as a CSS background, which an <img> scan misses", () => {
    const scan = scanPage(
      `<style>.site-logo{background-image:url('/img/seal.png');}</style><body></body>`,
      "https://x.org/",
    );
    const c = collectLogoCandidates(scan);
    expect(c[0]).toMatchObject({ url: "https://x.org/img/seal.png", kind: "css-background" });
  });

  it("collects favicons, lowest, rather than reporting no logo at all", () => {
    const kinds = collectLogoCandidates(bare).map((c) => c.kind);
    expect(kinds).toEqual(["favicon", "favicon"]);
  });

  it("never treats og:image as a logo candidate", () => {
    // Edlio caps og:image at 250px (125 DPI on a 2" badge); other sites emit it
    // empty, or as a video poster, or as today's news photo. It is a sharing card.
    const urls = collectLogoCandidates(edlio).map((c) => c.url);
    expect(urls.some((u) => u.includes("og-lincoln-crest-250"))).toBe(false);
    // It survives only as a filename hint.
    expect(imageHints(edlio)).toEqual(["og-lincoln-crest-250.png"]);
  });
});

describe("scoring and dedupe", () => {
  it("puts the school's crest above the district seal and the favicon", () => {
    const logos = rankLogoCandidates(edlio).logos;
    expect(logos[0].url).toContain("lincoln-crest.png");
    expect(logos[0].score).toBeGreaterThan(logos[1].score);
  });

  it("collapses the same asset behind two ?ver= cache-busters", () => {
    const { logos, dropped } = rankLogoCandidates(wp);
    expect(logos.filter((l) => l.url.includes("westbrook-logo.png")).length).toBe(1);
    expect(dropped.some((d) => d.dropped === "duplicate")).toBe(true);
  });

  it("penalises the formats that cost something downstream", () => {
    const base = { kind: "raster" as const, source: "img", score: 0, risks: [], offset: 0 };
    const png = scoreLogoCandidate({ ...base, url: "https://x.org/crest.png" });
    const jpg = scoreLogoCandidate({ ...base, url: "https://x.org/crest.jpg" });
    const gif = scoreLogoCandidate({ ...base, url: "https://x.org/crest.gif" });
    const ico = scoreLogoCandidate({ ...base, url: "https://x.org/crest.ico" });
    // JPEG has no alpha, so it arrives with a guaranteed matte fringe; GIF is
    // palette-quantized by definition; ICO segfaults the decoder outright.
    expect(png).toBeGreaterThan(jpg);
    expect(jpg).toBeGreaterThan(gif);
    expect(gif).toBeGreaterThan(ico);
  });

  it("punishes a 32px declared size hard", () => {
    const base = { kind: "raster" as const, url: "https://x.org/logo.png", source: "img", score: 0, risks: [], offset: 0 };
    const big = scoreLogoCandidate({ ...base, declaredWidth: 400, declaredHeight: 400 });
    const small = scoreLogoCandidate({ ...base, declaredWidth: 32, declaredHeight: 32 });
    expect(big - small).toBeGreaterThanOrEqual(40);
  });

  it("rewards alt text that names the school", () => {
    const base = { kind: "raster" as const, url: "https://x.org/a.png", source: "img", score: 0, risks: [], offset: 0 };
    const named = scoreLogoCandidate({ ...base, alt: "Westbrook Middle School" }, { schoolName: "Westbrook Middle School" });
    const anon = scoreLogoCandidate({ ...base, alt: "photo" }, { schoolName: "Westbrook Middle School" });
    expect(named).toBeGreaterThan(anon);
  });

  it("orders the list best-first and stably", () => {
    const logos = rankLogoCandidates(finalsite).logos;
    for (let i = 1; i < logos.length; i++) {
      expect(logos[i - 1].score).toBeGreaterThanOrEqual(logos[i].score);
    }
  });
});

describe("the resolution gate (constraint 5)", () => {
  it("is the SAME threshold the crop modal blocks on — not a restatement of it", () => {
    // These were once 150 and 200, and the gap was a dead end: this module called a
    // 300px logo usable, the picker offered it, and the crop modal then refused it
    // with no way forward.
    expect(MIN_DPI).toBe(BLOCK_DPI);
    expect(MIN_BADGE_INCHES).toBeCloseTo(1.982, 3); // 2 tiles at the 0.991" pitch
    expect(MIN_BADGE_PIXELS).toBe(Math.ceil(BLOCK_DPI * MIN_BADGE_INCHES));
  });

  it("blocks exactly what evaluateResolution blocks", () => {
    for (const side of [32, 180, 250, 396, 397, 600, 1200]) {
      const px = { width: side, height: side };
      const gate = gateByResolution(px);
      const direct = evaluateResolution(px, { width: MIN_BADGE_INCHES, height: MIN_BADGE_INCHES });
      expect(gate.usable).toBe(!direct.blocked);
    }
  });

  it("blocks the favicon and the 180px touch icon, which is the usual outcome", () => {
    expect(gateByResolution({ width: 32, height: 32 }).usable).toBe(false);
    expect(gateByResolution({ width: 180, height: 180 }).usable).toBe(false);
    // And the 250px og:image Edlio emits, which is why it is not a candidate.
    expect(gateByResolution({ width: 250, height: 250 }).usable).toBe(false);
  });

  it("passes a real 512px crest and says so in print terms", () => {
    const v = gateByResolution({ width: 512, height: 512 });
    expect(v.usable).toBe(true);
    expect(Math.round(v.verdict.dpi)).toBe(258);
  });

  it("never blocks vector art, which has no resolution to block", () => {
    expect(gateByResolution(null).usable).toBe(true);
  });

  it("tells the user the pixel number, not just a DPI", () => {
    const v = gateByResolution({ width: 180, height: 180 });
    expect(v.message).toContain(`${MIN_BADGE_PIXELS}px`);
  });
});

describe("largestFromSrcset (the first live scan's rejection, root-caused)", () => {
  it("takes the LARGEST width descriptor, not the first entry", () => {
    // srcset lists are conventionally smallest-first, and the old code took
    // entry[0] — literally selecting the smallest available file for a pipeline
    // whose whole gate is "is this big enough to print". The 512 that would have
    // passed was sitting in the same attribute as the 150 we rejected.
    expect(
      largestFromSrcset("/logo-150.png 150w, /logo-512.png 512w, /logo-300.png 300w"),
    ).toBe("/logo-512.png");
  });

  it("compares density descriptors with width descriptors sanely", () => {
    expect(largestFromSrcset("/a.png 1x, /b.png 2x")).toBe("/b.png");
    // 2x (nominal 800) beats 640w; 1200w beats 2x.
    expect(largestFromSrcset("/a.png 640w, /b.png 2x")).toBe("/b.png");
    expect(largestFromSrcset("/a.png 1200w, /b.png 2x")).toBe("/a.png");
  });

  it("returns '' for an absent srcset so the caller falls through to src", () => {
    expect(largestFromSrcset("")).toBe("");
  });
});

describe("upgradeCandidateUrl", () => {
  it("strips query-string resizers", () => {
    expect(upgradeCandidateUrl("https://s.org/logo.png?width=150&height=80&v=3")).toBe(
      "https://s.org/logo.png?v=3",
    );
  });

  it("strips a WordPress size suffix", () => {
    expect(upgradeCandidateUrl("https://s.org/up/2024/logo-300x150.png")).toBe(
      "https://s.org/up/2024/logo.png",
    );
  });

  it("returns null when the URL carries no size markers — nothing to retry", () => {
    expect(upgradeCandidateUrl("https://s.org/logo.png")).toBeNull();
    expect(upgradeCandidateUrl("not a url")).toBeNull();
  });
});

describe("manifestIconCandidates", () => {
  it("yields the 512 icon the PWA spec demands, sized from `sizes`", () => {
    const icons = manifestIconCandidates(
      { icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ] },
      "https://school.org/manifest.json",
    );
    expect(icons).toHaveLength(2);
    expect(icons[1]).toMatchObject({
      url: "https://school.org/icons/icon-512.png",
      source: "manifest-icon",
      declaredWidth: 512,
    });
  });

  it("survives every malformed shape a real manifest can take", () => {
    expect(manifestIconCandidates(null, "https://x.org/m.json")).toEqual([]);
    expect(manifestIconCandidates("nope", "https://x.org/m.json")).toEqual([]);
    expect(manifestIconCandidates({ icons: "nope" }, "https://x.org/m.json")).toEqual([]);
    expect(manifestIconCandidates({ icons: [{ sizes: "1x1" }, null] }, "https://x.org/m.json")).toEqual([]);
  });

  it("takes the largest edge from a multi-size declaration", () => {
    const [icon] = manifestIconCandidates(
      { icons: [{ src: "/i.png", sizes: "48x48 96x96 144x144" }] },
      "https://x.org/m.json",
    );
    expect(icon.declaredWidth).toBe(144);
  });
});

describe("collectLogoCandidates picks the largest srcset entry over src", () => {
  it("prefers the biggest variant when the img declares both", () => {
    const html = `<html><body><img src="/logo-150.png" srcset="/logo-150.png 150w, /logo-512.png 512w" alt="Crest"></body></html>`;
    const scan = scanPage(html, "https://school.org/");
    const urls = collectLogoCandidates(scan).map((c) => c.url);
    expect(urls).toContain("https://school.org/logo-512.png");
    expect(urls).not.toContain("https://school.org/logo-150.png");
  });
});
