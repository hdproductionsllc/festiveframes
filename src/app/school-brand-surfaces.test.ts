import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * ONE APP, TWO BRANDS — and the school one kept wearing the other's clothes.
 *
 * festiveframes.co and myschoolframe.com are the same deployment. Next resolves
 * `icon.svg`, `apple-icon.png` and `opengraph-image` per route SEGMENT and falls
 * back to the app ROOT, and the app root is Festive Frames. So /s/<school> — the
 * page a parent reaches from a QR code in the bleachers, and the link a booster
 * president forwards to a board — served the Festive Frames star as its favicon
 * and unfurled as a blue "FESTIVE FRAMES · Custom License Plate Frames" sticker.
 * `og:site_name` was the Festive Frames brand entity on every school page,
 * including the myschoolframe.com landing itself.
 *
 * Nothing about that is visible in a normal review: the pages look right, and the
 * branding is only wrong in the tab strip and in somebody else's chat window.
 * Hence a test.
 */

const APP = path.join(process.cwd(), "src/app");

/** Route directories that belong to MySchoolFrame, with the page that owns metadata. */
const SCHOOL_SURFACES = [
  { dir: "school", page: "school/page.tsx", label: "the MySchoolFrame landing" },
  { dir: "s", page: "s/[slug]/page.tsx", label: "a school's own builder" },
  { dir: "s", page: "s/[slug]/raised/page.tsx", label: "a school's fundraiser page" },
  { dir: "lab/school", page: "lab/school/page.tsx", label: "the kitless builder" },
];

/** The nearest ancestor (within src/app, excluding the root) holding `file`. */
function coveredBy(dir: string, file: string): string | null {
  let d = dir;
  while (d && d !== ".") {
    if (existsSync(path.join(APP, d, file))) return path.join(d, file);
    d = path.dirname(d);
  }
  return null;
}

describe("every MySchoolFrame surface carries its own brand", () => {
  it.each(SCHOOL_SURFACES)("$label has a MySchoolFrame favicon, not the root star", ({ dir, label }) => {
    const icon = coveredBy(dir, "icon.svg");
    expect(icon, `${label} falls back to the Festive Frames icon at the app root`).toBeTruthy();
    // ...and it is the school mark, not a copy of the patriotic one.
    const svg = readFileSync(path.join(APP, icon!), "utf8");
    expect(svg, `${label}'s icon is the Festive Frames star`).toContain("MySchoolFrame");
  });

  it.each(SCHOOL_SURFACES)("$label has a touch icon of its own", ({ dir, label }) => {
    expect(coveredBy(dir, "apple-icon.png"), `${label} falls back to the root touch icon`).toBeTruthy();
  });

  it.each(SCHOOL_SURFACES)("$label names MySchoolFrame as the site, not Festive Frames", ({ page, label }) => {
    // og:site_name is the line UNDER the card in every unfurl. The root layout
    // sets the Festive Frames brand entity, which is right for festiveframes.co
    // and wrong on this domain, and it is inherited unless a page says otherwise.
    const src = readFileSync(path.join(APP, page), "utf8");
    expect(src, `${label} inherits siteName from the root layout`).toMatch(
      /siteName:\s*"MySchoolFrame"/,
    );
  });

  it.each(SCHOOL_SURFACES)("$label does not append | Festive Frames to its title", ({ page, label }) => {
    // The root template is `%s | Festive Frames`; only `title: { absolute }` opts
    // out of it.
    const src = readFileSync(path.join(APP, page), "utf8");
    expect(src, `${label} inherits the Festive Frames title template`).toMatch(/title:\s*\{\s*absolute:/);
  });

  it("gives the per-school builder a share card built from the KIT", () => {
    // The landing page has had its own card for a while; the per-school page is
    // the one that is actually shared, and it had none.
    const og = path.join(APP, "s/[slug]/opengraph-image.tsx");
    expect(existsSync(og), "a school's own link still unfurls as Festive Frames").toBe(true);
    const src = readFileSync(og, "utf8");
    expect(src, "the card is not derived from the school's kit").toMatch(/getSchoolKit/);
    expect(src, "the card ignores the school's colour").toMatch(/colors\.frame/);
  });

  it("leaves the FESTIVE FRAMES surfaces alone", () => {
    // The root is the other brand's home and must keep its own identity — this is
    // two brands sharing a deployment, not a rename.
    const root = readFileSync(path.join(APP, "icon.svg"), "utf8");
    expect(root).toContain("Festive Frames");
    expect(existsSync(path.join(APP, "opengraph-image.tsx"))).toBe(true);
  });
});
