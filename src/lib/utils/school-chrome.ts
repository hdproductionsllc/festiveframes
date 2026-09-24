import { contrastRatio } from "@/lib/utils/tile-theme";

// ─── The builder's CHROME in a school's colours, with the contrast worked out ──
//
// The page hands the school's colour to its chrome (`--ff-school`), and the CSS
// used to paint the primary action straight from it with white type. That is
// right for navy and wrong at both ends of the catalogue:
//
//   • a LIGHT school colour (Parkway West's #5199CD) put white type on it at
//     3.09:1, under the 4.5:1 a button label needs;
//   • a DARK one (Lafayette's near-black, Marquette's navy) put the most important
//     button on the page on a header of almost the same colour (1.29:1, 1.41:1),
//     so it read as a borderless label or a disabled control.
//
// Both are answered HERE, once, for every kit — authored or thin — rather than per
// school: the fill is the school colour taken just dark enough for white to clear
// AA, and where that fill disappears into the header, the button is ringed in the
// school's own second colour (its rim), which is how the school itself pairs them.

const WHITE = "#ffffff";
/** The page's near-black floor; the header is the school mixed 12% into it
 *  (`--ff-room` in school-skin.css). */
const FLOOR = "#05070c";
/** AA for normal-size text. */
const TEXT_AA = 4.5;
/** Below this against the header, the fill no longer reads as a button. */
const MIN_EDGE = 1.5;
/** A ring must at least clear the non-text 3:1 against what it sits on. */
const RING_AA = 3;

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function hex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

/** `a` mixed with `b`, `share` of `a` — the same maths as CSS color-mix in srgb. */
export function mixHex(a: string, b: string, share: number): string {
  const [ra, ga, ba] = rgb(a);
  const [rb, gb, bb] = rgb(b);
  return hex([ra * share + rb * (1 - share), ga * share + gb * (1 - share), ba * share + bb * (1 - share)]);
}

const isHex = (c: string | null | undefined): c is string => !!c && /^#[0-9a-f]{6}$/i.test(c);

export interface SchoolChrome {
  /** The primary action's fill: the school colour, darkened only as far as white needs. */
  action: string;
  /** The header's own colour, for the edge test (school 12% into the floor). */
  header: string;
  /** A ring for the primary action where its fill vanishes into the header; null otherwise. */
  ring: string | null;
}

export function schoolChrome(colors: { frame: string; rim?: string | null }): SchoolChrome {
  const school = isHex(colors.frame) ? colors.frame : "#1b2a4a";
  // Darken in small steps until white type clears AA. Navy and crimson clear it
  // untouched, so most schools keep their exact colour.
  let action = school;
  for (let dark = 0.05; contrastRatio(action, WHITE) < TEXT_AA && dark <= 0.6; dark += 0.05) {
    action = mixHex(school, "#000000", 1 - dark);
  }
  const header = mixHex(school, FLOOR, 0.12);
  let ring: string | null = null;
  if (contrastRatio(action, header) < MIN_EDGE) {
    // The school's second colour when it stands off the header; otherwise the
    // lit school colour the page's own ramp uses.
    ring = isHex(colors.rim) && contrastRatio(colors.rim, header) >= RING_AA
      ? colors.rim
      : mixHex(school, WHITE, 0.55);
  }
  return { action, header, ring };
}

/** The CSS custom properties the school skin reads (see school-skin.css). */
export function schoolChromeVars(colors: { frame: string; rim?: string | null }): Record<string, string> {
  const c = schoolChrome(colors);
  return {
    "--ff-school": colors.frame,
    "--ff-action": c.action,
    ...(c.ring ? { "--ff-action-ring": c.ring } : {}),
  };
}
