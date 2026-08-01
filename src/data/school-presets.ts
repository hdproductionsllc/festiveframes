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
  layout: Array<[slot: string, piece: string]>;
  /** Used wherever `ACTIVITY` appears and the intake is empty. */
  fallbackActivity: string;
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

export const SCHOOL_PRESETS: SchoolPreset[] = [
  {
    id: "graduate",
    name: "Graduate",
    blurb: "Their class year, front and centre.",
    icon: "🎓",
    // The cap CARRIES its tassel and the diploma stands alone: `hs:diploma-cap`
    // draws both objects in one badge, so pairing it with `hs:grad-cap` put the
    // mortarboard on the frame twice. One cap, one diploma, and the school at
    // both ends.
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
    blurb: "Their team in every corner, with the hardware.",
    icon: "🏆",
    layout: [
      ["frame:wing-left-0", ACTIVITY],
      ["frame:top-11", ACTIVITY],
      ["frame:wing-left-2", "hs:trophy"],
      ["frame:right-1", "hs:trophy"],
      ["frame:wing-left-4", "hs:medal"],
      ["frame:right-3", "hs:medal"],
      ["frame:wing-left-6", ACTIVITY],
      ["frame:bottom-11", ACTIVITY],
    ],
    fallbackActivity: "hs:trophy",
    favouredBy: ["parent", "self"],
  },
  {
    id: "spirit",
    name: "School spirit",
    blurb: "The crest, the colours, and what they're into.",
    icon: "🎉",
    layout: [
      ["frame:wing-left-0", "hs:crest"],
      ["frame:top-11", "hs:crest"],
      ["frame:wing-left-2", ACTIVITY],
      ["frame:right-1", ACTIVITY],
      ["frame:wing-left-4", "hs:star"],
      ["frame:right-3", "hs:star"],
      ["frame:wing-left-6", ACTIVITY],
      ["frame:bottom-11", ACTIVITY],
    ],
    fallbackActivity: "hs:star",
    favouredBy: ["alum", "staff", "parent"],
  },
];

export function getPreset(id: string): SchoolPreset | undefined {
  return SCHOOL_PRESETS.find((p) => p.id === id);
}

/**
 * The presets in the order this buyer should see them.
 *
 * A grandparent is shopping for a graduation gift, an alum wants the crest.
 * Stable within each group so the strip does not reshuffle unpredictably.
 */
export function presetsFor(buyer: BuyerId): SchoolPreset[] {
  return [...SCHOOL_PRESETS].sort((a, b) => {
    const ai = a.favouredBy.indexOf(buyer);
    const bi = b.favouredBy.indexOf(buyer);
    const av = ai === -1 ? 99 : ai;
    const bv = bi === -1 ? 99 : bi;
    return av - bv;
  });
}

/** The concrete tiles for a preset, with ACTIVITY and MASCOT resolved. */
export function presetTiles(
  preset: SchoolPreset,
  chosenActivity: string | null,
  mascotPieceId?: string | null,
): Array<[string, string]> {
  const activity = chosenActivity || preset.fallbackActivity;
  const mascot = mascotPieceId || "hs:crest";
  return preset.layout.map(([slot, piece]) => [
    slot,
    piece === ACTIVITY ? activity : piece === MASCOT ? mascot : piece,
  ]);
}
