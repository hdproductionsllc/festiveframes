// ─── Tests for the import panel's decisions ──────────────────────────────────
//
// These are the only tests this feature's UI can have. `vitest.config.ts` runs
// `environment: "node"` with no jsdom and no react plugin, so `SchoolBrandImport.tsx`
// itself is untestable here — which is exactly why every judgement it makes was moved
// into `import-ui.ts`. The two suites that matter are the two that pin constraints
// which are INVISIBLE ON SCREEN: full-res handoff (wrong only on the printed part) and
// the resolution gate (wrong only as a dead end at the crop modal).
//
// Nothing below fetches. The candidate objects are constructed, and the profile ones
// come from `parseSchoolPage` over the committed fixture HTML — the same
// no-network discipline the rest of the folder is built on.

import { describe, expect, it } from "vitest";

import type { QcCode, QcFinding } from "@/lib/utils/artwork-qc";

import { EDLIO_PAGE } from "./__fixtures__/edlio-page";
import {
  ALWAYS_WORKS,
  MAX_FILLS_PER_KIND,
  MIN_FILL_CONFIDENCE,
  PERFORMABLE_ACTIONS,
  artworkOf,
  bannerFills,
  candidateAspect,
  candidateFileName,
  candidateNotes,
  dataUrlToFile,
  dataUrlToFile as _dataUrlToFile,
  isAddable,
  isSubmittableUrl,
  performableActions,
  plainFinding,
} from "./import-ui";
import { buildEmptyState, describeOutcome, parseSchoolPage } from "./index";
import type { PrepareResult, ScanCandidate } from "./prepare-artwork.server";
import type { PageOutcome, TextCandidate } from "./types";

void _dataUrlToFile;

// ─── fixtures ────────────────────────────────────────────────────────────────

/** A 1x1 PNG, base64. Small enough to inline, real enough to decode. */
const PNG_1PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function candidate(over: Partial<ScanCandidate> = {}): ScanCandidate {
  return {
    url: "https://lincolnhigh.org/pics/lincoln-crest.png",
    kind: "raster",
    source: "img.school-logo",
    score: 12,
    alt: "Lincoln High School logo",
    fullRes: { dataUrl: PNG_1PX, width: 1024, height: 1024, bytes: 4096 },
    preview: { dataUrl: PNG_1PX, width: 1200, height: 1200, bytes: 512 },
    usable: true,
    qc: { findings: [], effectiveDpi: 516, repairs: [] },
    resolution: { usable: true, dpi: 516, level: "green", blocked: false, message: "Sharp at badge size." },
    ...over,
  };
}

const finding = (code: QcCode, severity: QcFinding["severity"]): QcFinding => ({
  code,
  severity,
  message: `${code} (raw engineer text with numbers like 235,235,234)`,
  repairable: false,
});

const text = (value: string, confidence: number): TextCandidate => ({
  value,
  confidence,
  source: "test",
});

// ─── constraint 5: never offer what the crop modal will refuse ───────────────

