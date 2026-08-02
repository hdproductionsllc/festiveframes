import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";

/**
 * The faces the PRODUCT is set in must come from our own origin.
 *
 * This has now been reported twice as "the lettering looks fat on mobile", and
 * both times the CSS was correct and the font simply had not arrived: the stack
 * falls through to Times or Arial, which are heavier and wider than the
 * collegiate slab and the condensed athletic face they stand in for, and phones
 * lose that race far more often than desktops do. Graduate was pulled out and
 * self-hosted; Oswald — the tagline on every school banner — was left behind in
 * a seven-deep chain of Google @imports.
 *
 * A `@font-face` naming a family the banners use, pointing anywhere but our own
 * origin, is the bug. So is a missing file behind one that does.
 */

const CSS = path.join(process.cwd(), "src/app/self-hosted-fonts.css");
const src = readFileSync(CSS, "utf8");

/** Every family this file declares, with ALL the urls it offers for it. */
function faces(): Array<{ family: string; urls: string[] }> {
  const out: Array<{ family: string; urls: string[] }> = [];
  for (const block of src.split("@font-face").slice(1)) {
    const family = /font-family:\s*['"]([^'"]+)['"]/.exec(block)?.[1];
    // A face may list several formats — woff2 first, ttf behind it — and only
    // one of them has to be there.
    const urls = [...block.matchAll(/url\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]);
    if (family && urls.length) out.push({ family, urls });
  }
  return out;
}

describe("the faces the product is set in", () => {
  const declared = faces();

  it("covers the banner headline, the banner tagline and the text bars", () => {
    const families = declared.map((f) => f.family);
    for (const need of ["Graduate", "Oswald", "Stars and Stripes"]) {
      expect(families, `${need} is not self-hosted`).toContain(need);
    }
  });

  it("serves every one of them from our own origin", () => {
    for (const { family, urls } of declared) {
      for (const url of urls) {
        expect(url.startsWith("/"), `${family} is loaded from ${url}`).toBe(true);
        expect(url).not.toMatch(/^\/\//); // protocol-relative is still somebody else
      }
    }
  });

  it("has a real file behind every one of them", () => {
    for (const { family, urls } of declared) {
      const present = urls
        .map((u) => path.join(process.cwd(), "public", u.replace(/^\//, "")))
        .filter((f) => existsSync(f) && statSync(f).size > 1000);
      expect(present.length, `${family} lists ${urls.join(", ")} and none of them exist`).toBeGreaterThan(0);
    }
  });

  it("declares no remote @import of its own", () => {
    // The whole point is that this file resolves without the network.
    expect(src).not.toMatch(/@import\s+url\(['"]?https?:/);
  });
});

describe("the SCHOOL pages do not block paint on a third party", () => {
  const schoolCss = readFileSync(path.join(process.cwd(), "src/app/school-fonts.css"), "utf8");
  const skin = readFileSync(path.join(process.cwd(), "src/app/build/build-skin.css"), "utf8");

  it("loads no remote stylesheet from the school font sheet", () => {
    expect(schoolCss).not.toMatch(/@import\s+url\(['"]?https?:/);
  });

  it("loads no remote stylesheet from the builder skin either", () => {
    // The skin is worn by every school page, so an @import at the top of it is
    // render-blocking on all of them — which is what Nunito and Fredoka were.
    expect(skin).not.toMatch(/@import\s+url\(['"]?https?:/);
  });

  it("keeps the school pages off builder-fonts.css, which still has the chain", () => {
    for (const page of [
      "src/app/s/[slug]/page.tsx",
      "src/app/lab/school/page.tsx",
      "src/app/lab/slim/page.tsx",
    ]) {
      const s = readFileSync(path.join(process.cwd(), page), "utf8");
      expect(s, `${page} still imports the blocking font chain`).not.toMatch(/builder-fonts\.css/);
      expect(s).toMatch(/school-fonts\.css/);
    }
  });

  it("still defers the picker's faces on every school page", () => {
    // Checked through the RENDER chain rather than per file: /s/<slug> hands its
    // body to SchoolKitPage (so the slim fork can serve the same page on a
    // different geometry), and the deferred loader went with it. A per-file grep
    // would have called that a regression, and a per-file grep that only knew
    // about the old shape would have stopped checking anything at all.
    const chain = [
      "src/app/lab/school/page.tsx",
      "src/app/lab/slim/page.tsx",
      "src/components/designer/SchoolKitPage.tsx",
    ].map((f) => readFileSync(path.join(process.cwd(), f), "utf8"));
    for (const s of chain) {
      expect(s, "a school page stopped deferring the picker's faces").toMatch(/BuilderFontsDeferred/);
    }
    // …and the kit route reaches it through the shared page body.
    const kitRoute = readFileSync(path.join(process.cwd(), "src/app/s/[slug]/page.tsx"), "utf8");
    expect(kitRoute).toMatch(/SchoolKitPage/);
  });
});
