import type { TileSet, TilePiece } from "@/lib/types";
import { essentialsSet } from "./essentials";
import { fourthOfJulySet } from "./fourth-of-july";
import { easterSet } from "./easter";
import { christmasSet } from "./christmas";
import { halloweenSet } from "./halloween";
import { thanksgivingSet } from "./thanksgiving";
import { valentinesSet } from "./valentines";
import { stPatricksSet } from "./st-patricks";
import { newYearsSet } from "./new-years";
import { hanukkahSet } from "./hanukkah";
import { sakuraSet } from "./sakura";
import { lunarNewYearSet } from "./lunar-new-year";
import { diaDeMuertosSet } from "./dia-de-muertos";
import { kwanzaaSet } from "./kwanzaa";
import { diwaliSet } from "./diwali";
import { militarySet } from "./military";
import { militaryRealisticSet } from "./military-realistic";
import { schoolSet } from "./school";

// Ordered: Essentials first, holidays chronologically, then cultural/themed sets
export const tileSets: TileSet[] = [
  essentialsSet,
  newYearsSet,
  lunarNewYearSet,
  valentinesSet,
  stPatricksSet,
  easterSet,
  fourthOfJulySet,
  halloweenSet,
  diaDeMuertosSet,
  diwaliSet,
  thanksgivingSet,
  kwanzaaSet,
  hanukkahSet,
  christmasSet,
  sakuraSet,
  militarySet,
  militaryRealisticSet,
  schoolSet,
];

/**
 * Sets that are SURFACED in the builder UI for launch.
 *
 * For the July 4th launch we show ONLY the 4th-of-July set so the palette has
 * zero clutter — no "More tile sets" expander, no other holidays. The other set
 * DATA above is intentionally kept (imported, indexed, getSet-able) for
 * post-launch; it's simply not offered in the picker. To bring more sets back
 * after launch, add their ids here.
 */
export const SURFACED_SET_IDS: readonly string[] = ["july4th"];

/** The TileSet objects, in order, that the builder UI should offer. */
export const surfacedSets: TileSet[] = SURFACED_SET_IDS.map(
  (id) => tileSets.find((s) => s.id === id)
).filter((s): s is TileSet => s !== undefined);

/**
 * Sets surfaced in the SCHOOL builder ONLY (/lab/school), kept separate from the
 * global SURFACED_SET_IDS so the school palette can show off-theme-for-consumers
 * tiles (the School Spirit set) WITHOUT touching /build. The school builder passes
 * this to <TilePalette surfacedSetIds={...}> — /build passes nothing and keeps the
 * global list. See TileGrid / QuickActions.
 */
export const SCHOOL_SURFACED_SET_IDS: readonly string[] = ["school"];

/**
 * Resolve which set the palette should actually show. If the (globally shared)
 * active set is in the given surfaced list, use it; otherwise fall back to the
 * first surfaced set so the palette is never empty or off-theme. Defaults to the
 * global SURFACED_SET_IDS, which reproduces /build's original behavior exactly.
 */
export function resolveSurfacedSetId(
  activeSetId: string,
  surfacedIds: readonly string[] = SURFACED_SET_IDS
): string {
  return surfacedIds.includes(activeSetId) ? activeSetId : surfacedIds[0] ?? activeSetId;
}

const setMap = new Map<string, TileSet>(tileSets.map((s) => [s.id, s]));

const pieceMap = new Map<string, TilePiece>();
for (const set of tileSets) {
  for (const piece of set.pieces) {
    pieceMap.set(piece.id, piece);
  }
}

export function getSet(setId: string): TileSet | undefined {
  return setMap.get(setId);
}

export function getPiece(pieceId: string): TilePiece | undefined {
  return pieceMap.get(pieceId);
}

export function getSetPieces(setId: string): TilePiece[] {
  return setMap.get(setId)?.pieces ?? [];
}

/**
 * Returns the tile set ID for the nearest upcoming (or current) holiday.
 * Used as the default active set so the app feels seasonally relevant on first load.
 */
export function getSeasonalSetId(): string {
  const now = new Date();
  const md = now.getMonth() * 100 + now.getDate(); // e.g., Feb 18 → 118

  if (md <= 107) return "newyears";       // thru Jan 7
  if (md <= 215) return "valentines";     // thru Feb 15
  if (md <= 317) return "stpatricks";     // thru Mar 17
  if (md <= 415) return "easter";         // thru Apr 15
  if (md <= 704) return "july4th";        // thru Jul 4
  if (md <= 1031) return "halloween";     // thru Oct 31
  if (md <= 1127) return "thanksgiving";  // thru Nov 27
  if (md <= 1225) return "christmas";     // thru Dec 25
  return "newyears";                      // Dec 26+
}
