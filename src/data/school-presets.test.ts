import { describe, it, expect } from "vitest";
import { SCHOOL_PRESETS, ACTIVITY, MASCOT, MASCOT_ALT, presetsFor, presetTiles, getPreset } from "./school-presets";
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
    expect(SCHOOL_PRESETS.map((p) => p.id)).toEqual(["graduate", "athlete", "school"]);
  });

  it.each(SCHOOL_PRESETS)("$id places only badges that exist", (preset) => {
    for (const [, pieceId] of preset.layout) {
      if (pieceId === ACTIVITY || pieceId === MASCOT || pieceId === MASCOT_ALT) continue;
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

  it("puts the SCHOOL in the graduate corners, not another mortarboard", () => {
    // The corners used to be a torch, which made the graduate frame four kinds of
    // the same idea. They are the first thing read in a car park and belong to
    // the school.
    const grad = getPreset("graduate")!;
    const corners = ["frame:wing-left-0", "frame:top-11", "frame:wing-left-6", "frame:bottom-11"];
    for (const slot of corners) {
      expect(grad.layout.find(([s]) => s === slot)?.[1]).toBe(MASCOT);
    }
  });

  it("never draws the mortarboard twice in the graduate frame", () => {
    // hs:diploma-cap draws a cap AND a scroll in one badge, so pairing it with
    // hs:grad-cap put the cap on the frame twice. One cap, one standalone
    // diploma.
    const grad = getPreset("graduate")!;
    const pieces = grad.layout.map(([, p]) => p);
    expect(pieces).not.toContain("hs:diploma-cap");
    expect(pieces).toContain("hs:grad-cap");
    expect(pieces).toContain("hs:diploma-tall");
  });

  it("resolves MASCOT to the school's own badge, and to a crest without one", () => {
    const grad = getPreset("graduate")!;
    const withMascot = presetTiles(grad, null, "mark:sluh-jr-bills:billiken");
    expect(withMascot.some(([, p]) => p === "mark:sluh-jr-bills:billiken")).toBe(true);
    expect(withMascot.every(([, p]) => p !== MASCOT)).toBe(true);

    // A school we have no artwork for still gets a school SHAPE, not a torch.
    const without = presetTiles(grad, null, null);
    expect(without.some(([, p]) => p === "hs:crest")).toBe(true);
    expect(without.every(([, p]) => p !== MASCOT)).toBe(true);
    for (const [, p] of without) expect(getPiece(p)).toBeTruthy();
  });

  it("resolves ACTIVITY to the parent's choice, and to a real badge without one", () => {
    const grad = getPreset("athlete")!;
    const withChoice = presetTiles(grad, "hs:soccer-patch");
    expect(withChoice.some(([, p]) => p === "hs:soccer-patch")).toBe(true);
    expect(withChoice.every(([, p]) => p !== ACTIVITY)).toBe(true);

    const without = presetTiles(grad, null);
    expect(without.every(([, p]) => p !== ACTIVITY)).toBe(true);
    for (const [, p] of without) expect(getPiece(p)).toBeTruthy();
  });

  it("makes the athlete design ASK for the sport rather than guess one", () => {
    // It used to fall back to a stock trophy, which is the generic result the
    // preset exists to avoid — and a claim about a season rather than a fact
    // about a student.
    const athlete = getPreset("athlete")!;
    expect(athlete.needsActivity).toBe(true);
    expect(athlete.wantsNumber).toBe(true);
    // ...and it no longer pads the middle rows with hardware nobody earned.
    const pieces = athlete.layout.map(([, p]) => p);
    expect(pieces).not.toContain("hs:medal");
    expect(pieces.filter((p) => p === ACTIVITY)).toHaveLength(4);
    expect(pieces.filter((p) => p === MASCOT)).toHaveLength(4);
  });

  // ── The two rules that separate a design from a mistake ───────────────────
  //
  // The frame is a column of four badges down each side, mirrored. Rule 1 is
  // about what touches; rule 2 is about what is true.

  const COLUMNS = [
    ["frame:wing-left-0", "frame:wing-left-2", "frame:wing-left-4", "frame:wing-left-6"],
    ["frame:top-11", "frame:right-1", "frame:right-3", "frame:bottom-11"],
  ];

  it.each(SCHOOL_PRESETS)("$id never puts the same badge in adjacent positions", (preset) => {
    // "Their sport" ran sport, mascot, mascot, sport, so two Billikens sat
    // directly on top of each other and read as the same badge placed twice by
    // accident. Mirrored across the plate is symmetry; touching is a duplicate.
    const at = (slot: string) => preset.layout.find(([s]) => s === slot)?.[1];
    for (const column of COLUMNS) {
      const run = column.map(at);
      for (let i = 1; i < run.length; i++) {
        expect(run[i], `${preset.id} repeats ${run[i]} at position ${i}`).not.toBe(run[i - 1]);
      }
    }
  });

  it.each(SCHOOL_PRESETS)("$id places nothing nobody earned", (preset) => {
    // A stock trophy, medal, laurel or torch is decoration standing in for a fact
    // we never collected — a claim about a season rather than something about
    // this student. Every badge must be the school, the occasion, or what they do.
    const FILLER = ["hs:trophy", "hs:medal", "hs:laurel", "hs:torch", "hs:honor-star"];
    for (const [, piece] of preset.layout) {
      expect(FILLER, `${preset.id} places ${piece} as filler`).not.toContain(piece);
    }
  });

  it.each(SCHOOL_PRESETS)("$id keeps the crest out of the bottom corner", (preset) => {
    // The bottom banner wears the school's crest either side of the name. A crest
    // badge in the bottom corner puts four of the same mark in a row across the
    // bottom of the frame — the stacked-mascot defect, one step further down.
    for (const slot of ["frame:wing-left-6", "frame:bottom-11"]) {
      expect(preset.layout.find(([s]) => s === slot)?.[1], `${preset.id} ends on the crest`)
        .not.toBe(MASCOT_ALT);
    }
  });

  it("resolves the alternating school design to the school's OWN two marks", () => {
    const school = getPreset("school")!;
    const tiles = presetTiles(school, null, "mark:sluh-jr-bills:billiken", "mark:sluh-jr-bills:shield");
    const left = ["frame:wing-left-0", "frame:wing-left-2", "frame:wing-left-4", "frame:wing-left-6"]
      .map((slot) => tiles.find(([s]) => s === slot)![1]);
    // Crest, mascot, crest, mascot — ending on the mascot so the bottom corner
    // does not repeat the crest the banner beside it already carries.
    expect(left).toEqual([
      "mark:sluh-jr-bills:shield",
      "mark:sluh-jr-bills:billiken",
      "mark:sluh-jr-bills:shield",
      "mark:sluh-jr-bills:billiken",
    ]);
  });

  it("never alternates a mark against ITSELF when a school has only one", () => {
    // The fallback has to differ from the mascot, or the no-repeat rule is broken
    // at resolve time by a school with a single badge.
    for (const alt of [null, undefined, "mark:sluh-jr-bills:billiken"]) {
      const tiles = presetTiles(getPreset("school")!, null, "mark:sluh-jr-bills:billiken", alt);
      const left = ["frame:wing-left-0", "frame:wing-left-2", "frame:wing-left-4", "frame:wing-left-6"]
        .map((slot) => tiles.find(([s]) => s === slot)![1]);
      for (let i = 1; i < left.length; i++) expect(left[i]).not.toBe(left[i - 1]);
      for (const [, p] of tiles) expect(getPiece(p)).toBeTruthy();
    }
    // ...including the kitless case, where the mascot IS the generic crest.
    const kitless = presetTiles(getPreset("school")!, null, null, null);
    const leftK = ["frame:wing-left-0", "frame:wing-left-2", "frame:wing-left-4", "frame:wing-left-6"]
      .map((slot) => kitless.find(([s]) => s === slot)![1]);
    for (let i = 1; i < leftK.length; i++) expect(leftK[i]).not.toBe(leftK[i - 1]);
  });

  it("asks the school design for NOTHING — no sport, no year, no name", () => {
    // It is the only one an alum, a teacher or a grandparent can use with an
    // empty intake, which is the gap the other two leave.
    const school = getPreset("school")!;
    expect(school.needsActivity).toBeFalsy();
    expect(school.wantsNumber).toBeFalsy();
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

  it("leads an alum and a teacher with the school, not a class-of banner for a kid", () => {
    expect(presetsFor("alum")[0].id).toBe("school");
    expect(presetsFor("staff")[0].id).toBe("school");
  });

  it("always offers every preset, whoever is buying", () => {
    for (const buyer of ["parent", "self", "grandparent", "alum", "staff"] as const) {
      expect(presetsFor(buyer)).toHaveLength(SCHOOL_PRESETS.length);
    }
  });
});
