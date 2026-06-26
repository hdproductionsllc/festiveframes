"use client";

import { memo, useEffect, useState } from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import type { FrameSlot, PlacedTile } from "@/lib/types";
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
}

function RailSlotInner({ slot, placedTile }: RailSlotProps) {
  const { setNodeRef } = useDroppable({ id: slot.id });
  const placeTile = useDesignStore((s) => s.placeTile);
  const selectedPieceId = usePaletteStore((s) => s.selectedPieceId);
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
    placeTile(slot.id, selectedPieceId, setId);
    emitTilePlaced(slot.id);
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
      }}
    >
      {/* Persistent armed-state drop cue — sits ABOVE the tile/cell art but below
          the remove ✕ and sparkle; pointer-events off so it never eats the tap. */}
      {armed && (
        <span
          aria-hidden
          className="ff-armed-cue pointer-events-none absolute inset-0 z-[2] rounded-[3px]"
        />
      )}
      {placedTile ? (
        <PlacedTileCell
          slotId={slot.id}
          pieceId={placedTile.pieceId}
          width={slot.width}
          height={slot.height}
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
  width,
  height,
  armed,
  landing,
}: {
  slotId: string;
  pieceId: string;
  width: number;
  height: number;
  armed: boolean;
  landing?: boolean;
}) {
  const removeTile = useDesignStore((s) => s.removeTile);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const [showRemove, setShowRemove] = useState(false);
  const [poofing, setPoofing] = useState(false);

  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `placed-tile:${slotId}`,
    data: { type: "placed-tile", slotId, pieceId },
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
        style={{ touchAction: "none" }}
      >
        <PlacedTileView pieceId={pieceId} width={width} height={height} />

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
