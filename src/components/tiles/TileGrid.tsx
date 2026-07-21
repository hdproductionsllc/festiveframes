"use client";

import { useEffect, useState } from "react";
import { getSetPieces, resolveSurfacedSetId, SURFACED_SET_IDS } from "@/data/sets";
import { usePaletteStore } from "@/stores/palette-store";
import { PaletteTile } from "./PaletteTile";

interface TileGridProps {
  /**
   * "grid" — desktop left column (compact multi-row grid).
   * "row"  — mobile tray (single horizontal-scrolling row of big tiles).
   */
  variant?: "grid" | "row";
  /**
   * Which sets this palette may surface. Defaults to the global SURFACED_SET_IDS
   * (the /build behavior). The school builder passes SCHOOL_SURFACED_SET_IDS so it
   * shows the School Spirit set without changing /build.
   */
  surfacedSetIds?: readonly string[];
}

export function TileGrid({ variant = "grid", surfacedSetIds = SURFACED_SET_IDS }: TileGridProps) {
  const activeSetId = usePaletteStore((s) => s.activeSetId);

  // One-time drag demo: the first tile mimes a pick-up-and-drag on the visitor's
  // very first builder open (localStorage-gated), teaching that tiles are
  // draggable. Only the desktop grid runs it, so the two TileGrid instances
  // (desktop aside + mobile tray) never both fire.
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    if (variant !== "grid") return;
    try {
      if (!localStorage.getItem("ff-drag-demo-seen")) {
        setDemo(true);
        localStorage.setItem("ff-drag-demo-seen", "1");
      }
    } catch {
      /* private mode / storage disabled — just skip the demo */
    }
  }, [variant]);

  // For launch only the surfaced sets are offered. If the seasonal default
  // landed on a non-surfaced set (e.g. the app is opened in October), fall
  // back to the first surfaced set so the tray is never empty / off-theme.
  const setId = resolveSurfacedSetId(activeSetId, surfacedSetIds);

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
      {pieces.map((piece, i) => (
        <PaletteTile key={piece.id} piece={piece} demo={demo && i === 0} />
      ))}
    </div>
  );
}
