"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
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
 * Collision strategy for the builder — built on dnd-kit's `closestCenter`.
 *
 * `closestCenter` ranks droppables by distance from the dragged element's
 * TRANSLATED collision rect (`args.collisionRect`), NOT the raw element. This is
 * the correct reference for BOTH drag models we use:
 *   • palette tiles drag via a source transform — their collision rect tracks the
 *     transformed (floating) tile;
 *   • placed tiles AND banners drag via the DragOverlay — their collision rect is
 *     the overlay ghost, which sits where the user is dragging.
 * Because the rect of a dragged BOTTOM banner stays at the bottom of the frame,
 * the nearest cell can only ever be a bottom cell — a bottom banner can no longer
 * resolve to a top cell (the old pointer-only math could, since the cursor could
 * drift above the bar's center). Drag it up to the top rail and the rect's center
 * crosses into the top cells, so it correctly resolves to top.
 *
 * We gate the nearest hit on PROXIMITY so dragging well off the frame yields no
 * target — that preserves "drag off the frame to remove" for tiles and banners.
 */
const collisionStrategy: CollisionDetection = (args) => {
  const hits = closestCenter(args);
  if (hits.length === 0) return [];
  const nearest = hits[0];
  const rect = args.droppableRects.get(nearest.id);
  const dragRect = args.collisionRect;
  if (!rect || !dragRect) return hits; // permissive if unmeasured
  const dcx = dragRect.left + dragRect.width / 2;
  const dcy = dragRect.top + dragRect.height / 2;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dist = Math.hypot(dcx - cx, dcy - cy);
  const limit = Math.max(rect.width, rect.height) * 1.25; // forgiving; off-frame => remove
  return dist <= limit ? hits : [];
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
            className="pointer-events-none inline-flex max-w-[280px] items-center rounded-[3px] px-3 opacity-90"
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
