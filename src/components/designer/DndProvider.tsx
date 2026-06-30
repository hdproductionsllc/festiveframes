"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import type { TextBarRow, BannerPreview } from "@/lib/types";
import { useDesignStore } from "@/stores/design-store";
import { useUIStore } from "@/stores/ui-store";
import { measureTextBarUnits, rowLength, findFreeStart } from "@/lib/utils/text-bar";
import { getPiece } from "@/data/sets";
import { PlacedTileView } from "@/components/frame/PlacedTileView";
import { playSound } from "@/lib/utils/sound";
import { emitTilePlaced } from "@/lib/utils/place-fx";

interface DndProviderProps {
  children: React.ReactNode;
  onOverSlotChange: (slotId: string | null) => void;
  onBannerPreviewChange: (preview: BannerPreview | null) => void;
}

/**
 * Collision strategy for the builder — POINTER-DRIVEN, by point-to-RECT distance.
 *
 * The drop target is the cell under the user's finger/cursor, full stop. We key
 * off the pointer position (`args.pointerCoordinates`) — NOT the dragged
 * element's rect — because our drag sources live in very different places:
 *   • a NEW banner is dragged from a button in the editor panel BELOW the frame,
 *     so its source-element rect sits down in the panel, nowhere near the frame.
 *     An element-rect collision (closestCenter) therefore resolves to whichever
 *     cell is nearest that panel button — the "ghost stuck in a corner, drop
 *     snaps to the top-right" bug.
 *   • palette tiles drag via a source transform; placed tiles/banners drag via
 *     the DragOverlay. The cursor is the one reference common to all of them.
 *
 * We rank cells by the distance from the pointer to each cell's RECTANGLE (0 when
 * the pointer is inside it), NOT to its center. This is what makes the drop cue
 * track the pointer's column tightly:
 *   • Over a column → that cell's rect distance is 0 the instant the pointer
 *     crosses the column edge, so `over` switches exactly at the cell boundary
 *     (no overdrag, no midpoint hysteresis).
 *   • Drifted vertically off the thin rail band (the cursor naturally leads the
 *     banner up toward the plate as you drag) → the cell in the SAME column on
 *     the NEAREST rail still wins, because point-to-rect distance only measures
 *     the vertical gap to the band, not to a faraway center. A center-distance
 *     fallback instead lost the target entirely once the cursor drifted more than
 *     ~1 tile off the band (over went null → the preview froze until you dragged
 *     much further), and could snap a bottom banner onto a SIDE/FAR rail near the
 *     corners — the "preview lags the pointer" bug.
 *   • Pointer well off the frame → distance exceeds the gate → no target, so
 *     "drag off the frame to remove" still works.
 */
const pointToRectDistanceSq = (
  px: number,
  py: number,
  rect: { left: number; top: number; width: number; height: number }
): number => {
  const dx = Math.max(rect.left - px, 0, px - (rect.left + rect.width));
  const dy = Math.max(rect.top - py, 0, py - (rect.top + rect.height));
  return dx * dx + dy * dy;
};

