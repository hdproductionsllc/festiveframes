// Themed starting points for the homepage "Build this look" buttons. Each look
// links to /build?look=<id>; the builder seeds a CONCRETE recreation of that
// look's marketing preview image (public/redesign/looks/<id>.png) — the actual
// tile layout in the actual positions, plus the top and/or bottom banner(s) the
// preview shows.
//
// All piece ids below are REAL pieces from src/data/sets/fourth-of-july.ts and
// all slot ids are REAL ids from the frame (see slot-generator.ts):
//   top row:    frame:top-0   .. frame:top-12   (13 wide, left→right)
//   bottom row: frame:bottom-0 .. frame:bottom-12 (13 wide, left→right)
//   left rail:  frame:left-0   .. frame:left-4    (5, top→bottom)
//   right rail: frame:right-0  .. frame:right-4   (5, top→bottom)
//
// The seeding in Designer.tsx (the `?look=` branch) clears the canvas, places
// these exact tiles, fills any still-empty perimeter slot with `filler`, then
// drops the top and/or bottom banner(s) via the store's text-bar actions.

export interface LookBanner {
  /** Banner slogan text. */
  text: string;
  /** Optional background color override (defaults to the loud navy bar). */
  backgroundColor?: string;
  /** Optional text color override. */
  textColor?: string;
}

export interface LookPreset {
  /** Exact tile placements: slotId -> july4th piece id. */
  slots: Record<string, string>;
  /** Piece ids used to fill any perimeter slot left empty by `slots`. */
  filler: string[];
  /** Top banner, if the preview shows one. */
  topBar?: LookBanner;
  /** Bottom banner, if the preview shows one. */
  bottomBar?: LookBanner;
}

// Banner palette pulled from the previews.
const RED = "#C8102E";
const NAVY = "#1B2A4A";
const WHITE = "#FFFFFF";

// Shorthand builders for the two full-width rails (13 each) and side rails (5).
const TOP = (i: number) => `frame:top-${i}`;
const BOTTOM = (i: number) => `frame:bottom-${i}`;
const LEFT = (i: number) => `frame:left-${i}`;
const RIGHT = (i: number) => `frame:right-${i}`;

