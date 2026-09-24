import type { BuyerId } from "@/data/frame-buyers";
import type { FrameConfig, SectionId } from "@/lib/types";
import { SCHOOL_FLUSH_FRAME_CONFIG, SCHOOL_FRAME_CONFIG, SCHOOL_SLIM_FRAME_CONFIG } from "@/lib/constants/frame";
import { buildGrid } from "@/lib/utils/slot-generator";
import { panelRects } from "@/lib/utils/panels";
import { badgeRule, badgeSpanAt } from "@/lib/utils/snappet";

// ─── Start-from-a-preset ─────────────────────────────────────────────────────
//
// Most parents are not going to design anything. The builder is a power path,
// and until now it was the ONLY path: the single "preset" that existed was an
// invisible `#preset=<badge>` deep link from the welcome chips, which dropped
// one activity badge into a fixed layout. Nothing on screen offered a finished
// design to pick, while the first-run copy promised exactly that.
//
// These are three finished frames, chosen in one tap.
//
// GENERATED, NOT HAND-AUTHORED. Everything below is derived from the kit and the
// grid, so a new school needs no entry here — that is the standing rule for this
// product (see CLAUDE.md: prefer solutions that work for any school with zero
// hand-authoring). The only per-preset input is which badges to place and what
// the banner should say.
//
// GRADUATE LEADS. It is the deadline-driven, gift-shaped, multiple-buyers-per
// -student case: parents, both sets of grandparents, and the graduate's own car.
// Spirit has no deadline and no occasion, so it sells to one person whenever
// they happen to think of it.

export interface SchoolPreset {
  id: string;
  /** Card title. */
  name: string;
  /** One line under it, in the buyer's terms rather than ours. */
  blurb: string;
  /** Emoji shown on the card — the badge art itself is the preview once placed. */
  icon: string;
  /**
   * Badges to place, as [slotId, pieceId]. Mirrored pairs on purpose: the frame
   * is symmetrical and an asymmetric layout reads as unfinished.
   *
   * `ACTIVITY` is a stand-in replaced at apply time by whatever the parent chose
   * in the intake, falling back to the preset's own default when they chose
   * nothing — so the preset is a finished frame either way.
   */
  layout: Array<[slot: string, piece: string, span: { cols: number; rows: number }]>;
  /**
   * Words DERIVED from what this preset resolves to for the school at hand
   * (`presetBlurb`), given the badge names down the left side, top to bottom.
   * Use it whenever the blurb names the badges: a typed list goes stale per kit.
   */
  describe?: (names: string[]) => string;
  /** Used wherever `ACTIVITY` appears and the intake is empty. */
  fallbackActivity: string;
  /**
   * This design is ABOUT the activity, so applying it without one produces a
   * frame that is not what the card promised. "What they do" (once "Their
   * sport") placed a stock trophy when nobody had picked an activity, which is exactly the generic result
   * the preset exists to avoid — the builder now sends them to the sport picker
   * instead of guessing.
   */
  needsActivity?: boolean;
  /** Offer a jersey number with this design. Only athletes have one. */
  wantsNumber?: boolean;
  // NOTE: a preset does NOT own the tagline. The BUYER does — see
  // frame-buyers.ts. Applying "Graduate" as a grandparent produced "CLASS OF
  // 2028" instead of "PROUD GRANDPARENT 2028", because the preset was overriding
  // the one line that buyer is purchasing the frame for. The split is now clean:
  // the preset chooses the badges, the buyer chooses the words.
  /** Which buyers this preset leads with, so the strip can order itself. */
  favouredBy: BuyerId[];
}

export const ACTIVITY = "__ACTIVITY__";

/**
 * The SCHOOL'S OWN MASCOT, resolved per kit at apply time.
 *
 * The corners used to be another graduation object (a torch), which made the
 * graduate frame four kinds of the same idea. The corners are where the school
 * belongs: they are the first thing read in a parking lot, and the mascot is what
 * makes the frame that school's rather than a generic graduation frame.
 *
 * Falls back to the generic crest when a kit has no marks of its own, which is
 * every school we have not been given artwork for — still the school's shape,
 * still not another mortarboard.
 */
export const MASCOT = "__MASCOT__";

/**
 * The school's SECOND mark — its crest, where the mascot is its character.
 *
 * A frame has four badge positions down each side, and the honest material for
 * filling them is short: the school, the occasion, and whatever the student
 * actually does. Stock trophies and torches are the alternative, and they are a
 * claim nobody earned. A school's own crest is neither filler nor a repeat, so
 * it is what the pattern alternates with when there is nothing else true to say.
 *
 * Falls back to a GENERIC SCHOOL SHAPE (`GENERIC_MARKS`) that is not the mascot.
 */