const collisionStrategy: CollisionDetection = (args) => {
  const pointer = args.pointerCoordinates;
  // No pointer yet → no target. This only happens on the first collision frame at
  // drag-start (pointerCoordinates is briefly null before the first move). There is
  // no KeyboardSensor registered, so a real keyboard drag never reaches here. A
  // `closestCenter` fallback would resolve to whichever cell is nearest the dragged
  // SOURCE element (a palette/panel button below-right of the frame) and flash the
  // drop cue into the top-right corner for one frame — the "shadow jumps to the
  // corner on pickup" bug. Returning [] keeps the cue hidden until the pointer is known.
  if (!pointer) return [];

  // The cell whose RECTANGLE is nearest the pointer (0 when the pointer is inside
  // it). A pointer inside a cell yields distance 0, so a cell that contains the
  // pointer always wins — switching exactly at the cell boundary. We also union
  // the cell rects into the frame's bounding box: anywhere INSIDE the frame is a
  // valid aim (resolve to the nearest rail's column, even when the cursor drifts
  // off the thin rail band into the plate area), and only a pointer that leaves
  // the frame by a margin reads as "drag off to remove".
  let best: { id: string | number } | null = null;
  let bestDistSq = Infinity;
  let bestTile = 0;
  let minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
  for (const container of args.droppableContainers) {
    const rect = args.droppableRects.get(container.id);
    if (!rect) continue;
    if (rect.left < minLeft) minLeft = rect.left;
    if (rect.top < minTop) minTop = rect.top;
    if (rect.left + rect.width > maxRight) maxRight = rect.left + rect.width;
    if (rect.top + rect.height > maxBottom) maxBottom = rect.top + rect.height;
    const distSq = pointToRectDistanceSq(pointer.x, pointer.y, rect);
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = { id: container.id };
      bestTile = Math.max(rect.width, rect.height);
    }
  }
  if (!best) return [];
  // Off-frame → no target (preserves "drag off to remove"). Resolve whenever the
  // pointer is inside the frame box, or within ~0.75 tile of its outer edge; past
  // that margin the user has clearly dragged off the frame.
  const margin = bestTile * 0.75;
  const distToFrameSq = pointToRectDistanceSq(pointer.x, pointer.y, {
    left: minLeft, top: minTop, width: maxRight - minLeft, height: maxBottom - minTop,
  });
  return distToFrameSq <= margin * margin ? [best] : [];
};

