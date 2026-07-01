"use client";

import { getSetPieces, surfacedSets, SURFACED_SET_IDS } from "@/data/sets";
import { usePaletteStore } from "@/stores/palette-store";
import { PaletteTile } from "./PaletteTile";

interface TileGridProps {
  /**
   * "grid" — desktop left column (compact multi-row grid).
   * "row"  — mobile tray (single horizontal-scrolling row of big tiles).
   */
  variant?: "grid" | "row";
}

export function TileGrid({ variant = "grid" }: TileGridProps) {
  const activeSetId = usePaletteStore((s) => s.activeSetId);

  // For launch only the surfaced sets are offered. If the seasonal default
  // landed on a non-surfaced set (e.g. the app is opened in October), fall
  // back to the first surfaced set so the tray is never empty / off-theme.
  const setId = SURFACED_SET_IDS.includes(activeSetId)
    ? activeSetId
    : surfacedSets[0]?.id ?? activeSetId;

  const pieces = getSetPieces(setId);

  if (variant === "row") {
    return (
      <div
        className="flex gap-2 overflow-x-auto overflow-y-hidden pb-1 pt-3
          [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {pieces.map((piece) => (
          <PaletteTile key={piece.id} piece={piece} size="lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {pieces.map((piece) => (
        <PaletteTile key={piece.id} piece={piece} />
      ))}
    </div>
  );
}