export const MASCOT_ALT = "__MASCOT_ALT__";

/**
 * The shapes that stand in for a school's own marks when we have not been given
 * any, which is every pilot school (their mascot art stays out of `public/` until
 * the school says yes in writing). Kit seeding (data/kit-seed.ts) and the presets
 * both read THIS list, so the landing frame and a preset tap cannot disagree about
 * what "the school" looks like on a markless kit.
 *
 * Every entry must claim nothing about the student. `hs:honor-star` was the
 * fallback, and its badge is named "Honor Roll": on all six pilot schools "Just the
 * school" laid four honor-roll badges and "Graduate" put one in both top corners,
 * an academic claim about a student nobody told us about. The plain spirit star is
 * the school's colours in a shape and says nothing about anyone's grades.
 * `school-presets.test.ts` runs the no-filler rule on the RESOLVED shipping presets
 * for every pilot kit, which is where that defect lived.
 *
 * A preset alternates between the first two; the cap is a third the kit seed can
 * fall back on when a signature has spent one of the others.
 */
export const GENERIC_MARKS = ["hs:crest", "hs:star", "hs:grad-cap"] as const;

// ─── The rules these three obey ──────────────────────────────────────────────
//
// The frame gives each design EIGHT badge positions: a column of four down the
// left, a mirrored column of four down the right. That is the whole canvas, and
// three rules make the difference between a design and a mistake.
//
//   1. NEVER the same badge twice in a row. Two Billikens stacked on top of each
//      other read as a duplicate, not as a pattern — which is exactly what the
//      first "Their sport" did (sport, mascot, mascot, sport) and how it was
//      caught. Mirrored across the plate is fine: that reads as symmetry. Touching
//      is not.
//   2. NOTHING NOBODY EARNED. No stock trophy, no stock medal, no torch. Every
//      badge is the school, the occasion, or what this student actually does.
//   3. EACH ONE ANSWERS A DIFFERENT QUESTION — the occasion, the activity, the
//      school. Three designs that differ only in decoration are one design.
//
// `school-presets.test.ts` enforces 1 and 2.

// ─── The badge column, DERIVED from the frame ────────────────────────────────
//
// These layouts used to be hand-written slot ids, and the window change is what
// showed why that was wrong: `frame:top-11` was the top-right corner of a 12-cell
// top rail and became an ordinary rail cell over the plate the moment the rail
// grew to 14, so three of the six anchors in every preset silently stopped being
// in the side panel at all. Nothing failed; the badges just landed somewhere else.
//
// So the column is computed from the grid. Give it the badge HEIGHTS and it walks
// each side panel from its top row down, returning the anchor at the panel's own
// left-hand column — which is the cantilever column, the one a 2-wide badge grows
// rightward from onto the rail. Mirrored by construction, because the frame is
// symmetrical and an asymmetric layout reads as unfinished.

/** One badge position down a side column: its anchor and the square the frame
 *  declares there. */
export interface ColumnBadge {
  slot: string;
  span: { cols: number; rows: number };
}

/**
 * The badge positions down one side panel, top to bottom — ASKED OF THE FRAME.
 *
 * Walks the panel from its top row at its own left-hand column (the cantilever
 * column a side badge grows rightward from) and, at each row, takes the square the
 * square rule declares there (`badgeSpanAt`). A row where no square anchors is
 * stepped over rather than filled with a rectangle: on the live frame's nine-row
 * column that is the bottom corner, which used to be absorbed into a 2x3 — a
 * rectangle, and exactly what the rule forbids.
 *
 * Exported because kit seeding (data/kit-seed.ts) walks the same column: a kit
 * lands its school's own badges on the very anchors and spans a preset would use,
 * so the two can never disagree about where — or how big — a side badge is.
 */
export function sideColumn(config: FrameConfig, side: SectionId): ColumnBadge[] {
  const grid = buildGrid(config);
  const rect = panelRects(config)[side];
  const ctx = { grid, slots: {}, sections: {}, barCovered: new Set<string>(), badges: badgeRule(config) };
  const out: ColumnBadge[] = [];
  for (let row = rect.row0; row <= rect.row1; ) {
    const cell = grid.cellAt(row, rect.col0);
    const span = cell ? badgeSpanAt(ctx, { row, col: rect.col0 }) : null;
    if (!cell || !span) {
      row += 1;
      continue;
    }
    out.push({ slot: cell.id, span });
    row += span.rows;
  }
  return out;
}

