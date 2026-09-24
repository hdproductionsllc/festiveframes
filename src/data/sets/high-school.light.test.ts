import { describe, it, expect } from "vitest";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { highSchoolSet } from "./high-school";
import { IVORY_ENAMEL, LIGHT_ENAMEL_FILES, NAVY_ENAMEL } from "./high-school-light.generated";
import { badgeArtworkUrl, enamelVanishes, contrastRatio, TILE_BG } from "@/lib/utils/tile-theme";
import { allSchoolKits } from "@/data/school-kits";

/**
 * Navy enamel on a navy/black/purple school field read as a gold line sketch
 * (Eureka's violin, Lafayette's wrestling boots, the crest on Marquette). The
 * library's ivory twins are the fix; these pin that the data, the files and the
 * one switch rule agree.
 */
const PUBLIC = join(process.cwd(), "public");
const LIGHT_DIR = join(PUBLIC, "tiles/high-school/light");

describe("ivory-enamel twins", () => {
  it("the generated list is exactly the twins on disk", () => {
    const onDisk = readdirSync(LIGHT_DIR).filter((f) => f.endsWith(".png")).map((f) => f.replace(/\.png$/, "")).sort();
    expect([...LIGHT_ENAMEL_FILES].sort()).toEqual(onDisk);
  });

  it("every piece whose art has a twin carries it, and it exists", () => {
    const withTwin = highSchoolSet.pieces.filter((p) => p.darkFieldArtworkUrl);
    expect(withTwin.length).toBeGreaterThan(30);
    for (const p of withTwin) expect(existsSync(join(PUBLIC, p.darkFieldArtworkUrl!)), p.id).toBe(true);
    // The crest — the stand-in for every school without marks — is one of them.
    expect(highSchoolSet.pieces.find((p) => p.id === "hs:crest")?.darkFieldArtworkUrl).toMatch(/light\/crest\.png$/);
  });

  it("keeps navy that IS the drawing (the soccer ball's panels)", () => {
    expect(highSchoolSet.pieces.find((p) => p.id === "hs:soccer-patch")?.darkFieldArtworkUrl).toBeUndefined();
  });
});

describe("enamelVanishes / badgeArtworkUrl", () => {
  const crest = highSchoolSet.pieces.find((p) => p.id === "hs:crest")!;

  it("switches on the dark fields the review named, and on stock navy", () => {
    for (const field of ["#0D293F", "#231F20", "#462E8D", TILE_BG.navy]) {
      expect(enamelVanishes(field), field).toBe(true);
      expect(badgeArtworkUrl(crest, field)).toBe(crest.darkFieldArtworkUrl);
    }
  });

  it("puts ivory, not navy, on Parkway Central red and Ladue royal", () => {
    // Navy "read" on both at 2.1:1, but it is not a colour either school uses and
    // on Central's red the podium and crest read as dark blobs. Ivory is 6:1.
    for (const field of ["#AB1E38", "#00599C"]) {
      expect(enamelVanishes(field), field).toBe(true);
      expect(badgeArtworkUrl(crest, field)).toBe(crest.darkFieldArtworkUrl);
    }
  });

  it("keeps the navy original on light fields, where it is the stronger mark", () => {
    for (const field of ["#FFFFFF", "#5199CD", "#E87722"]) {
      expect(enamelVanishes(field), field).toBe(false);
      expect(badgeArtworkUrl(crest, field)).toBe(crest.artworkUrl);
    }
  });

  it("never swaps a piece that has no twin", () => {
    const ball = highSchoolSet.pieces.find((p) => p.id === "hs:soccer-patch")!;
    expect(badgeArtworkUrl(ball, "#0D293F")).toBe(ball.artworkUrl);
  });

  it("is a comparison of the two enamels, not a list of schools", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#123456", "#123456")).toBeCloseTo(1, 5);
    // Every authored school clearly prefers one enamel, so a colour correction of
    // a few units does not flip its whole frame's enamel.
    for (const kit of allSchoolKits()) {
      const field = kit.colors.tileField ?? kit.colors.frame;
      const r = contrastRatio(IVORY_ENAMEL, field) / contrastRatio(NAVY_ENAMEL, field);
      expect(Math.abs(Math.log(r)), `${kit.slug} sits on the line (${r.toFixed(2)})`).toBeGreaterThan(0.2);
    }
  });
});
