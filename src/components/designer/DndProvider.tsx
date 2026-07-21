"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import type { TextBarRow, BannerPreview, TileSpan } from "@/lib/types";
import { useDesignStore } from "@/stores/design-store";
import { useUIStore } from "@/stores/ui-store";
import { measureTextBarUnits, rowLength, findFreeStart, coveredSlotIds } from "@/lib/utils/text-bar";
import { buildGrid } from "@/lib/utils/slot-generator";
import {
  isMultiCell,
  resolveSnappetDrop,
  tileSpan,
  NO_GRAB,
  UPLOAD_PIECE_ID,
  type GrabOffset,
  type SnappetPreview,
} from "@/lib/utils/snappet";
import { getPiece } from "@/data/sets";
import { PlacedTileView } from "@/components/frame/PlacedTileView";
import { playSound } from "@/lib/utils/sound";
import { emitTilePlaced } from "@/lib/utils/place-fx";

interface DndProviderProps {
  children: React.ReactNode;
  onOverSlotChange: (slotId: string | null) => void;
  onBannerPreviewChange: (preview: BannerPreview | null) => void;
  /**
   * Live footprint preview for a MULTI-CELL tile drag (the school frame). Optional
   * because a builder with no multi-cell pieces never produces one: /build passes
   * no handler and every snappet branch below short-circuits before reaching it.
   */
  onSnappetPreviewChange?: (preview: SnappetPreview | null) => void;
}

/** The footprint carried by a drag, from the draggable's own data. 1x1 for a
 *  plain tile — i.e. for every drag on /build, which is what routes those drags
 *  down the untouched single-cell path below. */
function dragSpanOf(data: Record<string, unknown> | undefined): TileSpan {
  if (data?.type === "placed-tile") return tileSpan({ span: data.span as TileSpan });
  const pieceId = data?.pieceId as string | undefined;
  return tileSpan({ span: pieceId ? getPiece(pieceId)?.defaultSpan : undefined });
}

/**
 * Which cell of the footprint the drag is holding.
 *
 * A placed snappet publishes a REF rather than a value (see RailSlot): the drag can
 * activate in the same frame as the pointerdown that measured the grab, before any
 * re-render, so a value snapshotted at render time would be one gesture stale.
 * Reading it here — at preview/commit time — always gets the current gesture's.
 * A palette drag has no ref and no grabbed cell: the hovered cell is its top-left.
 */