/** Anchor slot ids down one side panel — `sideColumn` without the spans. */
export function sideAnchors(config: FrameConfig, side: SectionId): string[] {
  return sideColumn(config, side).map((b) => b.slot);
}

/**
 * A full mirrored layout from a run of pieces down one side, on the positions the
 * frame declares. The run must be exactly as long as the column: a shorter run
 * leaves a badge position bare, and `school-presets.test.ts` says so.
 */
function mirrored(config: FrameConfig, run: string[]): SchoolPreset["layout"] {
  const out: SchoolPreset["layout"] = [];
  for (const side of ["wing-left", "wing-right"] as const) {
    sideColumn(config, side).forEach(({ slot, span }, i) => {
      if (i < run.length) out.push([slot, run[i], span]);
    });
  }
  return out;
}

/** How many badges a side column holds, top to bottom, in grid rows — derived. */
function stackOf(config: FrameConfig): number[] {
  return sideColumn(config, "wing-left").map((b) => b.span.rows);
}

/**
 * The live frame's column: four 2x2 squares down its nine rows. The odd row at the
 * bottom corner — once absorbed into a 2x3 — is frame body now: a badge is a
 * square, and the only square that fits there is below the floor.
 */
export const FULL_STACK = stackOf(SCHOOL_FRAME_CONFIG);

export const SCHOOL_PRESETS: SchoolPreset[] = [
  {
    id: "graduate",
    name: "Graduate",
    blurb: "Their cap, their diploma, their school.",
    icon: "\u{1F393}",
    // The cap CARRIES its tassel and the diploma stands alone: `hs:diploma-cap`
    // draws both objects in one badge, so pairing it with `hs:grad-cap` put the
    // mortarboard on the frame twice. One cap, one diploma, and the school at
    // both ends of the run.
    layout: mirrored(SCHOOL_FRAME_CONFIG, [MASCOT, "hs:grad-cap", "hs:diploma-tall", MASCOT]),
    fallbackActivity: "hs:honor-star",
    favouredBy: ["parent", "grandparent", "self"],
  },
  {
    id: "athlete",
    name: "What they do",
    blurb: "Their activity and the mascot, alternating down both sides.",
    icon: "⭐",
    // ALTERNATING, which is the whole fix. This used to run the sport in the
    // corners and the mascot in the middle — sport, mascot, mascot, sport — so
    // the two mascots sat directly on top of each other and read as the same
    // badge placed twice by accident. Alternating gives the same two ideas the
    // same amount of room and never repeats itself.
    layout: mirrored(SCHOOL_FRAME_CONFIG, [ACTIVITY, MASCOT, ACTIVITY, MASCOT]),
    fallbackActivity: "hs:trophy",
    needsActivity: true,
    wantsNumber: true,
    favouredBy: ["parent", "self"],
  },
  {
    id: "school",
    name: "Just the school",
    blurb: "The mascot and the crest. Nothing to fill in.",
    icon: "\u{1F6E1}\uFE0F",
    // THE ONE THAT NEEDS NOTHING. It replaces "The full lineup", which claimed to
    // show four different sides of a student and actually showed a torch and a
    // laurel wreath — decoration standing in for facts we never collected. This
    // asks for no sport, no year and no name, which makes it the design for an
    // alum, a teacher, a grandparent who only knows the school, and any parent
    // who just wants the frame. It is also the best-looking of the three on a
    // school with real artwork, because every badge on it is that school's.
    // CREST FIRST, so the run ENDS on the mascot. The bottom banner already wears
    // the school's crest either side of the name, and the first version of this
    // put a crest badge in the bottom corner right beside it — four of the same
    // fleur in a row across the bottom of the frame. Same defect as the stacked
    // mascots, one step further down, and only visible in a render.
    layout: mirrored(SCHOOL_FRAME_CONFIG, [MASCOT_ALT, MASCOT, MASCOT_ALT, MASCOT]),
    fallbackActivity: "hs:crest",
    favouredBy: ["alum", "staff"],
  },
];

// ─── The FORK's presets: four squares ────────────────────────────────────────
//
// The slim frame has no bottom cantilever, so its side panel is 8 rows. It used to
// run 2x2 / 2x4 / 2x2 — a tall feature in the middle — and a 2x4 is a rectangle,
// which the square rule forbids. Eight rows is four 2x2 squares exactly, so the
// fork runs the live frame's four-badge patterns.

