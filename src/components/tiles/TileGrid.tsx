"use client";

import { getSetPieces } from "@/data/sets";
import { usePaletteStore } from "@/stores/palette-store";
import { PaletteTile } from "./PaletteTile";

export function TileGrid() {
  const activeSetId = usePaletteStore((s) => s.activeSetId);
  const pieces = getSetPieces(activeSetId);

  return (
    <div className="grid grid-cols-4 gap-1">
      {pieces.map((piece) => (
        <PaletteTile key={piece.id} piece={piece} />
      ))}
    </div>
  );
}
