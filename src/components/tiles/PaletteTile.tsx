"use client";

import type { TilePiece } from "@/lib/types";
import { useDragTile } from "@/hooks/useDragTile";
import { usePaletteStore } from "@/stores/palette-store";
import { useUIStore } from "@/stores/ui-store";
import { useDesignStore } from "@/stores/design-store";
import { TileArtwork, hasCustomArtwork, canDieCut } from "./TileArtwork";
import { playSound } from "@/lib/utils/sound";

interface PaletteTileProps {
  piece: TilePiece;
  /** "md" — desktop palette grid. "lg" — bigger thumb target for the mobile tray. */
  size?: "md" | "lg";
}

export function PaletteTile({ piece, size = "md" }: PaletteTileProps) {
  const { setNodeRef, attributes, listeners, style, isDragging } = useDragTile(piece.id);
  const selectedPieceId = usePaletteStore((s) => s.selectedPieceId);
  const selectPiece = usePaletteStore((s) => s.selectPiece);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const dieCut = useDesignStore((s) => s.dieCut);

  const isSelected = selectedPieceId === piece.id;
  const hasArt = hasCustomArtwork(piece.id);
  const isDieCut = dieCut && canDieCut(piece.id);
  const art = size === "lg" ? 56 : 44;

  // Tapping a palette tile ARMS it (selects it for placement) — it does NOT
  // auto-place. Placement happens when the user then taps a cell on the frame
  // (RailSlot drops the armed piece there). Tapping the already-armed tile again
  // disarms it, so a single toggle clears the "PLACING" mode. This is the
  // touch-friendly mirror of dragging a tile onto the frame; the frame lights up
  // with a persistent armed cue the moment a tile is armed (see RailSlot).
  const handleClick = () => {
    if (isSelected) {
      selectPiece(null); // tap the armed tile again → disarm
      if (soundEnabled) playSound("click");
      return;
    }
    selectPiece(piece.id);
    if (soundEnabled) playSound("click");
  };

  return (
    // IMPORTANT: the draggable node (setNodeRef) must stay TRANSFORM-FREE — dnd-kit
    // computes the DragOverlay's position from this element's rect, and any CSS
    // transform on it (scale/translate) corrupts that math and throws the drag
    // ghost across the screen. All hover/active/selected transforms live on the
    // inner wrapper instead; the draggable just handles layout + pointer + opacity.
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      style={style}
      className={`relative cursor-grab active:cursor-grabbing ${size === "lg" ? "shrink-0" : ""} ${isDragging ? "opacity-50" : ""}`}
      title={
        isSelected
          ? `“${piece.name}” is ready — tap a spot on your frame to drop it`
          : `Tap to pick “${piece.name}”, then tap your frame — or drag it on`
      }
    >
      {/* Loud "PLACING" badge on the armed tile — impossible to miss that this
          tile is the one queued to drop onto the next frame cell you tap. Sits
          on the inner wrapper (the draggable node must stay transform-free). */}
      {isSelected && (
        <span
          className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap
            rounded-full border-2 border-[#1e1b17] bg-brand-gold px-2 py-0.5 text-[9px] font-black
            uppercase leading-none tracking-wide text-[#1e1b17] shadow-[1px_1px_0_#1e1b17]
            motion-safe:animate-tile-snap"
        >
          ● Placing
        </span>
      )}
      <div
        className={`
          flex flex-col items-center gap-1 rounded-lg transition-all duration-150
          motion-safe:hover:-translate-y-0.5 active:scale-95
          ${size === "lg" ? "p-2" : "p-1.5"}
          ${isSelected
            ? "ring-[3px] ring-brand-gold bg-brand-gold/20 scale-110 shadow-[0_0_14px_2px_rgba(248,197,59,0.6)] motion-safe:animate-armed-pulse"
            : "hover:bg-surface-700/50"
          }
        `}
      >
      <div
        className={`flex items-center justify-center overflow-hidden ${isDieCut ? "" : "rounded-md tile-3d"}`}
        style={{
          width: art,
          height: art,
          backgroundColor: isDieCut ? "transparent" : piece.backgroundColor,
          filter: isDieCut ? "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" : undefined,
        }}
      >
        {piece.artworkUrl ? (
          <img
            src={piece.artworkUrl}
            alt={piece.name}
            className="rounded-md"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            draggable={false}
          />
        ) : hasArt ? (
          <TileArtwork pieceId={piece.id} size={art - 4} />
        ) : null}
      </div>
      <span
        className={`truncate text-center text-surface-300 ${
          size === "lg" ? "w-16 text-[11px]" : "w-full text-[10px]"
        }`}
      >
        {piece.name}
      </span>
      </div>
    </div>
  );
}
