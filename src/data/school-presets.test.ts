import { describe, it, expect } from "vitest";
import {
  SCHOOL_PRESETS,
  SLIM_PRESETS,
  FLUSH_PRESETS,
  ACTIVITY,
  MASCOT,
  MASCOT_ALT,
  presetsFor,
  presetTiles,
  getPreset,
  sideColumn,
  layPreset,
  presetBlurb,
} from "./school-presets";
import { pilotSchoolKits } from "@/data/school-pilot";
import { kitMarkIds } from "@/data/sets/school-marks";
import { SCHOOL_SHIPPING_VARIANT, schoolVariant } from "@/data/school-variants";
import { createDesignStore } from "@/stores/design-store";
import { getPiece } from "@/data/sets";
import { buildGrid } from "@/lib/utils/slot-generator";
import { badgeRule, canPlace, occupiedCoords, snappetInches, squareSpansAt, tileSpan } from "@/lib/utils/snappet";
import { SCHOOL_FLUSH_FRAME_CONFIG, SCHOOL_FRAME_CONFIG, SCHOOL_SLIM_FRAME_CONFIG } from "@/lib/constants/frame";
import type { FrameConfig } from "@/lib/types";
import type { SchoolPreset } from "./school-presets";

/**
 * A preset's badges down each side, top to bottom.
 *
 * Read off the GRID, never off a list of slot ids. The ids a preset resolves to
 * move whenever the frame's geometry does — the 12 x 6 window change turned
 * `frame:top-11` from the top-right corner into an ordinary rail cell over the
 * plate — and a test that spells them out simply stops testing anything at that
 * point, without failing to say so.
 */
