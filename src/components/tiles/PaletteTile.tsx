"use client";

import type { TilePiece } from "@/lib/types";
import { useDragTile } from "@/hooks/useDragTile";
import { usePaletteStore } from "@/stores/palette-store";
import { useUIStore } from "@/stores/ui-store";
import { useDesignStore } from "@/stores/design-store";
import { TileArtwork, hasCustomArtwork, canDieCut } from "./TileArtwork";
import { tileField } from "@/lib/utils/tile-theme";
import { playSound } from "@/lib/utils/sound";
import type { UploadedArt } from "@/lib/utils/uploads";

interface PaletteTileProps {
  piece: TilePiece;
  /** "md" — desktop palette grid. "lg" — bigger thumb target for the mobile tray. */
  size?: "md" | "lg";
  /** One-time onboarding: mime a pick-up-and-drag so it's obvious tiles are
   *  draggable. Set on the first tile, first visit only (see TileGrid). */
  demo?: boolean;
  /**
   * Set when this swatch is UPLOADED art rather than a catalogue piece. The drag
   * then carries the art and its footprint itself, because `getPiece` — the only
   * thing a drag can otherwise ask — does not hold uploads by design.
   */
  upload?: UploadedArt;
  /** Remove this upload from the tray. Only rendered when given. */
  onRemove?: () => void;
}

export function PaletteTile({ piece, size = "md", demo = false, upload, onRemove }: PaletteTileProps) {
  const { setNodeRef, attributes, listeners, style, isDragging } = useDragTile(
    piece.id,
    upload
      ? { span: upload.span, image: { url: upload.url, fullResId: upload.fullResId } }
      : undefined,
  );
  const selectedPieceId = usePaletteStore((s) => s.selectedPieceId);
  const selectPiece = usePaletteStore((s) => s.selectPiece);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const dieCut = useDesignStore((s) => s.dieCut);
  const tileFieldColor = useDesignStore((s) => s.tileFieldColor);

  const isSelected = selectedPieceId === piece.id;
  const hasArt = hasCustomArtwork(piece.id);
  const isDieCut = dieCut && canDieCut(piece.id);
  // WYSIWYG swatch. The palette drew every piece as a square, so the 2:1 PORTRAIT
  // badges — the tall crests, the pennant, the tie — advertised a 1x1 and then
  // landed twice as tall as the thumbnail promised. The swatch now takes the
  // piece's own footprint: the long side gets the full box and the short side is
  // scaled down from it, so a 1x2 reads as a tall narrow chip and a 2x1 as a wide
  // one. The BOX stays square either way, so the grid's rows stay even.
  const box = size === "lg" ? 56 : 52;
  const span = piece.defaultSpan ?? { cols: 1, rows: 1 };
  const longSide = Math.max(1, span.cols, span.rows);
  const artW = Math.round((box * Math.max(1, span.cols)) / longSide);
  const artH = Math.round((box * Math.max(1, span.rows)) / longSide);

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
      // `ff-ptile` is an inert marker for the /lab/school re-skin and nothing else.
      // It exists because this component's armed state is painted with classes it
      // SHARES with the frame itself — `shadow-[1px_1px_0_#1e1b17]` is also on
      // RailSlot's on-frame ✕, and the frame is explicitly out of scope — so the
      // school stylesheet anchors on this marker rather than on those class names.
      // Matches no rule outside school-skin.css, which requires `.school-skin`.
      className={`ff-ptile group relative cursor-grab active:cursor-grabbing ${size === "lg" ? "shrink-0" : ""} ${isDragging ? "opacity-50" : ""}`}
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
          {/* The bullet is decorative — the badge shape and the accent tint already
              carry "this tile is armed" — so /lab/school drops it. The trailing
              space lives INSIDE the hidden span so no stray leading space survives
              when it is hidden. /build renders "● Placing" unchanged. */}
          <span className="ff-glyph">● </span>Placing
        </span>
      )}
      {/* Remove an upload from the tray. `stopPropagation` on POINTERDOWN as well as
          click: the drag listeners live on the parent node, so without it a tap on
          the ✕ starts dragging the very tile it is meant to delete. Tiles already
          placed from this upload are untouched — they carry their own copy. */}
      {onRemove && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${piece.name} from your uploads`}
          title="Remove from your uploads"
          className="absolute -right-1 -top-1 z-20 grid h-[18px] w-[18px] place-items-center rounded-full
            border border-[var(--ff-line,#1e1b17)] bg-[var(--ff-card,#fff)] text-[11px] leading-none
            text-[var(--ff-ink-2,#4b5058)] opacity-0 transition-opacity group-hover:opacity-100
            focus-visible:opacity-100"
        >
          ×
        </button>
      )}
      {/* Drag-grip affordance — the universal "pick me up" signal. Faintly present
          on every tile, brighter on hover, so it's obvious the tiles are draggable
          (not just tappable). Hidden while armed (the Placing badge takes over). */}
      {size !== "lg" && !isSelected && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-1 top-1 z-10 text-[#1e1b17]/25 opacity-70 transition-all group-hover:text-[#1e1b17]/55 group-hover:opacity-100"
        >
          <svg width="7" height="11" viewBox="0 0 8 12" fill="currentColor">
            <circle cx="2" cy="2" r="1" /><circle cx="6" cy="2" r="1" />
            <circle cx="2" cy="6" r="1" /><circle cx="6" cy="6" r="1" />
            <circle cx="2" cy="10" r="1" /><circle cx="6" cy="10" r="1" />
          </svg>
        </span>
      )}
      <div
        className={`
          flex flex-col items-center gap-1 rounded-lg transition-all duration-150
          motion-safe:hover:-translate-y-0.5 active:scale-95
          ${demo ? "ff-drag-demo" : ""}
          ${size === "lg" ? "p-2" : "p-1.5"}
          ${isSelected
            ? "ring-[3px] ring-brand-gold bg-brand-gold/20 scale-110 shadow-[0_0_14px_2px_rgba(248,197,59,0.6)] motion-safe:animate-armed-pulse"
            : "hover:bg-surface-700/50"
          }
        `}
      >
      {/* Square OUTER box keeps the grid even; the tile inside it carries the real
          footprint, so a portrait badge is a tall chip in a square slot. */}
      <div className="flex items-center justify-center" style={{ width: box, height: box }}>
      <div
        className={`flex items-center justify-center overflow-hidden ${isDieCut ? "" : "rounded-md tile-3d"}`}
        style={{
          width: artW,
          height: artH,
          // The palette must show the SAME field the frame will paint, or picking a
          // tile is a guess: with a school colour applied, a swatch still showing its
          // designed navy is advertising a tile that no longer exists.
          backgroundColor: isDieCut ? "transparent" : tileField(piece, tileFieldColor),
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
          <TileArtwork pieceId={piece.id} size={Math.min(artW, artH) - 4} />
        ) : null}
      </div>
      </div>
      {/* Tile name — only on the mobile tray (lg). On the desktop grid the art is
          self-explanatory and the labels just bloated the rail, so they're dropped
          (the full name still shows in the title tooltip on hover). */}
      {size === "lg" && (
        <span className="w-16 truncate text-center text-[11px] text-surface-300">
          {piece.name}
        </span>
      )}
      </div>
    </div>
  );
}