describe("isAddable — the resolution gate, restated", () => {
  it("lets a big sharp logo through", () => {
    expect(isAddable(candidate())).toBe(true);
  });

  it("refuses a candidate the server already called unusable", () => {
    expect(isAddable(candidate({ usable: false }))).toBe(false);
  });

  // THE ONE THAT MATTERS. A server regression that flips `usable` to true must not be
  // able to put a blocked candidate in front of the crop modal, because the crop modal
  // will refuse it and there is no screen after that one.
  it("refuses a blocked candidate even when `usable` claims otherwise", () => {
    const c = candidate({
      usable: true,
      fullRes: { dataUrl: PNG_1PX, width: 300, height: 300, bytes: 900 },
      resolution: {
        usable: false,
        dpi: 151,
        level: "red",
        blocked: true,
        message: 'Only 151 DPI on a 2.0" badge — needs about 397px on its short side.',
      },
    });
    expect(c.usable).toBe(true); // the lie we are guarding against
    expect(isAddable(c)).toBe(false);
  });

  it("refuses when the resolution verdict is unusable but not flagged blocked", () => {
    const c = candidate({
      resolution: { usable: false, dpi: 199, level: "red", blocked: false, message: "too small" },
    });
    expect(isAddable(c)).toBe(false);
  });

  it("refuses on any error-severity QC finding", () => {
    const c = candidate({ qc: { findings: [finding("near-empty", "error")], effectiveDpi: 516, repairs: [] } });
    expect(isAddable(c)).toBe(false);
  });

  it("tolerates warning-severity findings", () => {
    const c = candidate({
      qc: { findings: [finding("palette-quantized", "warning")], effectiveDpi: 516, repairs: [] },
    });
    expect(isAddable(c)).toBe(true);
  });

  it("refuses zero-area art", () => {
    expect(isAddable(candidate({ fullRes: { dataUrl: PNG_1PX, width: 0, height: 0, bytes: 0 } }))).toBe(false);
  });
});

// ─── constraint 4: the full-res is the artwork ───────────────────────────────

describe("artworkOf / candidateAspect — the full-res handoff", () => {
  // Constructed so the two images are DISTINGUISHABLE. If they were identical (as
  // they are whenever the art is already under the preview cap) this test would pass
  // against a function that returned the preview.
  const c = candidate({
    fullRes: { dataUrl: "data:image/png;base64,RlVMTA==", width: 3000, height: 2000, bytes: 900_000 },
    preview: { dataUrl: "data:image/png;base64,UFJFVg==", width: 1200, height: 800, bytes: 40_000 },
  });

  it("hands over the full-res image, not the preview", () => {
    expect(artworkOf(c).dataUrl).toBe("data:image/png;base64,RlVMTA==");
    expect(artworkOf(c).width).toBe(3000);
    expect(artworkOf(c).dataUrl).not.toBe(c.preview.dataUrl);
  });

  it("measures aspect on the full-res", () => {
    expect(candidateAspect(c)).toBeCloseTo(1.5, 6);
  });

  // `planPreview` rounds both sides to whole pixels, so the preview's aspect is not
  // the art's aspect. The crop's aspect target is derived from this number, so a
  // preview-measured aspect seats the art in a fractionally wrong span.
  it("does not inherit the preview's rounded aspect", () => {
    const odd = candidate({
      fullRes: { dataUrl: PNG_1PX, width: 1001, height: 667, bytes: 1 },
      preview: { dataUrl: PNG_1PX, width: 1200, height: 800, bytes: 1 },
    });
    expect(candidateAspect(odd)).toBeCloseTo(1001 / 667, 6);
    expect(candidateAspect(odd)).not.toBeCloseTo(1200 / 800, 4);
  });

  it("falls back to square rather than propagating NaN", () => {
    expect(candidateAspect(candidate({ fullRes: { dataUrl: PNG_1PX, width: 0, height: 0, bytes: 0 } }))).toBe(1);
  });
});

