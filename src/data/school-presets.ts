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

export const SCHOOL_PRESETS: SchoolPreset[] = [
  {
    id: "graduate",
    name: "Graduate",
    blurb: "Their class year, front and centre.",
    icon: "🎓",
    layout: [
      ["frame:wing-left-0", "hs:grad-cap"],
      ["frame:top-11", "hs:grad-cap"],
      ["frame:wing-left-2", "hs:diploma-cap"],
      ["frame:right-1", "hs:diploma-cap"],
      ["frame:wing-left-4", "hs:honor-star"],
      ["frame:right-3", "hs:honor-star"],
      ["frame:wing-left-6", ACTIVITY],
      ["frame:bottom-11", ACTIVITY],
    ],
    fallbackActivity: "hs:torch",
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

/** The concrete tiles for a preset, with ACTIVITY resolved. */
export function presetTiles(
  preset: SchoolPreset,
  chosenActivity: string | null,
): Array<[string, string]> {
  const activity = chosenActivity || preset.fallbackActivity;
  return preset.layout.map(([slot, piece]) => [slot, piece === ACTIVITY ? activity : piece]);
}
