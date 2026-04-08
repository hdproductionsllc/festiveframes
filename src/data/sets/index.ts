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
];

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
