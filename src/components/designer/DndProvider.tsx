"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
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
  //  • a quick TAP releases before `delay` → never starts a drag (stays a tap,
  //    so tap-to-arm and tap-to-place work cleanly);
  //  • a SCROLL flick moves past `tolerance` before `delay` elapses → cancels
  //    drag activation, so the tray/page still scrolls;
  //  • a deliberate PRESS-AND-HOLD (past `delay`, finger fairly still) → starts
  //    the drag. `tolerance` is a hair more forgiving than before so natural
  //    finger jitter during the hold doesn't read as a scroll and kill the drag.
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 180, tolerance: 8 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

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

      // Banner drags get a banner-shaped FOOTPRINT preview instead of the
      // single-cell tile glow. Compute the landing rect with the SAME placement
      // math the store commits, so the ghost lines up exactly with where the
      // bar really lands. Tile drags keep the single-cell `isOver` glow.
      if (kind === "textbar" || kind === "placed-textbar") {
        onOverSlotChange(null); // suppress the single-cell glow for banner drags
        if (!slotMatch) {
          onBannerPreviewChange(null);
          return;
        }
        const row = slotMatch[1] as TextBarRow;
        const dropIndex = parseInt(slotMatch[2], 10);
        const maxUnits = rowLength(frameConfig, row);

        if (kind === "textbar") {
          // New banner: width from the draft, centered free start — mirrors
          // `placeTextBar` (qr rides the FIRST bar only; the drop column only
          // chose the row, the column resolves to the centered free run).
          const isFirst = textBars.length === 0;
          const qr = isFirst ? qrCode.enabled : false;
          const widthUnits = measureTextBarUnits(bottomBar, qr, maxUnits);
          const preferred = Math.round((maxUnits - widthUnits) / 2);
          const start = findFreeStart(textBars, row, widthUnits, maxUnits, preferred);
          onBannerPreviewChange(
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
          onBannerPreviewChange(null);
          return;
        }
        const start = findFreeStart(textBars, row, bar.widthUnits, maxUnits, dropIndex, bar.id);
        onBannerPreviewChange(
          start === null
            ? { row, startIndex: bar.startIndex, widthUnits: bar.widthUnits, valid: false, backgroundColor: bar.config.backgroundColor }
            : { row, startIndex: start, widthUnits: bar.widthUnits, valid: true, backgroundColor: bar.config.backgroundColor }
        );
        return;
      }

      // Tile drags: keep the existing single-cell glow path.
      onBannerPreviewChange(null);
      onOverSlotChange(overId?.startsWith("frame:") ? overId : null);
    },
    [onOverSlotChange, onBannerPreviewChange, textBars, bottomBar, qrCode, frameConfig, dragBarId]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragPieceId(null);
      setDragKind(null);
      setDragBarId(null);
      onOverSlotChange(null);
      onBannerPreviewChange(null);

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
      // POOFS it away. Mirrors the placed-textbar drag model exactly so the
      // whole builder is one consistent "drag on / drag off" interaction.
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
      onOverSlotChange,
      onBannerPreviewChange,
    ]
  );

  const handleDragCancel = useCallback(() => {
    setDragPieceId(null);
    setDragKind(null);
    setDragBarId(null);
    onOverSlotChange(null);
    onBannerPreviewChange(null);
  }, [onOverSlotChange, onBannerPreviewChange]);

  const piece = dragPieceId ? getPiece(dragPieceId) : null;
  const dragBar = dragBarId ? textBars.find((b) => b.id === dragBarId) : null;
  const overlayBar =
    dragKind === "placed-textbar" ? dragBar?.config : dragKind === "textbar" ? bottomBar : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      autoScroll={false}
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
          // Plain, statically-positioned, tile-sized ghost. dnd-kit's overlay
          // wrapper is the thing that follows the pointer (position:fixed); its
          // child MUST NOT carry any absolute offset of its own (a placed tile's
          // draggable is `position:absolute; left:0; top:0`, which would otherwise
          // pin the ghost to the wrapper's corner). A relative, fixed-size box
          // guarantees the ghost renders under the cursor for BOTH palette-tile
          // and placed-tile drags.
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
