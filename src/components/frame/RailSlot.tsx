"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import type { FrameSlot, PlacedTile, TilePiece, TileSpan } from "@/lib/types";
import {
  frameCorners,
  grabOffsetIn,
  isMultiCell,
  minSpanFor,
  resolveSnappetDrop,
  tileSpan,
  type GrabOffset,
} from "@/lib/utils/snappet";
import { buildGrid } from "@/lib/utils/slot-generator";
import { coveredSlotIds } from "@/lib/utils/text-bar";
import { getPiece } from "@/data/sets";
import { findUpload } from "@/lib/utils/uploads";
import { NO_CORNERS, type CornerFlags } from "@/lib/utils/tile-theme";
import { PlacedTileView } from "./PlacedTileView";
import { SparkleBurst } from "./SparkleBurst";
import { useDesignStore } from "@/stores/design-store";
import { usePaletteStore } from "@/stores/palette-store";
import { useUIStore } from "@/stores/ui-store";
import { playSound } from "@/lib/utils/sound";
import { emitTilePlaced, onTilePlaced } from "@/lib/utils/place-fx";

interface RailSlotProps {
  slot: FrameSlot;
  placedTile: PlacedTile | undefined;
  /**
   * This cell is HIDDEN UNDER a multi-cell snappet anchored in another cell (see
   * `coveredBySnappets`). It still registers its droppable — the grid of drop
   * targets must stay complete — but it paints NOTHING: no art, no empty-cell
   * surface, no armed cue. The anchor's art is what the user sees here, and a
   * covered cell drawing its own chrome would show through the seams of the tile
   * sitting on top of it. Always false/undefined on /build (no design has a span).
   */
  covered?: boolean;
  /**
   * The pixel footprint of a multi-cell tile ANCHORED in this cell — the width and
   * height of `snappetRect`. Passed as two numbers rather than a rect object so the
   * `memo` below still compares equal across a drag's re-renders. Undefined = a
   * plain 1x1 tile drawn at the cell's own size (every tile on /build).
   *
   * The x/y are deliberately absent: the anchor cell is ALREADY positioned at the
   * snappet's origin, so the tile simply overflows its cell to the right/down.
   */
  spanWidth?: number;
  spanHeight?: number;
}

