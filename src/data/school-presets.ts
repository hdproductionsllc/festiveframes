import type { BuyerId } from "@/data/frame-buyers";

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
  layout: Array<[slot: string, piece: string, span?: { cols: number; rows: number }]>;
  /** Used wherever `ACTIVITY` appears and the intake is empty. */
  fallbackActivity: string;
  /**
   * This design is ABOUT the activity, so applying it without one produces a
   * frame that is not what the card promised. "Their sport" placed a stock
   * trophy when nobody had picked a sport, which is exactly the generic result
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
 * Falls back to the generic crest, which is still a school shape.
 */
export const MASCOT_ALT = "__MASCOT_ALT__";

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
    layout: [
      ["frame:wing-left-0", MASCOT],
      ["frame:top-11", MASCOT],
      ["frame:wing-left-2", "hs:grad-cap"],
      ["frame:right-1", "hs:grad-cap"],
      ["frame:wing-left-4", "hs:diploma-tall"],
      ["frame:right-3", "hs:diploma-tall"],
      ["frame:wing-left-6", MASCOT],
      ["frame:bottom-11", MASCOT],
    ],
    fallbackActivity: "hs:honor-star",
    favouredBy: ["parent", "grandparent", "self"],
  },
  {
    id: "athlete",
    name: "Their sport",
    blurb: "Their sport and the mascot, alternating down both sides.",
    icon: "\u{1F3C5}",
    // ALTERNATING, which is the whole fix. This used to run the sport in the
    // corners and the mascot in the middle — sport, mascot, mascot, sport — so
    // the two mascots sat directly on top of each other and read as the same
    // badge placed twice by accident. Alternating gives the same two ideas the
    // same amount of room and never repeats itself.
    layout: [
      ["frame:wing-left-0", ACTIVITY],
      ["frame:top-11", ACTIVITY],
      ["frame:wing-left-2", MASCOT],
      ["frame:right-1", MASCOT],
      ["frame:wing-left-4", ACTIVITY],
      ["frame:right-3", ACTIVITY],
      ["frame:wing-left-6", MASCOT],
      ["frame:bottom-11", MASCOT],
    ],
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
    layout: [
      ["frame:wing-left-0", MASCOT_ALT],
      ["frame:top-11", MASCOT_ALT],
      ["frame:wing-left-2", MASCOT],
      ["frame:right-1", MASCOT],
      ["frame:wing-left-4", MASCOT_ALT],
      ["frame:right-3", MASCOT_ALT],
      ["frame:wing-left-6", MASCOT],
      ["frame:bottom-11", MASCOT],
    ],
    fallbackActivity: "hs:crest",
    favouredBy: ["alum", "staff"],
  },
];

// ─── The FORK's presets: 2x2 / 2x3 / 2x2 ─────────────────────────────────────
//
// Seven rows means each side takes three badges with a taller feature in the
// middle, instead of four equal squares. That hierarchy is the point: four equal
// slots is where every repetitive layout came from, because nothing could lead.
//
// The middle 2x3 is a NEW aspect (2:3) that no existing badge is drawn for, so it
// is reserved for the things that suit it — the school's mascot redrawn tall, a
// jersey carrying their number, or the student's own photo. Square art placed
// there letterboxes, which is why the presets below never put one in it.

const SLIM_COL_LEFT = ["frame:wing-left-0", "frame:wing-left-2", "frame:wing-left-5"] as const;
const SLIM_COL_RIGHT = ["frame:top-11", "frame:right-1", "frame:right-4"] as const;
const SQ = { cols: 2, rows: 2 };
const TALL3 = { cols: 2, rows: 3 };

/** Mirror a three-badge column onto both sides, with the middle one 2x3. */
function slimLayout(top: string, middle: string, bottom: string): SchoolPreset["layout"] {
  const out: SchoolPreset["layout"] = [];
  for (const col of [SLIM_COL_LEFT, SLIM_COL_RIGHT]) {
    out.push([col[0], top, SQ], [col[1], middle, TALL3], [col[2], bottom, SQ]);
  }
  return out;
}

export const SLIM_PRESETS: SchoolPreset[] = [
  {
    id: "graduate",
    name: "Graduate",
    blurb: "Their cap, their diploma, and the school between them.",
    icon: "\u{1F393}",
    layout: slimLayout("hs:grad-cap", MASCOT, "hs:diploma-tall"),
    fallbackActivity: "hs:honor-star",
    favouredBy: ["parent", "grandparent", "self"],
  },
  {
    id: "athlete",
    name: "Their sport",
    blurb: "Their sport top and bottom, the mascot leading in the middle.",
    icon: "\u{1F3C5}",
    layout: slimLayout(ACTIVITY, MASCOT, ACTIVITY),
    fallbackActivity: "hs:trophy",
    needsActivity: true,
    wantsNumber: true,
    favouredBy: ["parent", "self"],
  },
  {
    id: "school",
    name: "Just the school",
    blurb: "The crest, the mascot, the crest. Nothing to fill in.",
    icon: "\u{1F6E1}\uFE0F",
    layout: slimLayout(MASCOT_ALT, MASCOT, MASCOT_ALT),
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
): Array<[string, string, { cols: number; rows: number } | undefined]> {
  const activity = chosenActivity || preset.fallbackActivity;
  const mascot = mascotPieceId || "hs:crest";
  // A school with only one mark alternates against the generic crest, which is
  // still a school shape. It must never resolve to the mascot itself: that would
  // put the same badge in adjacent positions, which is the defect this preset
  // pattern exists to avoid.
  const alt = altMarkPieceId && altMarkPieceId !== mascot
    ? altMarkPieceId
    : mascot === "hs:crest" ? "hs:honor-star" : "hs:crest";
  return preset.layout.map(([slot, piece, span]) => [
    slot,
    piece === ACTIVITY ? activity : piece === MASCOT ? mascot : piece === MASCOT_ALT ? alt : piece,
    span,
  ]);
}