export function DndProvider({ children, onOverSlotChange, onBannerPreviewChange }: DndProviderProps) {
  const [dragPieceId, setDragPieceId] = useState<string | null>(null);
  const [dragKind, setDragKind] = useState<
    "tile" | "placed-tile" | "textbar" | "placed-textbar" | null
  >(null);
  const [dragBarId, setDragBarId] = useState<string | null>(null);
  const placeTile = useDesignStore((s) => s.placeTile);
  const moveTile = useDesignStore((s) => s.moveTile);
  const removeTile = useDesignStore((s) => s.removeTile);
  const placeTextBar = useDesignStore((s) => s.placeTextBar);
  const moveTextBar = useDesignStore((s) => s.moveTextBar);
  const removeTextBar = useDesignStore((s) => s.removeTextBar);
  const textBars = useDesignStore((s) => s.textBars);
  const bottomBar = useDesignStore((s) => s.bottomBar);
  const qrCode = useDesignStore((s) => s.qrCode);
  const frameConfig = useDesignStore((s) => s.frameConfig);
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
    (slotId: string | null, banner: BannerPreview | null) => {
      onOverSlotChange(slotId);
      onBannerPreviewChange(banner);
    },
    [onOverSlotChange, onBannerPreviewChange]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    setDragKind(
      (data?.type as "tile" | "placed-tile" | "textbar" | "placed-textbar") ?? null
    );
    setDragPieceId((data?.pieceId as string | undefined) ?? null);
    setDragBarId((data?.id as string | undefined) ?? null);
    if (soundEnabled) playSound("pickup");
  }, [soundEnabled]);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const overId = event.over?.id as string | undefined;
      const data = event.active.data.current;
      const kind = data?.type as string | undefined;
      const slotMatch = overId?.match(/^frame:(top|bottom)-(\d+)$/);

      // Banner drags get a banner-shaped FOOTPRINT preview instead of the single
      // cell indicator. Compute the landing rect with the SAME placement math the
      // store commits, so the ghost lines up exactly with where the bar lands.
      if (kind === "textbar" || kind === "placed-textbar") {
        if (!slotMatch) {
          setCue(null, null);
          return;
        }
        const row = slotMatch[1] as TextBarRow;
        const dropIndex = parseInt(slotMatch[2], 10);
        const maxUnits = rowLength(frameConfig, row);

        if (kind === "textbar") {
          // New banner: width from the draft; snap to the nearest free run at the
          // DROP column — mirrors `placeTextBar`, so the footprint preview shows
          // exactly where the bar will land (qr rides the FIRST bar only).
          const isFirst = textBars.length === 0;
          const qr = isFirst ? qrCode.enabled : false;
          const widthUnits = measureTextBarUnits(bottomBar, qr, maxUnits);
          const start = findFreeStart(textBars, row, widthUnits, maxUnits, dropIndex);
          setCue(
            null,
            start === null
              ? { row, startIndex: 0, widthUnits, valid: false, backgroundColor: bottomBar.backgroundColor }
              : { row, startIndex: start, widthUnits, valid: true, backgroundColor: bottomBar.backgroundColor }
          );
          return;
        }

        // Moving an existing bar: its own width, snapped to the nearest free
        // column at the drop (excluding itself) — mirrors `moveTextBar`.
        const bar = textBars.find((b) => b.id === dragBarId);
        if (!bar) {
          setCue(null, null);
          return;
        }
        const start = findFreeStart(textBars, row, bar.widthUnits, maxUnits, dropIndex, bar.id);
        setCue(
          null,
          start === null
            ? { row, startIndex: bar.startIndex, widthUnits: bar.widthUnits, valid: false, backgroundColor: bar.config.backgroundColor }
            : { row, startIndex: start, widthUnits: bar.widthUnits, valid: true, backgroundColor: bar.config.backgroundColor }
        );
        return;
      }

      // Tile drags: drive the single gliding drop indicator via the over slot id.
      setCue(overId?.startsWith("frame:") ? overId : null, null);
    },
    [setCue, textBars, bottomBar, qrCode, frameConfig, dragBarId]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragPieceId(null);
      setDragKind(null);
      setDragBarId(null);
      setCue(null, null);

      const overId = event.over?.id as string | undefined;
      const data = event.active.data.current;
      const slotMatch = overId?.match(/^frame:(top|bottom)-(\d+)$/);

      // New text bar: snaps onto the run of top/bottom slots at the drop.
      if (data?.type === "textbar") {
        if (slotMatch) {
          placeTextBar(slotMatch[1] as TextBarRow, parseInt(slotMatch[2], 10));
          if (soundEnabled) playSound("snap");
        }
        return;
      }

      // Existing bar: move to the new run, or drag off the frame to trash it.
      if (data?.type === "placed-textbar") {
        const id = data.id as string;
        if (slotMatch) {
          moveTextBar(id, slotMatch[1] as TextBarRow, parseInt(slotMatch[2], 10));
          if (soundEnabled) playSound("snap");
        } else {
          removeTextBar(id);
          if (soundEnabled) playSound("pop");
        }
        return;
      }

      // Placed tile: dropped on another cell MOVES it; dropped off the frame
      // POOFS it away. Mirrors the placed-textbar drag model.
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
    [
      placeTile,
      moveTile,
      removeTile,
      placeTextBar,
      moveTextBar,
      removeTextBar,
      soundEnabled,
      setCue,
    ]
  );

  const handleDragCancel = useCallback(() => {
    setDragPieceId(null);
    setDragKind(null);
    setDragBarId(null);
    setCue(null, null);
  }, [setCue]);

  const piece = dragPieceId ? getPiece(dragPieceId) : null;
  const dragBar = dragBarId ? textBars.find((b) => b.id === dragBarId) : null;
  const overlayBar =
    dragKind === "placed-textbar" ? dragBar?.config : dragKind === "textbar" ? bottomBar : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      autoScroll={false}
      // ALWAYS re-measure droppables (don't cache on drag start): a stale or
      // missing cell rect could otherwise misroute the nearest-cell target, e.g.
      // resolving a bottom banner to a top cell after a layout shift. Fresh rects
      // mean closestCenter always ranks against the true on-screen cell positions.
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {overlayBar ? (
          <div
            className="ff-drag-lift pointer-events-none inline-flex max-w-[280px] items-center rounded-[3px] px-3"
            style={{ height: 34, background: overlayBar.backgroundColor }}
          >
            <span
              className="truncate font-bold"
              style={{
                fontFamily: overlayBar.fontFamily,
                color: overlayBar.textColor,
                letterSpacing: overlayBar.letterSpacing,
              }}
            >
              {overlayBar.text || "YOUR TEXT HERE"}
            </span>
          </div>
        ) : piece && dragKind === "placed-tile" ? (
          // Tile-sized ghost that lifts off the workbench (placed-tile drags use
          // the overlay; palette tiles use a source transform).
          <div
            className="ff-drag-lift relative pointer-events-none"
            style={{ width: 48, height: 48 }}
          >
            <PlacedTileView pieceId={piece.id} width={48} height={48} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