function RailSlotInner({ slot, placedTile, covered, spanWidth, spanHeight }: RailSlotProps) {
  const { setNodeRef } = useDroppable({ id: slot.id });
  const placeTile = useDesignStore((s) => s.placeTile);
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const slots = useDesignStore((s) => s.slots);
  const sections = useDesignStore((s) => s.sections);
  const textBars = useDesignStore((s) => s.textBars);
  const selectedPieceId = usePaletteStore((s) => s.selectedPieceId);
  const uploads = useDesignStore((s) => s.uploads);
  const soundEnabled = useUIStore((s) => s.soundEnabled);

  // A festive snap+sparkle whenever a tile LANDS in this cell. Every place site
  // (drag-drop, tap-to-place, palette tap, move) emits a `tile-placed` event for
  // the target slot; we subscribe and, when it's OUR slot, bump `burstKey` to
  // remount the one-shot sparkle overlay and flag `landing` to play the snap pop.
  // Event-driven so it fires only on real placements; CSS gates the showy bits
  // on motion-safe. The brief `landing` flag self-clears after the animation.
  const [burstKey, setBurstKey] = useState(0);
  const [landing, setLanding] = useState(false);
  useEffect(() => {
    return onTilePlaced((placedSlotId) => {
      if (placedSlotId !== slot.id) return;
      setBurstKey((k) => k + 1);
      setLanding(true);
      window.setTimeout(() => setLanding(false), 320);
    });
  }, [slot.id]);

  const handleClick = () => {
    // Tap-to-place: when a palette tile is armed, tapping any cell drops it here
    // (replacing whatever was there). The touch-friendly mirror of dragging a
    // tile onto the frame. (Tapping a placed tile with no armed piece reveals
    // its remove ✕ — handled inside PlacedTileCell.)
    if (!selectedPieceId) return;
    const setId = selectedPieceId.split(":")[0];
    // Resolve the footprint the SAME way a drag does. This used to call placeTile
    // with no span at all, so every tap produced a 1x1 no matter what the frame's
    // floor said — and tap is the primary gesture on touch, the one the armed
    // banner tells you to use. Two gestures for one action must not disagree.
    // An UPLOAD is not in the catalogue, so `getPiece` cannot answer for it — its
    // footprint comes from the tray entry instead. Same shape either way, so the
    // resolution below is identical for a crest and for a catalogue badge.
    const art = findUpload(uploads, selectedPieceId);
    const piece = art
      ? ({ defaultSpan: art.span, spanRequired: false } as Pick<TilePiece, "defaultSpan" | "spanRequired">)
      : getPiece(selectedPieceId);
    const drop = resolveSnappetDrop(
      {
        grid: buildGrid(frameConfig),
        slots,
        sections,
        barCovered: new Set(coveredSlotIds(textBars)),
      },
      {
        overSlotId: slot.id,
        span: piece?.defaultSpan ?? { cols: 1, rows: 1 },
        shrinkToFit: !piece?.spanRequired,
        growToPanel: !piece?.spanRequired,
        minSpan: minSpanFor(piece, frameConfig.minTileSpan),
      },
    );
    // Commit the RESOLVED footprint, not the requested one.
    const span = drop ? { cols: drop.cols, rows: drop.rows } : undefined;
    placeTile(
      drop?.anchorSlotId ?? slot.id,
      selectedPieceId,
      setId,
      span && isMultiCell(span) ? span : undefined,
    );
    emitTilePlaced(drop?.anchorSlotId ?? slot.id);
    if (soundEnabled) playSound("snap");
  };

  // A cell invites interaction when a tap would do something: place the armed
  // tile (any cell) or reveal the remove affordance (a filled cell). Only then
  // do we surface a pointer cursor + soft hover ring.
  const isActionable = selectedPieceId != null || placedTile != null;
  const cursorClass = isActionable ? "group cursor-pointer" : "cursor-default";

  // KEY mobile cue: while a tile is armed there is NO hover on touch, so EVERY
  // cell wears a persistent gold dashed outline + slow pulse — a loud, standing
  // invitation to "tap the frame to drop." It overlays both empty and filled
  // cells (you can replace a filled cell) and vanishes the instant nothing is
  // armed. Reduced-motion users still get the static dashed ring (pulse frozen).
  const armed = selectedPieceId != null;

  // A snappet's footprint, or the cell's own size for a plain 1x1. The cell BOX is
  // always one grid cell (it is the droppable); only the tile drawn inside it grows.
  const tileWidth = spanWidth ?? slot.width;
  const tileHeight = spanHeight ?? slot.height;

  // Which of this badge's corners face the frame's OUTSIDE. Derived from the grid's
  // own extremes, so widening the side panels cannot leave the treatment pointing at
  // cells that are no longer corners.
  const corners = placedTile
    ? frameCorners(
        buildGrid(frameConfig),
        { row: slot.row, col: slot.col },
        tileSpan(placedTile),
      )
    : NO_CORNERS;
  const isSnappet = spanWidth !== undefined || spanHeight !== undefined;

  // Hidden under someone else's snappet: the droppable and nothing else. No click
  // handler either — placing a 1x1 into a cell buried under a snappet would create
  // a tile the user can neither see nor reach.
  if (covered) {
    return (
      <div
        ref={setNodeRef}
        aria-hidden
        className="absolute"
        style={{ left: slot.x, top: slot.y, width: slot.width, height: slot.height }}
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={`absolute ${cursorClass}`}
      style={{
        left: slot.x,
        top: slot.y,
        width: slot.width,
        height: slot.height,
        // A multi-cell tile overflows its cell, so it must paint ABOVE the empty
        // cells it hangs over (they are later siblings in DOM order).
        zIndex: isSnappet ? 1 : undefined,
      }}
    >
      {/* Persistent armed-state drop cue — sits ABOVE the tile/cell art but below
          the remove ✕ and sparkle; pointer-events off so it never eats the tap.
          Sized to the TILE, so on a snappet the cue outlines the whole footprint
          the tap would replace rather than just its anchor corner. */}
      {armed && (
        <span
          aria-hidden
          className="ff-armed-cue pointer-events-none absolute inset-0 z-[2] rounded-[3px]"
          style={isSnappet ? { width: tileWidth, height: tileHeight } : undefined}
        />
      )}
      {placedTile ? (
        <PlacedTileCell
          slotId={slot.id}
          pieceId={placedTile.pieceId}
          image={placedTile.image}
          span={tileSpan(placedTile)}
          width={tileWidth}
          height={tileHeight}
          unit={slot.width}
          corners={corners}
          armed={selectedPieceId != null}
          landing={landing}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {/* Empty cell — gold hover ring when a tap would place the armed tile
              here, so empty slots read as clickable drop targets. Gapless (no
              black gaps on tile removal), but each empty reads as its OWN tile
              via `ff-empty-cell`: a faint hairline + soft inset shadow that hints
              the same 3D grid the filled tiles show, without reintroducing gaps. */}
          <div
            className={`ff-empty-cell rounded-[2px] transition-shadow ${
              selectedPieceId != null ? "group-hover:ring-2 group-hover:ring-brand-gold/70" : ""
            }`}
            style={{
              width: slot.width,
              height: slot.height,
            }}
          />
        </div>
      )}

      {/* One-shot patriotic sparkle when a tile lands here. Keyed so each landing
          remounts a fresh, self-removing burst; pointer-events off so it never
          blocks the next interaction. */}
      {burstKey > 0 && <SparkleBurst key={burstKey} />}
    </div>
  );
}

/**
 * Memoized: a drag no longer re-renders every cell. The drop cue is now a single
 * gliding indicator in FrameCanvas (no per-slot `isOver`), so a RailSlot only
 * re-renders when ITS own props change (its placed tile) — not on every pointer
 * move. The `armed`/sparkle state it still reads comes from stable store hooks,
 * which update independently of the drag. This kills the per-move re-render storm.
 */
export const RailSlot = memo(RailSlotInner);

/**
 * A placed tile: draggable to move it to another cell, or drag it OFF the frame
 * to poof it away (handled in DndProvider via `type: "placed-tile"`).
 *
 * Touch fallback: with no armed palette tile, tapping reveals a ✕ to remove
 * (drag-off is awkward on a phone). The ✕ state lives here so it auto-clears
 * when the tile is moved/removed and this component unmounts.
 */
function PlacedTileCell({
  slotId,
  pieceId,
  image,
  span,
  width,
  height,
  unit,
  corners,
  armed,
  landing,
}: {
  slotId: string;
  pieceId: string;
  image?: { url: string; fullResId?: string };
  span: TileSpan;
  width: number;
  height: number;
  /** ONE grid cell in px — the reference the badge's edge is measured against, so a
   *  3x3 snappet wears the same thin moulding as a 1x1. */
  unit: number;
  /** Which corners face the frame's outside — see `frameCorners`. */
  corners: CornerFlags;
  armed: boolean;
  landing?: boolean;
}) {
  const removeTile = useDesignStore((s) => s.removeTile);
  // This tile's own colour overrides, read by slot id rather than threaded down
  // through FrameCanvas. Selecting the TILE (not a derived object) keeps the
  // reference stable until the tile itself changes.
  const ownColors = useDesignStore((s) => s.slots[slotId]);
  const wings = useDesignStore((s) => s.frameConfig.wings);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const selectSnappet = useUIStore((s) => s.selectSnappet);
  const selectBar = useDesignStore((s) => s.selectBar);
  const selectSection = useDesignStore((s) => s.selectSection);
  const [showRemove, setShowRemove] = useState(false);
  const [poofing, setPoofing] = useState(false);

  // WHICH CELL of the footprint the pointer is holding — see `GrabOffset`.
  //
  // Handed to dnd-kit as the REF ITSELF, not as a value, and deliberately so:
  // dnd-kit reads `active.data.current` at the moment the drag ACTIVATES, which is
  // the first pointermove past the 5px threshold and can land in the same frame as
  // the pointerdown — before any re-render has committed. A value copied into
  // `data` at render time would therefore be last gesture's offset on a quick
  // flick, and the snappet would jump. A ref is read when the drop is resolved, so
  // it is always the offset this pointerdown wrote. Inert for a 1x1 — it stays
  // {0,0} — so /build is untouched.
  const grabOffset = useRef<GrabOffset>({ dr: 0, dc: 0 });
  const captureGrab = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMultiCell(span)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    grabOffset.current = grabOffsetIn(rect, { x: e.clientX, y: e.clientY }, span);
  };

  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `placed-tile:${slotId}`,
    // `span` rides along so the collision strategy and the drop resolver can size
    // the footprint without a store read; `grabOffset` so they can locate it;
    // `image` so the drag overlay lifts the actual photo for uploaded art.
    data: { type: "placed-tile", slotId, pieceId, span, grabOffset, image },
  });

  // Dismiss the ✕ on any outside tap so it never lingers.
  useEffect(() => {
    const dismiss = (e: PointerEvent) => {
      // A tap on our own ✕/tile is handled by the local handlers; ignore those.
      if (!(e.target as HTMLElement)?.closest?.(`[data-tile-cell="${slotId}"]`)) {
        setShowRemove(false);
      }
    };
    window.addEventListener("pointerdown", dismiss);
    return () => window.removeEventListener("pointerdown", dismiss);
  }, [slotId]);

  const handleTileClick = (e: React.MouseEvent) => {
    // When a palette tile is armed, let the cell's click bubble so RailSlot
    // does the place. Otherwise this tap toggles the remove ✕.
    if (armed) return;
    e.stopPropagation();
    setShowRemove((v) => !v);
    // Tap SELECTS the tile for resize. On a snappet-capable frame (the school frame,
    // which has wings) ANY tile is selectable — so a 1x1 or a freshly-placed photo can
    // be grown, not just an already-multi-cell snappet. The selected tile gets on-canvas
    // handles (multi-cell) and the size-stepper control. /build has no wings, so this
    // stays multi-cell-only there and its behavior is unchanged. stopPropagation above
    // keeps the frame's deselect-on-empty-click from firing.
    if (wings || isMultiCell(span)) {
      // Picking up a tile CLOSES whatever editor was open, the mirror of `selectBar`
      // and `selectSection` dismissing this. Making it one-directional was not enough:
      // if a section editor was already open and you then tapped a tile, nothing
      // changed selection on that side, so the fixed-position size control simply
      // appeared on top of the open editor — the same symptom, reached the other way
      // round.
      selectBar(null);
      selectSection(null);
      selectSnappet(slotId);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPoofing(true);
    if (soundEnabled) playSound("pop");
    window.setTimeout(() => removeTile(slotId), 200); // let the poof play out
  };

  return (
    <div
      data-tile-cell={slotId}
      // Captured on the WRAPPER, not the draggable inside it: the wrapper's box is
      // exactly the footprint and carries no transform, while the inner tile wears
      // a `hover:scale-[1.04]`, whose inflated rect would bias the offset by up to
      // half a cell across a wide snappet. Capture phase, so it runs before
      // dnd-kit's own pointerdown listener starts the drag.
      onPointerDownCapture={captureGrab}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height,
        zIndex: showRemove ? 3 : undefined,
      }}
    >
      {/* Cream empty-cell surface painted BEHIND the tile. When the tile shrinks
          and fades on removal (or while it's the drag source), what shows through
          is the design-surface cream — never the black frame base (#111111). This
          is the same surface the empty cell paints, so removal lands cleanly on
          cream with no black flash. */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-[2px]"
        style={{ background: "#ffffff" }}
      />

      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={handleTileClick}
        title="Drag to move · drag off the frame to remove"
        className={`absolute inset-0 cursor-grab active:cursor-grabbing transition-transform duration-150
          ${isDragging ? "opacity-40" : "hover:scale-[1.04]"}
          ${poofing ? "animate-tile-poof" : landing ? "motion-safe:animate-tile-snap" : ""}`}
        // pan-y: let the page scroll vertically off a placed tile; a press-and-hold
        // still starts a drag via the delay-based TouchSensor (see DndProvider).
        style={{ touchAction: "pan-y" }}
      >
        <PlacedTileView
          pieceId={pieceId}
          image={image}
          width={width}
          height={height}
          unit={unit}
          corners={corners}
          fieldOverride={ownColors?.field}
          rimOverride={ownColors?.rim}
        />

        {/* Poof puff — a quick patriotic sparkle puff as the tile disappears. */}
        {poofing && <SparkleBurst variant="poof" />}
      </div>

      {/* Touch fallback remove — a small, obvious ✕ revealed on tap. Lives on the
          outer wrapper (not the poofing tile) so it stays put and never shrinks
          with the poof. */}
      {showRemove && (
        <button
          type="button"
          aria-label="Remove tile"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleRemove}
          className="absolute right-0.5 top-0.5 z-[4] grid h-5 w-5 place-items-center rounded-full
            border-2 border-[#1e1b17] bg-brand-red text-[11px] font-black leading-none text-white
            shadow-[1px_1px_0_#1e1b17] active:scale-90"
          style={{ touchAction: "manipulation" }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
