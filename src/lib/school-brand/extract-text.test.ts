import { describe, it, expect } from "vitest";
import { scanPage } from "./html-scan";
import {
  extractColors,
  extractMascots,
  extractMottos,
  extractSchoolNames,
  MASCOT_LEXICON,
} from "./extract-text";
import { EDLIO_PAGE } from "./__fixtures__/edlio-page";
import { WORDPRESS_PAGE } from "./__fixtures__/wordpress-page";
import { FAVICON_ONLY_PAGE } from "./__fixtures__/favicon-only-page";
import { VENDOR_MARK_PAGE } from "./__fixtures__/vendor-mark-page";

const edlio = scanPage(EDLIO_PAGE, "https://www.lincolnhs.org/");
const wp = scanPage(WORDPRESS_PAGE, "https://westbrookms.org/");
const bare = scanPage(FAVICON_ONLY_PAGE, "https://riverbendcharter.org/");
const finalsite = scanPage(VENDOR_MARK_PAGE, "https://marshallhs.org/");

describe("extractSchoolNames", () => {
  it("prefers JSON-LD, which the school typed on purpose", () => {
    const names = extractSchoolNames(wp);
    expect(names[0]).toMatchObject({ value: "Westbrook Middle School", source: "json-ld" });
    expect(names[0].confidence).toBeGreaterThan(0.9);
  });

  it("falls to og:site_name when there is no JSON-LD", () => {
    expect(extractSchoolNames(edlio)[0]).toMatchObject({
      value: "Lincoln High School",
      source: "og:site_name",
    });
  });

  it("scores <title> segments instead of assuming which side the site is on", () => {
    // Edlio writes "School - Home"; WordPress writes "Home - School". Both land on
    // the school because every segment is scored and the furniture scores zero.
    expect(extractSchoolNames(bare)[0].value).toBe("Riverbend Charter Academy");
    for (const n of extractSchoolNames(wp)) expect(n.value).not.toMatch(/^Home$/);
    for (const n of extractSchoolNames(edlio)) expect(n.value).not.toMatch(/^Home$/);
  });

  it("keeps the district as a lower-ranked guess rather than discarding it", () => {
    // "Marshall High School | Marshall Unified School District" — a confident single
    // answer here would be a coin flip. Both are offered, school first.
    const names = extractSchoolNames(finalsite).map((n) => n.value);
    expect(names[0]).toBe("Marshall High School");
    expect(names).toContain("Marshall Unified School District");
  });

  it("never offers the CMS vendor as the school's name", () => {
    // The footer credit is <img alt="Edlio">, and the logo-alt rule reads exactly
    // that shape of alt text. It offered "Edlio" at 0.40 the first time this ran.
    expect(extractSchoolNames(edlio).map((n) => n.value)).not.toContain("Edlio");
  });

  it("always returns something, even from a nearly empty page", () => {
    const nothing = scanPage("<html><body><p>hello</p></body></html>", "https://oakridgeprep.org/");
    const names = extractSchoolNames(nothing);
    expect(names.length).toBeGreaterThan(0);
    expect(names[0].source).toBe("hostname");
    // …and says out loud that it is a guess, so the UI does not present it as fact.
    expect(names[0].confidence).toBeLessThan(0.25);
  });

  it("returns a RANKED list rather than one answer", () => {
    const names = extractSchoolNames(finalsite);
    expect(names.length).toBeGreaterThan(1);
    for (let i = 1; i < names.length; i++) {
      expect(names[i - 1].confidence).toBeGreaterThanOrEqual(names[i].confidence);
    }
  });
});

describe("extractMottos", () => {
  it("takes an element that names itself the tagline first", () => {
    expect(extractMottos(edlio)[0]).toMatchObject({
      value: "Excellence in every classroom, every day.",
    });
    expect(extractMottos(bare)[0].value).toBe("Small school, big horizons.");
  });

  it("prefers the site-description over the meta description's first sentence", () => {
    const mottos = extractMottos(wp);
    expect(mottos[0].value).toBe("Curiosity, courage, community.");
    expect(mottos.length).toBeGreaterThan(1); // the meta sentence survives, ranked lower
  });

  it("rejects the things a CMS puts in <meta description> when nobody set one", () => {
    const junk = scanPage(
      `<html><head><meta name="description" content="Enable JavaScript and cookies to continue. Call 555-123-4567."></head><body></body></html>`,
      "https://x.org/",
    );
    expect(extractMottos(junk)).toEqual([]);
  });

  it("rejects a mission statement that could never fit a banner", () => {
    const longform = scanPage(
      `<html><body><p class="tagline">We are a community of learners committed to the academic, social and emotional growth of every child entrusted to our care, in partnership with families and the wider neighbourhood.</p></body></html>`,
      "https://x.org/",
    );
    expect(extractMottos(longform)).toEqual([]);
  });
});

