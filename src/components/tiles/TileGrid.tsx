"use client";

import { useEffect, useState } from "react";
import type { TilePiece } from "@/lib/types";
import { getSetPieces, resolveSurfacedSetId, SURFACED_SET_IDS } from "@/data/sets";
import { usePaletteStore } from "@/stores/palette-store";
import { useDesignStore } from "@/stores/design-store";
import { uploadPiece } from "@/lib/utils/uploads";
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
  /**
   * Pieces to show AHEAD of the surfaced set — the school's own crest and mascot
   * on a kit page. They lead because they are the reason the page is theirs; a
   * parent should find the Billiken before the generic soccer badge.
   *
   * Kept a prop rather than read from a set id because these are trademarks: they
   * belong to exactly one kit and must not be reachable from another school's
   * palette. See data/sets/school-marks.
   */
  extraPieces?: readonly TilePiece[];
}

const NO_EXTRA: readonly TilePiece[] = [];

export function TileGrid({
  variant = "grid",
  surfacedSetIds = SURFACED_SET_IDS,
  extraPieces = NO_EXTRA,
}: TileGridProps) {
  const activeSetId = usePaletteStore((s) => s.activeSetId);
  const uploads = useDesignStore((s) => s.uploads);
  const removeUpload = useDesignStore((s) => s.removeUpload);

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

  const setPieces = getSetPieces(setId);
  const allPieces = extraPieces.length ? [...extraPieces, ...setPieces] : setPieces;
  // Quick search over the badge library — as the tile catalog grows, typing
  // "soc" beats scrolling. Names are the catalog (every piece has one); empty
  // query = the full set, exactly as before.
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const pieces = q ? allPieces.filter((pc) => pc.name.toLowerCase().includes(q)) : allPieces;
  const searchBox =
    variant === "grid" ? (
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search badges… (soccer, band, honor)"
        aria-label="Search badges"
        className="mb-2 h-9 w-full rounded-lg border border-stone-300 bg-white px-2.5 text-[13.5px] text-stone-900 placeholder:text-stone-400"
      />
    ) : null;

  if (variant === "row") {
    return (
      <div
        className="flex gap-2 overflow-x-auto overflow-y-hidden pb-1 pt-3
          [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Uploads lead the tray for the same reason they lead the grid — see below. */}
        {uploads.map((art) => (
          <PaletteTile
            key={art.id}
            piece={uploadPiece(art)}
            size="lg"
            upload={art}
            onRemove={() => removeUpload(art.id)}
          />
        ))}
        {pieces.map((piece) => (
          <PaletteTile key={piece.id} piece={piece} size="lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      {searchBox}

    <div>
      {/* YOUR UPLOADS, above the catalogue.
          An uploaded crest is the one badge on the frame that is actually theirs, and
          it used to exist only as a placed tile — so putting a second copy on the
          other wing meant uploading the same file again. Here it behaves like every
          other badge: drag it on, tap-then-tap it on, as many times as you like.
          First, not last, because it is the tile they came to place. */}
      {uploads.length > 0 && (
        <div className="mb-3">
          <p className="ff-help mb-1.5 font-medium text-[var(--ff-ink-2,#4b5058)]">Your uploads</p>
          <div className="grid grid-cols-4 gap-1.5">
            {uploads.map((art) => (
              <PaletteTile
                key={art.id}
                piece={uploadPiece(art)}
                upload={art}
                onRemove={() => removeUpload(art.id)}
              />
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-4 gap-1.5">
        {pieces.map((piece, i) => (
          <PaletteTile key={piece.id} piece={piece} demo={demo && i === 0} />
        ))}
      </div>
    </div>
    </>
  );
}
