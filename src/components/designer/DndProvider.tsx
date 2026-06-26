"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type ClientRect,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { useDesignStore } from "@/stores/design-store";
import { useUIStore } from "@/stores/ui-store";
import { getPiece } from "@/data/sets";
import { PlacedTileView } from "@/components/frame/PlacedTileView";
import { playSound } from "@/lib/utils/sound";
import { emitTilePlaced } from "@/lib/utils/place-fx";

interface DndProviderProps {
  children: React.ReactNode;
  onOverSlotChange: (slotId: string | null) => void;
}

/**
 * Collision strategy for the builder — POINTER-BASED and consistent.
 *
 * The single source of truth is the CURSOR position: we pick the droppable whose
 * center is nearest the pointer. This matters because palette tiles drag via a
 * source transform (the floating tile is offset from the cursor), so any rect-
 * based strategy (`closestCenter`) would resolve to where the tile element is,
 * not where the cursor is — making the drop land somewhere other than the
 * preview. Pointer-based throughout means the drop indicator and the actual drop
 * ALWAYS agree, and the tile lands exactly under the cursor.
 *
 * Over a real cell the pointer is inside it, so that cell wins. Over the center
 * plate / gaps it resolves to the nearest cell to the cursor and the indicator
 * glides there. Drag well off the frame (pointer further than ~0.75 of a tile
 * from every cell) → no target → "drag off to remove" still fires.
 */
const collisionStrategy: CollisionDetection = (args) => {
  const pointer = args.pointerCoordinates;
  if (!pointer) return [];

  let best: (typeof args.droppableContainers)[number] | null = null;
  let bestRect: ClientRect | null = null;
  let bestDist = Infinity;
  for (const c of args.droppableContainers) {
    const r = args.droppableRects.get(c.id);
    if (!r) continue;
    const dx = pointer.x - (r.left + r.width / 2);
    const dy = pointer.y - (r.top + r.height / 2);
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = c;
      bestRect = r;
    }
  }
  if (!best || !bestRect) return [];

  // Off-frame → no target so "drag off to remove" still works.
  const margin = Math.max(bestRect.width, bestRect.height) * 0.75;
  const near =
    pointer.x >= bestRect.left - margin &&
    pointer.x <= bestRect.right + margin &&
    pointer.y >= bestRect.top - margin &&
    pointer.y <= bestRect.bottom + margin;
  return near ? [{ id: best.id }] : [];
};

export function DndProvider({ children, onOverSlotChange }: DndProviderProps) {
  const [dragPieceId, setDragPieceId] = useState<string | null>(null);
  const [dragKind, setDragKind] = useState<"tile" | "placed-tile" | null>(null);
  const placeTile = useDesignStore((s) => s.placeTile);
  const moveTile = useDesignStore((s) => s.moveTile);
  const removeTile = useDesignStore((s) => s.removeTile);
  const soundEnabled = useUIStore((s) => s.soundEnabled);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  // Touch drag activation, tuned so all three gestures stay distinct on a phone:
  //  • a quick TAP releases before `delay` → never starts a drag (stays a tap);
  //  • a SCROLL flick past `tolerance` before `delay` → cancels, page still scrolls;
  //  • a deliberate PRESS-AND-HOLD → starts the drag.
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 180, tolerance: 8 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  // Drop-cue updates go through directly (no rAF coalescing): `onDragOver` only
  // fires when the `over` target CHANGES (not every pixel), so this is cheap, and
  // — critically — the visible indicator is ALWAYS the live `over` that the drop
  // will use, so the preview can never be a frame stale relative to the drop.
  // RailSlot is memoized, so updating the cue re-renders only the indicator.
  const setCue = useCallback(
    (slotId: string | null) => {
      onOverSlotChange(slotId);
    },
    [onOverSlotChange]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    setDragKind((data?.type as "tile" | "placed-tile") ?? null);
    setDragPieceId((data?.pieceId as string | undefined) ?? null);
    if (soundEnabled) playSound("pickup");
  }, [soundEnabled]);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const overId = event.over?.id as string | undefined;
      // Tile drags: drive the single gliding drop indicator via the over slot id.
      // (Banners are drag-free — they place/move via taps, not the DnD context.)
      setCue(overId?.startsWith("frame:") ? overId : null);
    },
    [setCue]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragPieceId(null);
      setDragKind(null);
      setCue(null);

      const overId = event.over?.id as string | undefined;
      const data = event.active.data.current;

      // Placed tile: dropped on another cell MOVES it; dropped off the frame
      // POOFS it away.
      if (data?.type === "placed-tile") {
        const fromSlotId = data.slotId as string;
        if (overId?.startsWith("frame:")) {
          moveTile(fromSlotId, overId);
          emitTilePlaced(overId);
          if (soundEnabled) playSound("snap");
        } else {
          removeTile(fromSlotId);
          if (soundEnabled) playSound("pop");
        }
        return;
      }

      const pieceId = data?.pieceId as string | undefined;
      if (overId?.startsWith("frame:") && pieceId) {
        const setId = pieceId.split(":")[0];
        placeTile(overId, pieceId, setId);
        emitTilePlaced(overId);
        if (soundEnabled) playSound("snap");
      }
    },
    [placeTile, moveTile, removeTile, soundEnabled, setCue]
  );

  const handleDragCancel = useCallback(() => {
    setDragPieceId(null);
    setDragKind(null);
    setCue(null);
  }, [setCue]);

  const piece = dragPieceId ? getPiece(dragPieceId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      autoScroll={false}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {piece && dragKind === "placed-tile" ? (
          // Plain, statically-positioned, tile-sized ghost (placed-tile drags use
          // the overlay; palette tiles use a source transform).
          <div
            className="relative pointer-events-none opacity-90"
            style={{ width: 48, height: 48 }}
          >
            <PlacedTileView pieceId={piece.id} width={48} height={48} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
