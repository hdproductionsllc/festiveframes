import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pilotSchoolKits } from "@/data/school-pilot";

/**
 * scripts/pilot-qr.mjs prints the hand-out QR cards in each pilot school's
 * colours. It is plain node and cannot import the TypeScript kits, so it carries a
 * COPY of their names, mascots and colours — and a copy drifts: the kits were
 * re-measured from each school's own artwork and the cards kept the old guesses.
 * This reads the script's list and holds it to the kits.
 */
const SRC = readFileSync(path.join(process.cwd(), "scripts/pilot-qr.mjs"), "utf8");

const ROW = /\{ slug: "([^"]+)", name: "([^"]+)", mascot: "([^"]+)", frame: "(#[0-9A-Fa-f]{6})", rim: "(#[0-9A-Fa-f]{6})" \}/g;
const rows = [...SRC.matchAll(ROW)].map(([, slug, name, mascot, frame, rim]) => ({ slug, name, mascot, frame, rim }));

describe("the pilot QR cards match the pilot kits", () => {
  it("lists exactly the pilot schools, in pilot order", () => {
    expect(rows.map((r) => r.slug)).toEqual(pilotSchoolKits().map((k) => k.slug));
  });

  it.each(pilotSchoolKits().map((k) => [k.slug, k] as const))("%s: name, mascot and colours", (slug, kit) => {
    const row = rows.find((r) => r.slug === slug)!;
    expect(row.name).toBe(kit.schoolName);
    expect(row.mascot).toBe(kit.mascot);
    expect(row.frame.toUpperCase()).toBe(kit.colors.frame.toUpperCase());
    expect(row.rim.toUpperCase()).toBe((kit.colors.rim ?? "").toUpperCase());
  });
});