function readGrab(data: Record<string, unknown> | undefined): GrabOffset {
  const ref = data?.grabOffset as { current: GrabOffset } | undefined;
  return ref?.current ?? NO_GRAB;
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
  // WHERE the user is aiming depends on the drag source:
  //  • Repositioning a PLACED tile/banner: it drags via the DragOverlay, whose
  //    floating ghost is pinned to the GRAB POINT + delta — NOT the cursor. The
  //    user lines up the ghost, so the cursor trails the ghost by the grab offset.
  //    Querying the raw cursor makes you OVER-DRAG (push the ghost past the cell
  //    until the trailing cursor catches up). So aim from the ghost's CENTER
  //    (args.collisionRect = the ghost's translated rect) → what you see is where
  //    it drops.
  //  • Palette tiles / NEW banners drag from a panel far below-right of the frame;
  //    there the ghost/source center resolves to a corner, so those keep the
  //    CURSOR (which is what stops the "cue flashes to a corner on pickup" bug).
  //  • A MULTI-CELL snappet is the exception to the ghost rule. Its ghost's centre
  //    is up to half a footprint away from the hand holding it, so aiming from the
  //    centre would report a cell several columns off the pointer — and the drop
  //    resolver, which subtracts the GRAB offset (measured from the pointer), would
  //    then compound the two errors. The cursor is the one reference both halves
  //    agree on, and subtracting the grab offset already removes the over-drag that
  //    centre-aiming exists to prevent. `span` is 1x1 for every /build drag, so
  //    that path keeps centre-aiming exactly as before.
  const activeId = String(args.active?.id ?? "");
  const activeSpan = tileSpan({ span: args.active?.data.current?.span as TileSpan | undefined });
  const aimsGhost =
    (activeId.startsWith("placed-tile:") || activeId.startsWith("placed-textbar:")) &&
    !isMultiCell(activeSpan);
  const pointer = aimsGhost && args.collisionRect
    ? {
        x: args.collisionRect.left + args.collisionRect.width / 2,
        y: args.collisionRect.top + args.collisionRect.height / 2,
      }
    : args.pointerCoordinates;
  // No aim point yet → no target. Only happens on the first collision frame at
  // drag-start (pointer/collisionRect briefly null before the first move). There is
  // no KeyboardSensor registered, so a real keyboard drag never reaches here.
  // Returning [] keeps the cue hidden until the aim point is known (no corner flash).
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

export function DndProvider({
  children,
  onOverSlotChange,
  onBannerPreviewChange,
  onSnappetPreviewChange,
}: DndProviderProps) {
  const [dragPieceId, setDragPieceId] = useState<string | null>(null);
  const [dragKind, setDragKind] = useState<
    "tile" | "placed-tile" | "textbar" | "placed-textbar" | null
  >(null);
  const [dragBarId, setDragBarId] = useState<string | null>(null);
  const [dragSpan, setDragSpan] = useState<TileSpan>({ cols: 1, rows: 1 });
  // Uploaded art carried by a placed-tile drag — the overlay lifts the photo itself
  // (getPiece("upload") is undefined, so the set-piece ghost path can't render it).
  const [dragImage, setDragImage] = useState<{ url: string; fullResId?: string } | null>(null);
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
  const slots = useDesignStore((s) => s.slots);
  const sections = useDesignStore((s) => s.sections);
  const soundEnabled = useUIStore((s) => s.soundEnabled);

  // The (row, col) lattice the footprint resolver addresses. Pure geometry, so it
  // depends on the config alone — rebuilt only when the frame changes, never per
  // pointer move. Its px fields are unused here; FrameCanvas owns the on-screen
  // geometry, and the two agree because both derive from this one config.
  const grid = useMemo(() => buildGrid(frameConfig), [frameConfig]);

  /**
   * Where a multi-cell drag will land, from the single cell dnd-kit reports.
   *
   * Returns null for a 1x1 — the FAST PATH. `hasAnySpan` is false for every /build
   * design and no /build piece declares a `defaultSpan`, so every drag there exits
   * here and takes the original single-cell code path untouched.
   */
  const resolveDrop = useCallback(
    (
      overId: string | undefined,
      span: TileSpan,
      grab: GrabOffset,
      excludeId?: string,
    ): SnappetPreview | null => {
      if (!overId?.startsWith("frame:") || !isMultiCell(span)) return null;
      return resolveSnappetDrop(
        { grid, slots, sections, barCovered: new Set(coveredSlotIds(textBars)) },
        { overSlotId: overId, span, grab, excludeId },
      );
    },
    [grid, slots, sections, textBars],
  );

  // MOUSE-only (not PointerSensor). PointerSensor also fires on TOUCH, and with just a
  // 5px distance constraint it would grab a vertical scroll swipe over the frame after
  // 5px — hijacking the gesture so the phone page can't scroll up/down. Splitting into
  // MouseSensor (desktop) + TouchSensor (phone) lets the touch sensor's press-and-hold
  // rule below actually govern touch, so a swipe scrolls the page.
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  });
  // Touch drag activation, tuned so all three gestures stay distinct on a phone:
  //  • a quick TAP releases before `delay` → never starts a drag (stays a tap);
  //  • a SCROLL flick past `tolerance` before `delay` → cancels, page still scrolls;
  //  • a deliberate PRESS-AND-HOLD → starts the drag.
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 180, tolerance: 8 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  // Drop-cue updates go through directly (no rAF coalescing): `onDragOver` only
  // fires when the `over` target CHANGES (not every pixel), so this is cheap, and
  // — critically — the visible indicator is ALWAYS the live `over` that the drop
  // will use, so the preview can never be a frame stale relative to the drop.
  // RailSlot is memoized, so updating the cue re-renders only the indicator.
  const setCue = useCallback(
    (
      slotId: string | null,
      banner: BannerPreview | null,
      snappet: SnappetPreview | null = null,
    ) => {
      onOverSlotChange(slotId);
      onBannerPreviewChange(banner);
      onSnappetPreviewChange?.(snappet);
    },
    [onOverSlotChange, onBannerPreviewChange, onSnappetPreviewChange]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    setDragKind(
      (data?.type as "tile" | "placed-tile" | "textbar" | "placed-textbar") ?? null
    );
    setDragPieceId((data?.pieceId as string | undefined) ?? null);
    setDragBarId((data?.id as string | undefined) ?? null);
    setDragSpan(dragSpanOf(data));
    setDragImage((data?.image as { url: string; fullResId?: string } | undefined) ?? null);
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

      // MULTI-CELL tile drags get a FOOTPRINT preview, computed with the same
      // resolver `handleDragEnd` commits through — so the ghost is never a lie:
      // where it shows is where the tile lands, and when it shows REJECTED the
      // drop really is refused. The 1x1 line below is untouched for everything
      // else (all of /build).
      const span = dragSpanOf(data);
      if (isMultiCell(span)) {
        const grab = readGrab(data);
        setCue(null, null, resolveDrop(overId, span, grab, data?.slotId as string | undefined));
        return;
      }

      // Tile drags: drive the single gliding drop indicator via the over slot id.
      setCue(overId?.startsWith("frame:") ? overId : null, null);
    },
    [setCue, textBars, bottomBar, qrCode, frameConfig, dragBarId, resolveDrop]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragPieceId(null);
      setDragKind(null);
      setDragBarId(null);
      setDragSpan({ cols: 1, rows: 1 });
      setDragImage(null);
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
      // The footprint this drag commits — identical to the one the preview drew,
      // because both come from `resolveDrop`. Null for a 1x1 (and so for every
      // drag on /build), which keeps the original two branches below as they were.
      const span = dragSpanOf(data);
      const grab = readGrab(data);
      const drop = resolveDrop(overId, span, grab, data?.slotId as string | undefined);

      if (data?.type === "placed-tile") {
        const fromSlotId = data.slotId as string;
        if (overId?.startsWith("frame:")) {
          // A REJECTED footprint drop is a no-op, not a removal: the tile is over
          // the frame, the preview said "not here", so it stays where it was.
          if (isMultiCell(span) && !drop?.valid) return;
          const toSlotId = drop?.anchorSlotId ?? overId;
          moveTile(fromSlotId, toSlotId);
          emitTilePlaced(toSlotId);
          if (soundEnabled) playSound("snap");
        } else {
          removeTile(fromSlotId);
          if (soundEnabled) playSound("pop");
        }
        return;
      }

      const pieceId = data?.pieceId as string | undefined;
      if (overId?.startsWith("frame:") && pieceId) {
        if (isMultiCell(span) && !drop?.valid) return;
        const setId = pieceId.split(":")[0];
        const toSlotId = drop?.anchorSlotId ?? overId;
        // The piece's natural footprint travels with it; `undefined` for a plain
        // tile, so the stored record keeps its original two-field shape.
        placeTile(toSlotId, pieceId, setId, isMultiCell(span) ? span : undefined);
        emitTilePlaced(toSlotId);
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
      resolveDrop,
    ]
  );

  const handleDragCancel = useCallback(() => {
    setDragPieceId(null);
    setDragKind(null);
    setDragBarId(null);
    setDragSpan({ cols: 1, rows: 1 });
    setDragImage(null);
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
        ) : dragImage && dragKind === "placed-tile" ? (
          // Uploaded-art ghost — lift the photo at its footprint's aspect (one cell
          // per span unit), the image twin of the set-piece ghost below.
          <div
            className="ff-drag-lift relative pointer-events-none"
            style={{ width: 48 * dragSpan.cols, height: 48 * dragSpan.rows }}
          >
            <PlacedTileView
              pieceId={UPLOAD_PIECE_ID}
              image={dragImage}
              width={48 * dragSpan.cols}
              height={48 * dragSpan.rows}
            />
          </div>
        ) : piece && dragKind === "placed-tile" ? (
          // Tile-sized ghost that lifts off the workbench (placed-tile drags use
          // the overlay; palette tiles use a source transform). A snappet lifts at
          // its FOOTPRINT's aspect — one cell per span unit — so what you carry
          // looks like the thing that will land. 48x48 for a 1x1, as before.
          <div
            className="ff-drag-lift relative pointer-events-none"
            style={{ width: 48 * dragSpan.cols, height: 48 * dragSpan.rows }}
          >
            <PlacedTileView
              pieceId={piece.id}
              width={48 * dragSpan.cols}
              height={48 * dragSpan.rows}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