describe("extractMascots", () => {
  it("trusts the school telling you: 'Home of the Eagles'", () => {
    const m = extractMascots(edlio);
    expect(m[0]).toMatchObject({ value: "Eagles", source: "phrase:home-of-the" });
    expect(m[0].confidence).toBeGreaterThan(0.9);
  });

  it("reads 'Go Wildcats!' — capitalised, which is how the sentence is written", () => {
    // A case-sensitive `\bgo` silently missed this and let the weaker lexicon rule
    // answer instead; making the whole pattern /i then matched "go home." and
    // offered "Home" as a mascot.
    expect(extractMascots(wp)[0]).toMatchObject({ value: "Wildcats", source: "phrase:go-x" });
    const goHome = scanPage(`<html><body><p>Please go home.</p></body></html>`, "https://x.org/");
    expect(extractMascots(goHome).map((c) => c.value)).not.toContain("Home");
  });

  it("finds a mascot no lexicon will ever contain, via the phrase", () => {
    const odd = scanPage(
      `<html><body><p>Welcome! Home of the Nanooks since 1932.</p></body></html>`,
      "https://x.org/",
    );
    expect(extractMascots(odd)[0].value).toBe("Nanooks");
  });

  it("keeps a two-word mascot whole, and stops at one word when it should", () => {
    const cases: [string, string][] = [
      ["Home of the Golden Eagles.", "Golden Eagles"],
      ["Home of the Nanooks since 1932.", "Nanooks"],
      ["Home of the Eagles Marching Band.", "Eagles"],
      ["Home of the Fighting Artichokes!", "Artichokes"],
    ];
    for (const [sentence, expected] of cases) {
      const s = scanPage(`<html><body><p>${sentence}</p></body></html>`, "https://x.org/");
      expect(extractMascots(s)[0].value).toBe(expected);
    }
  });

  it("separates a mascot from a bird that happened to be in a news item", () => {
    const news = scanPage(
      `<html><body><p>Two eagles were spotted over the wetlands on Tuesday.</p></body></html>`,
      "https://x.org/",
    );
    const passing = extractMascots(news);
    expect(passing[0].value).toBe("Eagles");
    // Offered, but at a confidence that says "probably a coincidence" — far below
    // the 0.9+ that "Home of the Eagles" earns.
    expect(passing[0].confidence).toBeLessThan(0.4);
  });

  it("merges the same mascot found three ways into one candidate", () => {
    const values = extractMascots(finalsite).map((c) => c.value);
    expect(values.filter((v) => v === "Mustangs").length).toBe(1);
  });

  it("keeps the lexicon free of the retired Native-imagery mascots", () => {
    // A lexicon is the wrong place to make that call automatically; the "Home of
    // the…" phrase rule still surfaces one a school actually typed.
    for (const banned of ["Braves", "Chiefs", "Indians", "Redskins", "Squaws"]) {
      expect(MASCOT_LEXICON).not.toContain(banned);
    }
    expect(MASCOT_LEXICON.length).toBeGreaterThan(80);
  });
});

describe("extractColors", () => {
  it("reads the palette out of the :root block Edlio hides inside <main>", () => {
    const colors = extractColors(edlio);
    expect(colors[0]).toMatchObject({ hex: "#0B3D91", role: "primary" });
    expect(colors[1]).toMatchObject({ hex: "#C5A253", role: "secondary" });
  });

  it("reads the WordPress block-theme palette variables", () => {
    const colors = extractColors(wp);
    expect(colors.slice(0, 2).map((c) => c.hex)).toEqual(["#7A0019", "#FFCC33"]);
  });

  it("marks neutrals and sinks them below the real brand colours", () => {
    const colors = extractColors(wp);
    const white = colors.find((c) => c.hex === "#FFFFFF");
    expect(white?.neutral).toBe(true);
    // Declared as `--wp--preset--color--base`, so it scores 0.9 before the neutral
    // penalty — and still has to lose to the maroon.
    expect(white!.confidence).toBeLessThan(colors[0].confidence);
  });

  it("keeps a black-and-gold school's black rather than dropping neutrals", () => {
    const bg = scanPage(
      `<html><head><style>:root{--school-primary:#000000;--school-secondary:#FFC72C}</style></head><body></body></html>`,
      "https://x.org/",
    );
    expect(extractColors(bg).map((c) => c.hex)).toContain("#000000");
  });

  it("falls back to inline chrome styles when there is no stylesheet at all", () => {
    expect(extractColors(bare)).toEqual([
      expect.objectContaining({ hex: "#1B4D3E", role: "primary", source: "inline:chrome-background" }),
    ]);
  });

  it("assigns roles by rank, not by what the variable calls itself", () => {
    // `--color-primary` is very often the link blue rather than the crest colour, so
    // trusting the NAME would hand the frame a confident wrong field colour.
    const colors = extractColors(finalsite);
    expect(colors.map((c) => c.role).slice(0, 2)).toEqual(["primary", "secondary"]);
    expect(colors[0].hex).toBe("#1D3557");
  });

  it("never returns a var() or a keyword as a colour", () => {
    for (const scan of [edlio, wp, finalsite, bare]) {
      for (const c of extractColors(scan)) expect(c.hex).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
