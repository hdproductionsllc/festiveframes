import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Every image the marketing page names must exist on disk.
 *
 * The enamel rebuild renamed the FILES (football-patch.png -> football.png)
 * while the pieces kept their old ids so saved designs would still resolve. The
 * landing page hard-codes filenames, so two of the eight badges on the front
 * door of the product 404'd, and nothing caught it: the build passes, the tests
 * passed, and a broken <img> only shows up if a person loads the page.
 *
 * Reads the source rather than importing it, because the page is a server
 * component with `next/font` and CSS imports that a node test cannot evaluate.
 */

const PAGE = path.join(process.cwd(), "src/app/school/page.tsx");
const TILES = path.join(process.cwd(), "public/tiles/high-school");

function badgeSlugs(): string[] {
  const src = readFileSync(PAGE, "utf8");
  const block = src.match(/const BADGES = \[([\s\S]*?)\] as const;/);
  expect(block, "BADGES array not found in the landing page").toBeTruthy();
  return [...block![1].matchAll(/\["([a-z0-9-]+)",/g)].map((m) => m[1]);
}

describe("the marketing page's badge strip", () => {
  const slugs = badgeSlugs();

  it("names a handful of badges", () => {
    expect(slugs.length).toBeGreaterThanOrEqual(6);
  });

  it.each(slugs)("%s.png exists in public/tiles/high-school", (slug) => {
    expect(existsSync(path.join(TILES, `${slug}.png`))).toBe(true);
  });
});