export const SLIM_STACK = stackOf(SCHOOL_SLIM_FRAME_CONFIG);

export const SLIM_PRESETS: SchoolPreset[] = [
  {
    id: "graduate",
    name: "Graduate",
    blurb: "Their cap, their diploma, their school.",
    icon: "\u{1F393}",
    layout: mirrored(SCHOOL_SLIM_FRAME_CONFIG, [MASCOT, "hs:grad-cap", "hs:diploma-tall", MASCOT]),
    fallbackActivity: "hs:honor-star",
    favouredBy: ["parent", "grandparent", "self"],
  },
  {
    id: "athlete",
    name: "What they do",
    blurb: "Their activity and the mascot, alternating down both sides.",
    icon: "⭐",
    layout: mirrored(SCHOOL_SLIM_FRAME_CONFIG, [ACTIVITY, MASCOT, ACTIVITY, MASCOT]),
    fallbackActivity: "hs:trophy",
    needsActivity: true,
    wantsNumber: true,
    favouredBy: ["parent", "self"],
  },
  {
    id: "school",
    name: "Just the school",
    blurb: "The mascot and the crest. Nothing to fill in.",
    icon: "\u{1F6E1}\uFE0F",
    layout: mirrored(SCHOOL_SLIM_FRAME_CONFIG, [MASCOT_ALT, MASCOT, MASCOT_ALT, MASCOT]),
    fallbackActivity: "hs:crest",
    favouredBy: ["alum", "staff"],
  },
];

// ─── The FLUSH fork's presets: three SQUARE badges, 2.25 x 2.25 each ─────────
//
// The flush frame's side column is 2.25" wide and 6.75" tall: three squares. They
// are not on the 1" pitch, so the side panels sit on their own lattice of three
// rows (FrameConfig.wingRows) and a badge there is two cells (wing + rail) wide
// and ONE side-row tall — which `sideColumn` reads off the square rule rather
// than this file stating it.

export const FLUSH_STACK = stackOf(SCHOOL_FLUSH_FRAME_CONFIG);

/** Mirror a three-badge column onto both sides. */
function flushLayout(top: string, middle: string, bottom: string): SchoolPreset["layout"] {
  return mirrored(SCHOOL_FLUSH_FRAME_CONFIG, [top, middle, bottom]);
}

export const FLUSH_PRESETS: SchoolPreset[] = [
  {
    id: "graduate",
    name: "Graduate",
    blurb: "Their cap and diploma, with the school above and below.",
    icon: "\u{1F393}",
    // SQUARE ART for a square badge. `hs:diploma-tall` is a 0.38 upright scroll
    // (a sliver in a 2.25" square) and `hs:diploma` a 1.92 landscape one;
    // `hs:diploma-cap` (1.15) is the near-square graduation piece, and it already
    // draws the cap, so pairing it with `hs:grad-cap` would put the mortarboard on
    // the frame twice. The school takes both ends of the run instead, ending on
    // the mascot so the bottom corner does not repeat the banner's crest.
    layout: flushLayout(MASCOT_ALT, "hs:diploma-cap", MASCOT),
    fallbackActivity: "hs:honor-star",
    favouredBy: ["parent", "grandparent", "self"],
  },
  {
    id: "athlete",
    // "What they do", not "Their sport", and a star rather than a medal: this is
    // the design an orchestra or theater family needs too, and a sports-only
    // label told them it was not for them.
    name: "What they do",
    blurb: "Their activity top and bottom, the mascot in the middle.",
    icon: "⭐",
    layout: flushLayout(ACTIVITY, MASCOT, ACTIVITY),
    fallbackActivity: "hs:trophy",
    needsActivity: true,
    wantsNumber: true,
    favouredBy: ["parent", "self"],
  },
  {
    id: "school",
    name: "Just the school",
    blurb: "The school's own badges down both sides. Nothing to fill in.",
    describe: (names) => `${names.join(", ")}, down both sides. Nothing to fill in.`,
    icon: "\u{1F6E1}️",
    layout: flushLayout(MASCOT_ALT, MASCOT, MASCOT_ALT),
    fallbackActivity: "hs:crest",
    favouredBy: ["alum", "staff"],
  },
];

export function getPreset(id: string, from: SchoolPreset[] = SCHOOL_PRESETS): SchoolPreset | undefined {
  return from.find((p) => p.id === id);
}