describe("dataUrlToFile — the bridge onto the existing upload path", () => {
  it("decodes a base64 data URL into a File with the right bytes", async () => {
    const file = dataUrlToFile(PNG_1PX, "crest.png");
    expect(file.name).toBe("crest.png");
    expect(file.type).toBe("image/png");
    const bytes = new Uint8Array(await file.arrayBuffer());
    // PNG magic. Proof the base64 survived the round trip rather than being mangled
    // by a string copy — this is the byte sequence `sniffImageType` allowlists.
    expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it("refuses anything that is not a base64 data URL", () => {
    expect(() => dataUrlToFile("https://example.org/logo.png", "x.png")).toThrow();
    expect(() => dataUrlToFile("data:image/svg+xml,<svg/>", "x.png")).toThrow();
    expect(() => dataUrlToFile("", "x.png")).toThrow();
  });
});

describe("candidateFileName", () => {
  it("uses the URL's last segment", () => {
    expect(candidateFileName(candidate())).toBe("lincoln-crest.png");
  });

  it("falls back to alt text for an inline SVG with no URL", () => {
    expect(candidateFileName(candidate({ url: "", kind: "inline-svg", alt: "Lincoln Crest" }))).toBe(
      "lincoln-crest.png",
    );
  });

  it("always ends .png, because finishCandidate re-encodes everything through the canvas", () => {
    expect(candidateFileName(candidate({ url: "https://x.org/a/logo.svg" }))).toBe("logo.png");
    expect(candidateFileName(candidate({ url: "https://x.org/favicon.ico" }))).toBe("favicon.png");
  });

  it("never produces an empty stem", () => {
    expect(candidateFileName(candidate({ url: "", alt: "!!!" }))).toBe("school-logo.png");
  });
});

// ─── plain language ──────────────────────────────────────────────────────────

describe("plainFinding", () => {
  const ALL: QcCode[] = [
    "resolution-low",
    "resolution-marginal",
    "background-opaque",
    "matte-fringe",
    "palette-quantized",
    "near-empty",
  ];

  it("has parent-facing copy for every QC code", () => {
    for (const code of ALL) {
      const copy = plainFinding(finding(code, "warning"));
      expect(copy.length).toBeGreaterThan(10);
      // The raw messages carry pixel tuples and code names. Neither belongs on a card.
      expect(copy).not.toContain(code);
      expect(copy).not.toMatch(/\d+,\d+,\d+/);
    }
  });
});

describe("candidateNotes", () => {
  it("gives an addable candidate a verdict and no blockers", () => {
    const n = candidateNotes(candidate());
    expect(n.addable).toBe(true);
    expect(n.blockers).toEqual([]);
    expect(n.verdict).toBe("Sharp at badge size.");
    expect(n.spec).toContain("1024 × 1024");
  });

  it("calls vector art vector rather than quoting a DPI at it", () => {
    const n = candidateNotes(candidate({ kind: "svg-file", resolution: { usable: true, dpi: 9007199254740991, level: "green", blocked: false, message: "Vector art — sharp at any size." } }));
    expect(n.spec).toContain("vector");
    expect(n.spec).not.toMatch(/DPI/);
  });

  // A disabled button with no stated reason is the defect this guards.
  it("never leaves a non-addable candidate without a blocker to show", () => {
    const n = candidateNotes(candidate({ usable: false }));
    expect(n.addable).toBe(false);
    expect(n.blockers.length).toBeGreaterThan(0);
    expect(n.verdict).toBe(n.blockers[0]);
  });

  it("surfaces the resolution message when QC did not already say it", () => {
    const n = candidateNotes(
      candidate({
        usable: false,
        resolution: { usable: false, dpi: 96, level: "red", blocked: true, message: "Only 96 DPI on a 2.0\" badge." },
      }),
    );
    expect(n.blockers.join(" ")).toContain("96 DPI");
  });

  it("does not say the resolution twice when QC already flagged it", () => {
    const n = candidateNotes(
      candidate({
        usable: false,
        qc: { findings: [finding("resolution-low", "error")], effectiveDpi: 96, repairs: [] },
        resolution: { usable: false, dpi: 96, level: "red", blocked: true, message: "Only 96 DPI." },
      }),
    );
    expect(n.blockers).toHaveLength(1);
  });

  it("splits findings by severity and carries the repairs through", () => {
    const n = candidateNotes(
      candidate({
        qc: {
          findings: [finding("palette-quantized", "warning")],
          effectiveDpi: 516,
          repairs: ["Removed the (255,255,255) matte from 812 edge pixels."],
        },
      }),
    );
    expect(n.cautions).toHaveLength(1);
    expect(n.blockers).toEqual([]);
    expect(n.repairs).toHaveLength(1);
  });

  it("names the alt text in the title so a parent can match it to their own screen", () => {
    expect(candidateNotes(candidate()).title).toContain("Lincoln High School logo");
    expect(candidateNotes(candidate({ alt: undefined })).title).toBe("Logo image");
  });
});

// ─── constraint 6: every state ends somewhere the user can go ────────────────

describe("performableActions — no dead ends, no dead buttons", () => {
  const OUTCOMES: PageOutcome[] = [
    { kind: "blocked-by-robots", rule: "/" },
    { kind: "blocked-by-site", status: 404 },
    { kind: "blocked-by-site", status: 403 },
    { kind: "blocked-by-site", status: 503 },
    { kind: "not-html", contentType: "application/pdf" },
    { kind: "timeout", ms: 8000 },
    { kind: "unreachable" },
  ];

  it("leaves every failure state with at least one action we can actually run", () => {
    for (const outcome of OUTCOMES) {
      const actions = performableActions(describeOutcome(outcome).actions);
      expect(actions.length, outcome.kind).toBeGreaterThan(0);
      for (const a of actions) expect(PERFORMABLE_ACTIONS.has(a.id)).toBe(true);
    }
  });

  it("always keeps Upload a photo — the action that works whatever the site did", () => {
    for (const outcome of OUTCOMES) {
      const ids = performableActions(describeOutcome(outcome).actions).map((a) => a.id);
      expect(ids, outcome.kind).toContain("upload-photo");
    }
  });

  // The empty state is the MOST LIKELY successful outcome, not the sad path.
  it("leaves the empty state with a working primary action", () => {
    for (const reason of [
      { hadCandidates: false, droppedVendor: 0, droppedRisk: 0 },
      { hadCandidates: true, droppedVendor: 2, droppedRisk: 1 },
    ]) {
      const actions = performableActions(buildEmptyState(reason).actions);
      expect(actions.some((a) => a.primary)).toBe(true);
      expect(actions.map((a) => a.id)).toContain("upload-photo");
    }
  });

  // Nothing in this app accepts a direct image URL, so the button would open nothing.
  it("drops paste-image-url rather than rendering a button that opens nothing", () => {
    const robots = describeOutcome({ kind: "blocked-by-robots" });
    expect(robots.actions.map((a) => a.id)).toContain("paste-image-url");
    expect(performableActions(robots.actions).map((a) => a.id)).not.toContain("paste-image-url");
  });

  it("falls back to Upload a photo when nothing suggested is performable", () => {
    expect(performableActions([{ id: "paste-image-url", label: "x", primary: true }])).toEqual([ALWAYS_WORKS]);
    expect(performableActions([])).toEqual([ALWAYS_WORKS]);
  });
});

// ─── one-tap banner fills ────────────────────────────────────────────────────

describe("bannerFills", () => {
  const profile = (over: Partial<Parameters<typeof bannerFills>[0]> = {}) => ({
    names: [] as TextCandidate[],
    mascots: [] as TextCandidate[],
    mottos: [] as TextCandidate[],
    ...over,
  });

  it("routes each kind to the banner its geometry allows", () => {
    const fills = bannerFills(
      profile({
        names: [text("Lincoln High School", 0.82)],
        mascots: [text("Eagles", 0.7)],
        mottos: [text("Excellence in every classroom", 0.6)],
      }),
    );
    const by = Object.fromEntries(fills.map((f) => [f.kind, f]));
    // The top strip is one row tall and `sectionSupportsTiles` forces it to text
    // forever — the only section guaranteed to be a banner, so the name lives there.
    expect(by.name.section).toBe("top");
    expect(by.name.field).toBe("text");
    // The bottom banner is two rows and renders a smaller second tier for `tagline`.
    expect(by.mascot.section).toBe("bottom");
    expect(by.mascot.field).toBe("text");
    expect(by.motto.section).toBe("bottom");
    expect(by.motto.field).toBe("tagline");
  });

  it("orders name → mascot → motto", () => {
    const fills = bannerFills(
      profile({ names: [text("A School", 0.5)], mascots: [text("Bears", 0.5)], mottos: [text("Be kind here", 0.5)] }),
    );
    expect(fills.map((f) => f.kind)).toEqual(["name", "mascot", "motto"]);
  });

  // The hostname fallback is pushed at 0.15 by `extractSchoolNames` and described in
  // its own comment as a guess of last resort. A chip is an assertion, so it stays out.
  it("hides text below the confidence floor rather than asserting a guess", () => {
    expect(bannerFills(profile({ names: [text("Lincolnhigh", 0.15)] }))).toEqual([]);
    expect(MIN_FILL_CONFIDENCE).toBeGreaterThan(0.15);
    expect(MIN_FILL_CONFIDENCE).toBeLessThanOrEqual(0.35);
  });

  it("dedupes case-insensitively", () => {
    const fills = bannerFills(
      profile({ names: [text("Lincoln High School", 0.8), text("LINCOLN HIGH SCHOOL", 0.6)] }),
    );
    expect(fills).toHaveLength(1);
  });

  it("caps each kind", () => {
    const many = Array.from({ length: 9 }, (_, i) => text(`School Number ${i}`, 0.7));
    expect(bannerFills(profile({ names: many }))).toHaveLength(MAX_FILLS_PER_KIND);
  });

  it("drops blank values", () => {
    expect(bannerFills(profile({ names: [text("   ", 0.9)] }))).toEqual([]);
  });

  // End to end over the committed fixture: a real parse, no network, and the chips a
  // parent would actually be offered for an Edlio page.
  it("offers the school name and mascot from a parsed Edlio page", () => {
    const parsed = parseSchoolPage(EDLIO_PAGE, "https://lincolnhigh.org/");
    const fills = bannerFills(parsed);
    expect(fills.some((f) => f.kind === "name" && /Lincoln High School/i.test(f.value))).toBe(true);
    expect(fills.some((f) => f.kind === "mascot" && /Eagles/i.test(f.value))).toBe(true);
    // Every chip says where it lands, because it changes a panel that may be off-screen.
    for (const f of fills) expect(f.hint.length).toBeGreaterThan(0);
  });
});

// ─── the URL field ───────────────────────────────────────────────────────────

describe("isSubmittableUrl", () => {
  it("accepts what people actually paste", () => {
    expect(isSubmittableUrl("lincolnhigh.org")).toBe(true);
    expect(isSubmittableUrl("https://www.lincolnhigh.org/")).toBe(true);
    expect(isSubmittableUrl("  https://lincolnhigh.org/about?x=1#y  ")).toBe(true);
    expect(isSubmittableUrl("http://lincolnhigh.org:8080/")).toBe(true);
  });

  it("refuses only what is definitely not an address", () => {
    expect(isSubmittableUrl("")).toBe(false);
    expect(isSubmittableUrl("   ")).toBe(false);
    expect(isSubmittableUrl("lincoln high school")).toBe(false);
    expect(isSubmittableUrl("localhost")).toBe(false); // no dot; the guard would refuse it anyway
    expect(isSubmittableUrl(`https://x.org/${"a".repeat(2100)}`)).toBe(false);
  });

  // Deliberately permissive: the server owns validation and has copy for every way it
  // can fail. A disabled button with no explanation has none.
  it("leaves address-shaped refusals to the server, which has words for them", () => {
    expect(isSubmittableUrl("http://10.0.0.5.nip.io/")).toBe(true);
    expect(isSubmittableUrl("ftp://files.school.org/")).toBe(true);
  });
});

// ─── shape drift ─────────────────────────────────────────────────────────────

describe("type wiring", () => {
  // A compile-time assertion wearing a runtime test's clothes. If `prepareCandidate`'s
  // success shape stops satisfying what the panel reads, THIS FILE stops type-checking
  // — which is a better failure than the component silently rendering `undefined`.
  it("keeps the panel's reads assignable from what the route returns", () => {
    const ok: PrepareResult = { ok: true, candidate: candidate(), bytes: 4096 };
    expect(ok.ok && isAddable(ok.candidate)).toBe(true);
  });
});