function columnsOf(preset: SchoolPreset, config: FrameConfig): { left: string[]; right: string[] } {
  const grid = buildGrid(config);
  const rows = { left: [] as Array<[number, string]>, right: [] as Array<[number, string]> };
  for (const [slot, piece] of preset.layout) {
    const anchor = grid.coordOf(slot);
    if (!anchor) continue;
    const panel = grid.panelAt(anchor.row, anchor.col);
    if (panel === "wing-left") rows.left.push([anchor.row, piece]);
    else if (panel === "wing-right") rows.right.push([anchor.row, piece]);
  }
  const order = (xs: Array<[number, string]>) => xs.sort((a, b) => a[0] - b[0]).map(([, p]) => p);
  return { left: order(rows.left), right: order(rows.right) };
}

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
    //
    // The corner BADGES are the first and last of each side column. Under the
    // square rule the live frame's nine-row column holds four 2x2 squares and its
    // bottom corner cell is frame body (it used to be absorbed into a 2x3), so
    // the corner badge is asked of the column, not of a grid corner cell.
    const grad = getPreset("graduate")!;
    const cols = columnsOf(grad, SCHOOL_FRAME_CONFIG);
    for (const run of [cols.left, cols.right]) {
      expect(run[0], "the top corner badge").toBe(MASCOT);
      expect(run[run.length - 1], "the bottom corner badge").toBe(MASCOT);
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

  it.each(SCHOOL_PRESETS)("$id never puts the same badge in adjacent positions", (preset) => {
    // "Their sport" ran sport, mascot, mascot, sport, so two Billikens sat
    // directly on top of each other and read as the same badge placed twice by
    // accident. Mirrored across the plate is symmetry; touching is a duplicate.
    const cols = columnsOf(preset, SCHOOL_FRAME_CONFIG);
    for (const run of [cols.left, cols.right]) {
      expect(run.length, `${preset.id} places nothing down one side`).toBeGreaterThan(1);
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
    const cols = columnsOf(preset, SCHOOL_FRAME_CONFIG);
    for (const run of [cols.left, cols.right]) {
      expect(run[run.length - 1], `${preset.id} ends on the crest`).not.toBe(MASCOT_ALT);
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

  it("replaces only a STAND-IN with the chosen activity, never the school's own second mark", () => {
    const school = getPreset("school")!;
    const mascot = "mark:sluh-jr-bills:billiken";
    const own = presetTiles(school, "hs:soccer-patch", mascot, "mark:sluh-jr-bills:shield").map(([, p]) => p);
    expect(own).toContain("mark:sluh-jr-bills:shield");
    expect(own).not.toContain("hs:soccer-patch");
    // One-mark school: the signature stand-in gives way to what the parent chose...
    const standIn = presetTiles(school, "hs:soccer-patch", mascot, "hs:track").map(([, p]) => p);
    expect(standIn).not.toContain("hs:track");
    expect(standIn).toContain("hs:soccer-patch");
    // ...and stays when nothing was chosen (the owner's 2026-09-24 call).
    expect(presetTiles(school, null, mascot, "hs:track").map(([, p]) => p)).toContain("hs:track");
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

// ─── The layouts are DERIVED, so assert what derivation has to guarantee ─────

describe("every preset covers its side panels exactly", () => {
  const cases = [
    { label: "live frame", presets: SCHOOL_PRESETS, config: SCHOOL_FRAME_CONFIG },
    { label: "slim fork", presets: SLIM_PRESETS, config: SCHOOL_SLIM_FRAME_CONFIG },
    { label: "flush fork", presets: FLUSH_PRESETS, config: SCHOOL_FLUSH_FRAME_CONFIG },
  ];

  it.each(cases)("$label: no badge leaves its panel or reaches the plate", ({ presets, config }) => {
    const grid = buildGrid(config);
    for (const preset of presets) {
      for (const [slot, , span] of preset.layout) {
        const anchor = grid.coordOf(slot);
        expect(anchor, `${preset.id}: ${slot} is not a cell of this frame`).not.toBeNull();
        const panel = grid.panelAt(anchor!.row, anchor!.col);
        expect(panel, `${preset.id}: ${slot} anchors outside the side panels`).toMatch(/^wing-/);
        for (const c of occupiedCoords(anchor!, tileSpan({ span }))) {
          expect(grid.isPlate(c.row, c.col), `${preset.id}: ${slot} covers the plate`).toBe(false);
          expect(grid.panelAt(c.row, c.col), `${preset.id}: ${slot} straddles panels`).toBe(panel);
        }
      }
    }
  });

  it.each(cases)("$label: fills EVERY badge position the frame declares", ({ presets, config }) => {
    // A missing badge reads as a notch in the frame. The positions are the
    // frame's: the square rule's squares down each side column. A side cell no
    // square can cover (the live frame's ninth row, once a 2x3's tail) is frame
    // body, and the only cell allowed to stay bare.
    const grid = buildGrid(config);
    const empty = { grid, slots: {}, sections: {}, barCovered: new Set<string>(), badges: badgeRule(config) };
    for (const preset of presets) {
      const covered = new Set<string>();
      for (const [slot, , span] of preset.layout) {
        const anchor = grid.coordOf(slot)!;
        for (const c of occupiedCoords(anchor, tileSpan({ span }))) covered.add(`${c.row}:${c.col}`);
      }
      const coverable = new Set<string>();
      for (const side of ["wing-left", "wing-right"] as const) {
        const column = sideColumn(config, side);
        expect(column.length, `${side} declares no badges`).toBeGreaterThan(0);
        for (const { slot, span } of column) {
          for (const c of occupiedCoords(grid.coordOf(slot)!, span)) coverable.add(`${c.row}:${c.col}`);
        }
      }
      for (const key of coverable) {
        expect(covered.has(key), `${preset.id}: badge position ${key} is bare`).toBe(true);
      }
      // ...and every side cell left bare really is one no badge can reach.
      for (const cell of grid.slots) {
        if (!grid.panelAt(cell.row, cell.col)?.startsWith("wing-")) continue;
        if (covered.has(`${cell.row}:${cell.col}`)) continue;
        expect(squareSpansAt(empty, cell), `${preset.id}: (${cell.row},${cell.col}) could hold a badge`).toEqual([]);
      }
    }
  });

  it.each(cases)("$label: every badge is a SQUARE the frame accepts", ({ presets, config }) => {
    // THE SQUARE RULE, on the one-tap path: a preset badge is 2.25 x 2.25 on the
    // flush frame and 1.982 square on the live one — never the 2.25 x 4.5 slab a
    // hand-written {2,2} made of the flush side column.
    const grid = buildGrid(config);
    const empty = { grid, slots: {}, sections: {}, barCovered: new Set<string>(), badges: badgeRule(config) };
    for (const preset of presets) {
      for (const [slot, , span] of preset.layout) {
        const verdict = canPlace(empty, grid.coordOf(slot)!, span);
        expect(verdict.ok, `${preset.id}: ${slot} ${JSON.stringify(span)} -> ${verdict.reason}`).toBe(true);
        const inches = snappetInches(config, slot, span);
        expect(inches.width).toBeCloseTo(inches.height, 6);
      }
    }
  });

  it.each(cases)("$label: is MIRRORED — the two sides run the same badges", ({ presets, config }) => {
    const grid = buildGrid(config);
    for (const preset of presets) {
      const bySide = { left: [] as string[], right: [] as string[] };
      for (const [slot, piece] of preset.layout) {
        const anchor = grid.coordOf(slot)!;
        const panel = grid.panelAt(anchor.row, anchor.col);
        if (panel === "wing-left") bySide.left.push(piece);
        else if (panel === "wing-right") bySide.right.push(piece);
      }
      expect(bySide.left.length, `${preset.id} places nothing on the left`).toBeGreaterThan(0);
      expect(bySide.right, `${preset.id} is not mirrored`).toEqual(bySide.left);
    }
  });
});

// ─── The one-tap paths lay the variant's OWN design (finding 62) ─────────────
//
// The intake's "See it on the frame", the welcome chips' #preset= links and the
// preset buttons all go through `layPreset`. The first two used to place slot
// ids from the retired 14 x 8 grid at a 2x2: on the flush frame most ids did not
// exist, so the frame came out lopsided and the chosen activity was nowhere.
describe("layPreset on the shipping frame (every one-tap path)", () => {
  const { config, presets } = schoolVariant(SCHOOL_SHIPPING_VARIANT);
  const grid = buildGrid(config);

  for (const activity of ["hs:orchestra", "hs:soccer-patch", "hs:drama"]) {
    it(`lays six squares with ${activity} on them, on slots the frame has`, () => {
      const store = createDesignStore(`lay-preset-${activity}`, { frameConfig: config });
      // Something already on the frame, so "a whole frame, not a sprinkle" is tested too.
      store.getState().placeTile(sideColumn(config, "wing-left")[1].slot, "hs:golf", "hs");
      layPreset(store.getState(), getPreset("athlete", presets)!, activity, { mascot: null, alt: null });

      const slots = store.getState().slots;
      const ids = Object.keys(slots);
      expect(ids).toHaveLength(6);
      for (const id of ids) {
        expect(grid.coordOf(id), `${id} is not a slot on the shipping frame`).toBeTruthy();
        const inches = snappetInches(config, id, tileSpan(slots[id]));
        expect(inches.width, id).toBeCloseTo(inches.height, 6);
      }
      const pieces = Object.values(slots).map((t) => t.pieceId);
      expect(pieces.filter((p) => p === activity)).toHaveLength(4);
      expect(pieces).not.toContain("hs:golf");
    });
  }
});

// ─── The same two rules, on what the SHIPPING frame actually lays ────────────
//
// The tests above check the placeholders, and a placeholder cannot break rule 2 —
// the FALLBACK it resolves to can. `MASCOT_ALT` on a markless kit resolved to
// `hs:honor-star` ("Honor Roll"), so every pilot school's "Just the school" laid
// four honor-roll badges and "Graduate" put one in both top corners, with every
// test here green. These run the resolved tiles, kit by kit.

describe("the shipping presets, resolved for every pilot school", () => {
  const FILLER = ["hs:trophy", "hs:medal", "hs:laurel", "hs:torch", "hs:honor-star"];
  const presets = schoolVariant(SCHOOL_SHIPPING_VARIANT).presets;
  const cases = pilotSchoolKits().flatMap((kit) =>
    presets.map((preset) => ({ label: `${kit.slug} / ${preset.id}`, kit, preset })),
  );

  it.each(cases)("$label claims nothing nobody earned and never repeats itself", ({ kit, preset }) => {
    const marks = kitMarkIds(kit);
    // With an activity where the preset asks for one, the way the builder lays it.
    const activity = preset.needsActivity ? "hs:drama" : null;
    const tiles = presetTiles(preset, activity, marks.mascot, marks.alt);
    for (const [, piece] of tiles) {
      expect(FILLER, `${preset.id} lays ${piece} on ${kit.slug}`).not.toContain(piece);
      expect(getPiece(piece), `${piece} is not a badge`).toBeTruthy();
    }
    const half = tiles.length / 2;
    for (const run of [tiles.slice(0, half), tiles.slice(half)]) {
      for (let i = 1; i < run.length; i++) {
        expect(run[i][1], `${preset.id} repeats ${run[i][1]} on ${kit.slug}`).not.toBe(run[i - 1][1]);
      }
    }
  });

  it.each(cases)("$label never shows a different activity from the one the parent chose", ({ kit, preset }) => {
    // A one-mark school's second position is its signature activity until the
    // parent picks one. After that, a Soccer parent tapping "Just the school" on
    // Ladue got four TRACK badges while the menu still read Soccer.
    const marks = kitMarkIds(kit);
    const chosen = ["hs:drama", "hs:orchestra", "hs:chess"].find((id) => !kit.signature?.includes(id))!;
    const tiles = presetTiles(preset, chosen, marks.mascot, marks.alt);
    for (const [, piece] of tiles) {
      if (piece.startsWith("mark:")) continue;
      expect(kit.signature ?? [], `${preset.id} lays ${piece} on ${kit.slug} for a ${chosen} student`).not.toContain(piece);
    }
  });

  it.each(cases)("$label's blurb names only badges it lays", ({ kit, preset }) => {
    const marks = kitMarkIds(kit);
    const nameOf = (id: string) => getPiece(id)?.name;
    const blurb = presetBlurb(preset, null, marks, nameOf);
    if (!preset.describe) return;
    const laid = new Set(presetTiles(preset, null, marks.mascot, marks.alt).map(([, p]) => nameOf(p)));
    // The derived blurb is the names, joined; each must be on the frame.
    for (const name of blurb.split(", down both sides")[0].split(", ")) expect(laid).toContain(name);
  });
});
