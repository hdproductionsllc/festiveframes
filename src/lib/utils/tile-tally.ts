// ─── The tile tally ──────────────────────────────────────────────────────────
//
// "How many of each piece does this design actually produce?" — asked by the
// production parts list (lib/order/parts-list), the eufyMake print queue
// (utils/eufy-print-core) and the in-builder export sheet (ExportPartsList).
//
// All three carried their own copy of the same loop, which meant three places to
// forget a rule. They had already drifted in comments if not yet in code, and the
// parts-list header claims to be the single source of truth while not actually
// owning the count. This module owns it.
//
// It lives in utils/ rather than in parts-list.ts on purpose: parts-list pulls in
// `canDieCut` from a React component, and the SERVER print renderer must not drag
// component code into its import graph.
//
// The rules, in one place:
//   - a tile hidden under a TEXT BAR is not produced (the bar replaces it)
//   - a snappet is ONE part regardless of how many cells it covers — the covered
//     cells hold no record of their own (see utils/snappet), so counting the
//     anchors, as this does, is already correct for multi-cell tiles.
//   - a snappet's FOOTPRINT is part of its identity: a 2x4 flag and a 1x1 flag of
//     the same piece are DIFFERENT physical parts (not interchangeable on the
//     production floor), so the tally keys on pieceId + span, not pieceId alone.

import { coveredSlotIds } from "@/lib/utils/text-bar";
import { tileSpan } from "@/lib/utils/snappet";
import type { PlacedTile, TextBarPlacement, TileSpan } from "@/lib/types";

/** One produced part: a piece at a specific footprint, and how many of it. */
export interface TileTally {
  pieceId: string;
  span: TileSpan;
  qty: number;
}

/**
 * Stable identity key for a piece at a footprint. Built from the NORMALIZED span
 * (via tileSpan at the call site), so an absent span and an explicit 1x1 collapse
 * to the same key — a 1x1-only design keys exactly as `pieceId` did before the
 * span suffix existed for the 1x1 case (`pieceId@1x1`), which is invisible to the
 * consumers because they read the tally's fields, not its keys.
 */
export function tallyKey(pieceId: string, span: TileSpan): string {
  return `${pieceId}@${span.cols}x${span.rows}`;
}

/**
 * Count the produced parts by piece id AND footprint. Insertion order follows
 * `slots`, so callers that sort (all of them do) get a stable result.
 */
export function tallyTiles(
  slots: Record<string, PlacedTile>,
  textBars: TextBarPlacement[],
): Map<string, TileTally> {
  const covered = new Set(coveredSlotIds(textBars));
  const counts = new Map<string, TileTally>();
  for (const [slotId, placed] of Object.entries(slots)) {
    if (covered.has(slotId)) continue; // hidden under a text bar — not produced
    const span = tileSpan(placed); // absent span ⇒ 1x1, same key as an explicit 1x1
    const key = tallyKey(placed.pieceId, span);
    const existing = counts.get(key);
    if (existing) existing.qty += 1;
    else counts.set(key, { pieceId: placed.pieceId, span, qty: 1 });
  }
  return counts;
}