/**
 * The presets in the order this buyer should see them.
 *
 * A grandparent is shopping for a graduation gift, an alum wants the crest.
 * Stable within each group so the strip does not reshuffle unpredictably.
 */
export function presetsFor(buyer: BuyerId, from: SchoolPreset[] = SCHOOL_PRESETS): SchoolPreset[] {
  return [...from].sort((a, b) => {
    const ai = a.favouredBy.indexOf(buyer);
    const bi = b.favouredBy.indexOf(buyer);
    const av = ai === -1 ? 99 : ai;
    const bv = bi === -1 ? 99 : bi;
    return av - bv;
  });
}

/** The concrete tiles for a preset, with ACTIVITY, MASCOT and MASCOT_ALT resolved. */
export function presetTiles(
  preset: SchoolPreset,
  chosenActivity: string | null,
  mascotPieceId?: string | null,
  altMarkPieceId?: string | null,
): Array<[string, string, { cols: number; rows: number }]> {
  const activity = chosenActivity || preset.fallbackActivity;
  const mascot = mascotPieceId || GENERIC_MARKS[0];
  // A school with one mark, or none, alternates against a generic school shape.
  // It must never resolve to the mascot itself: that would put the same badge in
  // adjacent positions, which is the defect this preset pattern exists to avoid.
  const alt = altMarkPieceId && altMarkPieceId !== mascot
    ? altMarkPieceId
    : GENERIC_MARKS.slice(0, 2).find((id) => id !== mascot)!;
  return preset.layout.map(([slot, piece, span]) => [
    slot,
    piece === ACTIVITY ? activity : piece === MASCOT ? mascot : piece === MASCOT_ALT ? alt : piece,
    span,
  ]);
}

/**
 * The line under a preset, in terms of what it will ACTUALLY lay for this school.
 *
 * "The crest, the mascot, the crest" was typed once and read on every kit; on a
 * school with no marks of its own it described badges that were not there. A
 * preset with `describe` gets its words from the resolved left column (top to
 * bottom, by badge NAME), so the sentence and the frame cannot disagree.
 */
export function presetBlurb(
  preset: SchoolPreset,
  chosenActivity: string | null,
  marks: { mascot: string | null; alt: string | null },
  nameOf: (pieceId: string) => string | undefined,
): string {
  if (!preset.describe) return preset.blurb;
  // `mirrored` lays the left column first, top to bottom, then the right.
  const names = presetTiles(preset, chosenActivity, marks.mascot, marks.alt)
    .slice(0, preset.layout.length / 2)
    .map(([, piece]) => nameOf(piece) ?? piece);
  return preset.describe(names);
}

/** The store action laying a preset needs — the design store satisfies it. */
export interface PresetTarget {
  layBadges: (tiles: ReadonlyArray<{ slot: string; pieceId: string; setId: string; span?: { cols: number; rows: number } }>) => void;
}

/**
 * LAY A PRESET: replace every badge on the frame with the preset's, in ONE step.
 *
 * A preset is a whole set of badges, not a sprinkle, so nothing the frame held
 * before survives it — an uploaded photo included. It is NOT a new design: the
 * banners, the colours and the tray are the parent's and stay as they are. It used
 * to `clearAll()` first, which also reset both banners to the kit's seed, so after
 * a reload (when the intake fields are empty again) every chip and preset tap
 * silently wiped the parent's own line. And it was seven history steps, so one
 * Undo took back one badge of a preset instead of the preset.
 *
 * Spans are the preset's own, which `sideColumn` read off the square rule for this
 * variant, and `layBadges` seats each through the same gate as a tap — so there is
 * no fallback span to invent.
 *
 * EVERY one-tap path goes through here: the preset buttons, the "See it on the
 * frame" intake, the welcome chips' `#preset=` links and the graduate express. The
 * intake and the chips used to place their own hard-coded slot ids from the
 * retired 14 x 8 grid at a hard-coded 2x2; on the flush frame most of those ids
 * did not exist and were dropped without a word, leaving a lopsided frame with
 * the parent's chosen activity nowhere on it.
 */
export function layPreset(
  api: PresetTarget,
  preset: SchoolPreset,
  activity: string | null,
  marks: { mascot: string | null; alt: string | null },
): void {
  api.layBadges(
    presetTiles(preset, activity, marks.mascot, marks.alt).map(([slot, pieceId, span]) => ({
      slot,
      pieceId,
      // The piece id's own namespace IS its set: `hs:` pieces are the high-school
      // set, `mark:` pieces the school's marks.
      setId: pieceId.split(":")[0],
      span,
    })),
  );
}
