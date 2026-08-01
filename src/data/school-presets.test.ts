import { describe, it, expect } from "vitest";
import { SCHOOL_PRESETS, ACTIVITY, presetsFor, presetTiles, getPreset } from "./school-presets";
import { getPiece } from "@/data/sets";
import { buildGrid } from "@/lib/utils/slot-generator";
import { SCHOOL_FRAME_CONFIG } from "@/lib/constants/frame";

/**
 * The one-tap path, which most people will use and which did not exist: the only
 * "preset" was an invisible #preset= deep link while the first-run copy promised
 * a design you could pick.
 *
 * A preset that names a withdrawn badge or a slot that is not on the frame comes
 * up empty, and it does so on the flow with the least patient audience.
 */

const SLOT_IDS = new Set(buildGrid(SCHOOL_FRAME_CONFIG).slots.map((s) => s.id));

describe("the school presets", () => {
  it("offers three, with the graduate first", () => {
    expect(SCHOOL_PRESETS.map((p) => p.id)).toEqual(["graduate", "athlete", "spirit"]);
  });

  it.each(SCHOOL_PRESETS)("$id places only badges that exist", (preset) => {
    for (const [, pieceId] of preset.layout) {
      if (pieceId === ACTIVITY) continue;
      expect(getPiece(pieceId), `${preset.id} references unknown piece ${pieceId}`).toBeTruthy();
    }
    expect(getPiece(preset.fallbackActivity)).toBeTruthy();
  });

  it.each(SCHOOL_PRESETS)("$id targets only slots the frame actually has", (preset) => {
    for (const [slot] of preset.layout) {
      expect(SLOT_IDS.has(slot), `${preset.id} targets unknown slot ${slot}`).toBe(true);
    }
  });

  it.each(SCHOOL_PRESETS)("$id fills the frame symmetrically", (preset) => {
    // An asymmetric frame reads as unfinished, which defeats the point of a
    // one-tap finished design.
    expect(preset.layout.length).toBe(8);
    expect(new Set(preset.layout.map(([s]) => s)).size).toBe(8);
  });

  it("resolves ACTIVITY to the parent's choice, and to a real badge without one", () => {
    const grad = getPreset("graduate")!;
    const withChoice = presetTiles(grad, "hs:soccer-patch");
    expect(withChoice.some(([, p]) => p === "hs:soccer-patch")).toBe(true);
    expect(withChoice.every(([, p]) => p !== ACTIVITY)).toBe(true);

    const without = presetTiles(grad, null);
    expect(without.every(([, p]) => p !== ACTIVITY)).toBe(true);
    for (const [, p] of without) expect(getPiece(p)).toBeTruthy();
  });

  it("owns the badges but NOT the words — the buyer owns the tagline", () => {
    // Applying "Graduate" as a grandparent used to produce "CLASS OF 2028",
    // because the preset overrode the one line that buyer is paying for.
    for (const preset of SCHOOL_PRESETS) {
      expect(preset).not.toHaveProperty("tagline");
    }
  });

  it("leads a grandparent with the graduate design", () => {
    // The commercial point: a grandparent is buying a graduation gift, and is the
    // buyer most likely to be purchasing a SECOND frame for the same student.
    expect(presetsFor("grandparent")[0].id).toBe("graduate");
  });

  it("leads an alum with school spirit, not a class-of banner for a kid", () => {
    expect(presetsFor("alum")[0].id).toBe("spirit");
  });

  it("always offers every preset, whoever is buying", () => {
    for (const buyer of ["parent", "self", "grandparent", "alum", "staff"] as const) {
      expect(presetsFor(buyer)).toHaveLength(SCHOOL_PRESETS.length);
    }
  });
});