export const LOOK_PRESETS: Record<string, LookPreset> = {
  // ── 250 Years ────────────────────────────────────────────────────────────
  // Preview: TOP red banner "250 YEARS" over the top row, BOTTOM navy "USA"
  // banner over the bottom row. The visible tiles are the rail ENDS + the side
  // rails: stars in the top corners, USA + flags near the top, 1776-2026 stacks
  // down the sides, uncle-sam-hat + eagle/flag mid-rail, and the bottom corners
  // carry liberty-bell + 250. Both rows mostly sit under their banners, so we
  // feature the side rails and the four corners.
  years250: {
    slots: {
      // top corners + the few top tiles flanking the "250 YEARS" banner
      [TOP(0)]: "july4th:star-blue",
      [TOP(1)]: "july4th:usa",
      [TOP(2)]: "july4th:american-flag",
      [TOP(10)]: "july4th:american-flag",
      [TOP(11)]: "july4th:usa",
      [TOP(12)]: "july4th:star-blue",
      // left rail, top→bottom: 1776, firecracker, 1776, uncle-sam-hat, flag
      [LEFT(0)]: "july4th:1776-2026",
      [LEFT(1)]: "july4th:firecracker",
      [LEFT(2)]: "july4th:1776-2026",
      [LEFT(3)]: "july4th:uncle-sam-hat",
      [LEFT(4)]: "july4th:american-flag",
      // right rail mirrors the left
      [RIGHT(0)]: "july4th:1776-2026",
      [RIGHT(1)]: "july4th:firecracker",
      [RIGHT(2)]: "july4th:1776-2026",
      [RIGHT(3)]: "july4th:uncle-sam-hat",
      [RIGHT(4)]: "july4th:american-flag",
      // bottom corners + the tiles flanking the "USA" banner: bell, 250, 1776, star
      [BOTTOM(0)]: "july4th:liberty-bell",
      [BOTTOM(1)]: "july4th:250",
      [BOTTOM(2)]: "july4th:1776-2026",
      [BOTTOM(3)]: "july4th:star-red",
      [BOTTOM(9)]: "july4th:star-red",
      [BOTTOM(10)]: "july4th:1776-2026",
      [BOTTOM(11)]: "july4th:250",
      [BOTTOM(12)]: "july4th:liberty-bell",
    },
    filler: ["july4th:star-red", "july4th:star-blue", "july4th:1776-2026"],
    topBar: { text: "250 YEARS", backgroundColor: RED, textColor: WHITE },
    bottomBar: { text: "USA", backgroundColor: NAVY, textColor: WHITE },
  },

  // ── Spirit of '76 ────────────────────────────────────────────────────────
  // Preview: TOP red banner "1776" with star, eagle, USA, flag, 250 flanking
  // it; BOTTOM navy banner "USA" with eagles + stars flanking. Side rails are
  // eagles + flags + bomb-pops + firecrackers + liberty-bell.
  spirit76: {
    slots: {
      // top row flanks: star, eagle, USA, flag, 250 each side of the "1776" banner
      [TOP(0)]: "july4th:star-blue",
      [TOP(1)]: "july4th:eagle",
      [TOP(2)]: "july4th:usa",
      [TOP(3)]: "july4th:waving-flag",
      [TOP(4)]: "july4th:250",
      [TOP(8)]: "july4th:250",
      [TOP(9)]: "july4th:waving-flag",
      [TOP(10)]: "july4th:usa",
      [TOP(11)]: "july4th:eagle",
      [TOP(12)]: "july4th:star-blue",
      // left rail: flag, eagle, bomb-pop, firecracker, liberty-bell
      [LEFT(0)]: "july4th:american-flag",
      [LEFT(1)]: "july4th:eagle",
      [LEFT(2)]: "july4th:bomb-pop",
      [LEFT(3)]: "july4th:firecracker",
      [LEFT(4)]: "july4th:liberty-bell",
      // right rail mirrors the left
      [RIGHT(0)]: "july4th:american-flag",
      [RIGHT(1)]: "july4th:eagle",
      [RIGHT(2)]: "july4th:bomb-pop",
      [RIGHT(3)]: "july4th:firecracker",
      [RIGHT(4)]: "july4th:liberty-bell",
      // bottom flanks the "USA" banner: red star, eagle each side
      [BOTTOM(0)]: "july4th:star-red",
      [BOTTOM(1)]: "july4th:eagle",
      [BOTTOM(2)]: "july4th:eagle",
      [BOTTOM(10)]: "july4th:eagle",
      [BOTTOM(11)]: "july4th:eagle",
      [BOTTOM(12)]: "july4th:star-red",
    },
    filler: ["july4th:eagle", "july4th:star-red", "july4th:star-blue"],
    topBar: { text: "1776", backgroundColor: RED, textColor: WHITE },
    bottomBar: { text: "USA", backgroundColor: NAVY, textColor: WHITE },
  },

  // ── Freedom Burst ────────────────────────────────────────────────────────
  // Preview: every perimeter tile is a red/white/blue starburst; ONE bottom
  // navy banner "LET FREEDOM RING". No top banner.
  burst: {
    slots: {},
    filler: ["july4th:sunburst", "july4th:firework-rwb"],
    bottomBar: { text: "LET FREEDOM RING", backgroundColor: NAVY, textColor: WHITE },
  },

  // ── Home of the Brave ────────────────────────────────────────────────────
  // Preview: every perimeter tile is a bold red star on white; ONE bottom red
  // banner "HOME OF THE BRAVE". No top banner.
  brave: {
    slots: {},
    filler: ["july4th:star-red"],
    bottomBar: { text: "HOME OF THE BRAVE", backgroundColor: RED, textColor: WHITE },
  },

  // ── Pinwheel Parade ──────────────────────────────────────────────────────
  // Preview: every perimeter tile is a red/white/blue pinwheel; ONE bottom navy
  // banner "LET FREEDOM RING". No top banner.
  pinwheel: {
    slots: {},
    filler: ["july4th:pinwheel"],
    bottomBar: { text: "LET FREEDOM RING", backgroundColor: NAVY, textColor: WHITE },
  },

  // ── The Sampler ──────────────────────────────────────────────────────────
  // Preview: a balanced "sampler" of the whole collection around the full
  // perimeter — 250 in the corners, sunbursts, flags, chevrons, bomb-pop,
  // stars, and diagonal stripes. NO banner (the whole border is tiles).
  sampler: {
    slots: {
      // top row: 250 corners, sunbursts, flags, chevrons across
      [TOP(0)]: "july4th:flag-block",
      [TOP(1)]: "july4th:250",
      [TOP(2)]: "july4th:sunburst",
      [TOP(3)]: "july4th:chevron-rwb",
      [TOP(4)]: "july4th:diag-rw-right",
      [TOP(8)]: "july4th:diag-rw-right",
      [TOP(9)]: "july4th:chevron-rwb",
      [TOP(10)]: "july4th:sunburst",
      [TOP(11)]: "july4th:250",
      [TOP(12)]: "july4th:flag-block",
      // left rail: sunburst, chevron, flag, sunburst, 250
      [LEFT(0)]: "july4th:sunburst",
      [LEFT(1)]: "july4th:chevron-nw",
      [LEFT(2)]: "july4th:american-flag",
      [LEFT(3)]: "july4th:sunburst",
      [LEFT(4)]: "july4th:250",
      // right rail mirrors
      [RIGHT(0)]: "july4th:sunburst",
      [RIGHT(1)]: "july4th:chevron-nw",
      [RIGHT(2)]: "july4th:american-flag",
      [RIGHT(3)]: "july4th:sunburst",
      [RIGHT(4)]: "july4th:250",
      // bottom row: 250 corners, chevrons, flags, star, bomb-pop center
      [BOTTOM(0)]: "july4th:250",
      [BOTTOM(1)]: "july4th:chevron-nw",
      [BOTTOM(2)]: "july4th:diag-rw-right",
      [BOTTOM(3)]: "july4th:american-flag",
      [BOTTOM(4)]: "july4th:star-red",
      [BOTTOM(5)]: "july4th:diag-rw-right",
      [BOTTOM(6)]: "july4th:bomb-pop",
      [BOTTOM(7)]: "july4th:diag-rw-right",
      [BOTTOM(8)]: "july4th:star-red",
      [BOTTOM(9)]: "july4th:american-flag",
      [BOTTOM(10)]: "july4th:diag-rw-right",
      [BOTTOM(11)]: "july4th:chevron-nw",
      [BOTTOM(12)]: "july4th:250",
    },
    filler: [
      "july4th:sunburst",
      "july4th:american-flag",
      "july4th:chevron-rwb",
      "july4th:diag-rw-right",
      "july4th:star-red",
    ],
  },
};
