"use client";

import { forwardRef, useImperativeHandle, useRef, useEffect, useMemo } from "react";
import { useDraggable, useDndContext } from "@dnd-kit/core";
import type { FrameConfig, PlacedTile, BottomBarConfig, QRCodeConfig, PlacedTextBar, TextBarPlacement, BannerPreview } from "@/lib/types";
import { getTotalWidthInches } from "@/lib/constants/frame";
import { useFrameLayout } from "@/hooks/useFrameLayout";
import { useDesignStore } from "@/stores/design-store";
import { useUIStore } from "@/stores/ui-store";
import { SECTION_IDS, sectionBounds, slotSuppressed } from "@/lib/utils/sections";
import { buildGrid } from "@/lib/utils/slot-generator";
import { coveredSlotIds } from "@/lib/utils/text-bar";
import { coveredBySnappets, hasAnySpan, isMultiCell, resolveSnappetResize, snappetRect, tileSpan, visibleAnchorSlots, type SnappetPreview } from "@/lib/utils/snappet";
import { RailSlot } from "./RailSlot";
import { SnappetResizeHandles } from "./SnappetResizeHandles";
import { LicensePlateArea } from "./LicensePlateArea";
import { BottomTextBar } from "./BottomTextBar";
import { SectionTextElement } from "./SectionTextElement";

interface FrameCanvasProps {
  frameConfig: FrameConfig;
  slots: Record<string, PlacedTile>;
  bottomBar: BottomBarConfig;
  qrCode: QRCodeConfig;
  plateState: string;
  overSlotId?: string | null;
  /**
   * Where a dragged MULTI-CELL tile will land, resolved by `resolveSnappetDrop`
   * from the single cell under the pointer. The one drop indicator is drawn over
   * the WHOLE footprint at the resolved anchor — not at the hovered cell — so the
   * cue shows the real landing spot even when the footprint had to be nudged back
   * to fit. `valid: false` renders the REJECTED treatment instead of pretending
   * the drop will take. Absent on /build (no piece there has a span), where the
   * 1x1 `overSlotId` cue below is byte-for-byte what it always was.
   */
  snappetPreview?: SnappetPreview | null;
  /** Live drag-time footprint of where a dragged banner will land (or null). */
  bannerPreview?: BannerPreview | null;
}

export interface FrameCanvasHandle {
  getElement: () => HTMLDivElement | null;
}

// Shared groove styles
const GROOVE_H = "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 20%, rgba(255,255,255,0.02) 50%, rgba(0,0,0,0.3) 100%)";
const GROOVE_V_LTR = "linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 20%, rgba(255,255,255,0.02) 50%, rgba(0,0,0,0.3) 100%)";
const GROOVE_V_RTL = "linear-gradient(90deg, rgba(0,0,0,0.3) 0%, rgba(255,255,255,0.02) 50%, rgba(0,0,0,0.2) 80%, rgba(0,0,0,0.4) 100%)";
const GROOVE_BORDER_DARK = "1px solid rgba(0,0,0,0.5)";
const GROOVE_BORDER_LIGHT = "1px solid rgba(255,255,255,0.03)";

/** A placed text bar — draggable to move it onto another top/bottom run, or drag
    it OFF the frame to remove it (handled in DndProvider via `type:
    "placed-textbar"`). Still clickable to select it for editing in the panel; the
    Position controls remain a drag-free fallback. */
function PlacedBar({
  bar,
  rect,
  qrCode,
  selected,
  onSelect,
}: {
  bar: PlacedTextBar;
  rect: { x: number; y: number; width: number; height: number };
  qrCode: QRCodeConfig;
  selected: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `placed-textbar:${bar.id}`,
    data: { type: "placed-textbar", id: bar.id },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      title="Click to edit · drag to move · drag off the frame to remove · or use the Position controls in the panel"
      className={`absolute cursor-grab active:cursor-grabbing ${isDragging ? "opacity-40" : ""}`}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        // pan-y: scroll the page vertically off a placed banner; press-and-hold drags.
        touchAction: "pan-y",
        zIndex: selected ? 2 : 1,
        // Selected bar gets a bold gold ring + glow so the on-frame bar and the
        // editor panel below read as the same object.
        boxShadow: selected
          ? "0 0 0 3px #f8c53b, 0 0 14px 2px rgba(248,197,59,0.55)"
          : undefined,
        borderRadius: 3,
      }}
    >
      <BottomTextBar
        config={bar.config}
        qrConfig={{ ...qrCode, enabled: bar.qr }}
        x={0}
        y={0}
        width={rect.width}
        height={rect.height}
      />
    </div>
  );
}

export const FrameCanvas = forwardRef<FrameCanvasHandle, FrameCanvasProps>(
  function FrameCanvas({ frameConfig, slots, bottomBar, qrCode, plateState, overSlotId, snappetPreview, bannerPreview }, ref) {
    const frameRef = useRef<HTMLDivElement>(null);
    // The overflow layer that holds the snappet anchors + resize handles. Its
    // top-left equals the frame's origin, so the handles read pointer→grid from it.
    const snappetLayerRef = useRef<HTMLDivElement>(null);
    const textBars = useDesignStore((s) => s.textBars);
    const selectedBarId = useDesignStore((s) => s.selectedBarId);
    const selectBar = useDesignStore((s) => s.selectBar);
    // Sections (school builder). Empty on /build, so all section logic below is inert.
    const sections = useDesignStore((s) => s.sections);
    const selectedSectionId = useDesignStore((s) => s.selectedSectionId);
    const selectSection = useDesignStore((s) => s.selectSection);
    // Snappet resize (school builder). A selected snappet grows drag handles; both
    // are inert on /build, where no tile is ever multi-cell so nothing is selectable.
    const resizeTile = useDesignStore((s) => s.resizeTile);
    const selectedSnappetSlotId = useUIStore((s) => s.selectedSnappetSlotId);
    const selectSnappet = useUIStore((s) => s.selectSnappet);
    const requestRecrop = useUIStore((s) => s.requestRecrop);
    const {
      containerRef,
      containerWidth,
      containerHeight,
      slots: frameSlots,
      plateArea,
    } = useFrameLayout(frameConfig);

    useImperativeHandle(ref, () => ({
      getElement: () => frameRef.current,
    }));

    // Keep dnd-kit's droppable-rect cache in sync with the frame's responsive
    // layout. The slots are absolutely positioned from `containerWidth`, so every
    // width change repositions/resizes every cell. dnd-kit measures droppables on
    // drag start and otherwise caches them; while idle its per-droppable
    // ResizeObserver is disabled and the "optimized" measuring frequency never
    // polls, so a layout shift AFTER the initial measure (the responsive width
    // settling, a scrollbar appearing, web fonts loading) leaves the cache stale
    // and right-shifted. The very first drag's first collision reads that stale
    // cache before the drag-start re-measure commits — so the drop cue doesn't
    // switch until you overdrag past the stale boundary; every later drag is tight
    // because the cache is fresh by then. Re-measuring on each `containerWidth`
    // change keeps the cache correct up to drag start, so drag #1 is as tight as
    // drag #2. (A mid-drag layout shift re-measures here too, never reintroducing
    // stale rects.) measureDroppableContainers is a no-op until droppables exist.
    const { measureDroppableContainers } = useDndContext();
    useEffect(() => {
      // Empty list ⇒ re-measure ALL registered droppables (the frame's cells).
      if (containerWidth > 0) measureDroppableContainers([]);
    }, [containerWidth, measureDroppableContainers]);

    const totalWidthInches = getTotalWidthInches(frameConfig);
    const scale = containerWidth > 0 ? containerWidth / totalWidthInches : 0;
    const tileSize = frameConfig.tileSizeInches * scale;
    const hasWings = frameConfig.wings && frameConfig.wingColumns > 0;
    const wingPx = hasWings ? frameConfig.wingWidthInches * scale : 0;
    const innerWidthPx = frameConfig.widthInches * scale;
    // The ORIGINAL frame height (ignores flag-gated extra bottom rows). Bottom bars
    // and the side-rail grooves anchor to this so they never drag down to the new
    // rows. Equals containerHeight on /build (no extra rows).
    const extraBottomRows = Math.max(0, (frameConfig.bottomRows ?? 1) - 1);
    const baseFrameHeight = frameConfig.heightInches * scale;

    // ─── The bleed gutter ──────────────────────────────────────────────────────
    //
    // A multi-cell tile may legally hang PAST the frame's outer edge (canPlace's
    // "offgrid is allowed" rule), and that art has to be painted somewhere. Letting
    // it escape into the document was the bug: it painted over the palette and the
    // Sections panel, swallowed their clicks, and gave the whole page a horizontal
    // scrollbar. So the canvas RESERVES the room instead — this component's root
    // carries `overhangTiles` worth of padding on every side and clips to it. The
    // overhang then lands in the frame's own margin: visible, bounded, and outside
    // nothing.
    //
    // useFrameLayout measures this element's CONTENT box, so the frame simply lays
    // itself out in the reduced width; tileSize, every slot rect, the cue and the
    // snappet rects all follow from that one measurement, with no second source of
    // truth to keep in sync.
    //
    // The padding is a PERCENTAGE rather than `overhangTiles * tileSize` px on
    // purpose: tileSize is derived FROM the measured content width, so a px padding
    // computed from it would feed back into its own input and could oscillate.
    // Solving  pad = n·tile  with  tile = (W − 2·pad)·tileSizeInches/totalWidthInches
    // gives the fraction below, which depends only on the config — a fixed point,
    // not a loop. (Percentage padding resolves against width on all four sides, and
    // cells are square, so one value gives an equal gutter all round.)
    const overhangTiles = Math.max(0, frameConfig.overhangTiles ?? 0);
    const tileFraction = frameConfig.tileSizeInches / totalWidthInches;
    const gutterFraction =
      overhangTiles > 0
        ? (tileFraction * overhangTiles) / (1 + 2 * tileFraction * overhangTiles)
        : 0;
    // The same gutter in px, for positioning the absolute snappet layer over the
    // frame. Exact by construction: the fraction above was chosen so it equals
    // `overhangTiles` cells of the width it produces.
    const gutterPx = overhangTiles * tileSize;

    // Each bar sits over a run of top/bottom slots (gapless: step == tile). The
    // drag-time ghost reuses this EXACT geometry so it lines up perfectly with
    // where the real bar will land.
    const barRect = (bar: TextBarPlacement) => ({
      x: wingPx + bar.startIndex * tileSize,
      y: bar.row === "top" ? 0 : baseFrameHeight - tileSize,
      width: bar.widthUnits * tileSize,
      height: tileSize,
    });

    // The cell a dragged TILE will land in (or null). One positioned indicator
    // glides to this rect instead of toggling a glow on each cell, so the cue
    // tracks the cursor smoothly and matches the exact landing slot.
    // A multi-cell drag previews at its RESOLVED anchor (which may have been nudged
    // back off the hovered cell to make the footprint fit), so the cue anchors there
    // rather than on `overSlotId` — DndProvider sends only one of the two.
    const overSlot = snappetPreview
      ? frameSlots.find((s) => s.id === snappetPreview.anchorSlotId) ?? null
      : overSlotId
        ? frameSlots.find((s) => s.id === overSlotId)
        : null;
    // …and the exact rect it draws. `snappetRect` is the SAME geometry the placed
    // tile will use, so the cue and the landed tile cannot drift apart — a 1x1
    // resolves to the cell's own rect (slot.width === tileSize for every slot).
    const cueRect = overSlot
      ? snappetRect(
          overSlot,
          snappetPreview ? { cols: snappetPreview.cols, rows: snappetPreview.rows } : tileSpan(null),
          tileSize,
        )
      : null;
    // The drop was REFUSED (plate, a text bar, a suppressed section). The cue turns
    // red rather than disappearing: a cue that vanishes reads as "no target", while
    // this reads as "this exact footprint, and NO".
    const cueRejected = snappetPreview != null && !snappetPreview.valid;
    // A multi-cell cue can reach past the frame edge exactly like the tile it
    // previews, so it cannot live inside the frame's clip — it would be cut off at
    // the edge while the landed tile is not, and the cue would then lie about where
    // the tile goes. It renders in the bleed layer instead. Always false on /build
    // (no snappetPreview is ever passed), which keeps that DOM byte-identical.
    const cueOverhangs =
      snappetPreview != null &&
      isMultiCell({ cols: snappetPreview.cols, rows: snappetPreview.rows });

    // ─── Multi-cell snappets ───────────────────────────────────────────────────
    //
    // A snappet is ONE tile occupying a rectangle of cells. Rendering it means
    // splitting the cells three ways:
    //   · a plain cell   → RailSlot exactly as before
    //   · a COVERED cell → RailSlot with no tile and no chrome (droppable only)
    //   · the ANCHOR     → RailSlot drawing its tile at the full span size
    //
    // The whole split is gated on `hasAnySpan`, which is false for every 1x1
    // design and therefore always false on /build: `covered` stays null,
    // `snappetAnchors` stays empty, and the map below is the original render.
    //
    // `covered` is derived from the tiles that will actually RENDER, not from the
    // whole design: an anchor sitting in a zone the user switched to text/image is
    // hidden by that section's overlay, and a snappet that paints nothing must
    // blank nothing. (Deriving it from all slots left dead, chrome-less,
    // unclickable cells wherever a hidden snappet's footprint reached into a zone
    // still in tiles mode.) `sections` is empty on /build, so nothing is filtered
    // there.
    const anySpan = hasAnySpan(slots);
    const covered = useMemo(() => {
      if (!anySpan) return null;
      const grid = buildGrid(frameConfig, containerWidth);
      return coveredBySnappets(visibleAnchorSlots(slots, grid, sections), grid);
    }, [anySpan, slots, sections, frameConfig, containerWidth]);

    const visibleSlots = frameSlots.filter((slot) => !slotSuppressed(slot, sections, frameConfig));
    // Anchors are hoisted out of the frame body and into the overflow-visible
    // layer below, so they are rendered from here, not from `cellSlots`.
    const snappetAnchors = anySpan
      ? visibleSlots.flatMap((slot) => {
          const tile = slots[slot.id];
          if (!tile) return [];
          const span = tileSpan(tile);
          if (!isMultiCell(span)) return [];
          return [{ slot, rect: snappetRect(slot, span, tileSize) }];
        })
      : [];
    const anchorIds = new Set(snappetAnchors.map((a) => a.slot.id));
    const cellSlots = anySpan ? visibleSlots.filter((s) => !anchorIds.has(s.id)) : visibleSlots;

    // ─── Resize handles ────────────────────────────────────────────────────────
    // The selected snappet gets drag handles. It has to be a currently-RENDERED
    // anchor (a visible multi-cell tile) — a stale selection whose tile was moved,
    // shrunk, or hidden by a section shows nothing. `resolveResize` pins that anchor
    // and validates a candidate span via canPlace (the resize twin of the drop
    // resolver). Both the lattice grid and the resolver are memoized so a pointer
    // move during a resize doesn't rebuild them. Everything here is gated on
    // `anySpan`, so /build never constructs any of it.
    const selectedAnchor = anySpan && selectedSnappetSlotId
      ? snappetAnchors.find((a) => a.slot.id === selectedSnappetSlotId) ?? null
      : null;
    const resizeGrid = useMemo(() => buildGrid(frameConfig), [frameConfig]);
    const barCoveredSet = useMemo(() => new Set(coveredSlotIds(textBars)), [textBars]);
    const resolveResize = useMemo(() => {
      if (!selectedSnappetSlotId) return null;
      const ctx = { grid: resizeGrid, slots, sections, barCovered: barCoveredSet };
      return (cols: number, rows: number): SnappetPreview | null =>
        resolveSnappetResize(ctx, selectedSnappetSlotId, cols, rows);
    }, [selectedSnappetSlotId, resizeGrid, slots, sections, barCoveredSet]);

    // Commit a resize. For UPLOADED art, a resize to a shape the photo does NOT
    // match (a different cols:rows aspect) would cover-crop the image with no crop
    // tool and no resolution gate — the agreed rule says that is exactly when the
    // crop/reposition tool + DPI gate must appear. So we hand it to the re-crop flow
    // (SnappetRecropModal) instead of committing a silent crop. A same-aspect resize
    // (a native-aspect grow/shrink) stays zero-crop and commits straight through, as
    // does every set-piece snappet. Integer aspect test — no epsilon needed.
    const commitResize = (slotId: string, cols: number, rows: number) => {
      const tile = slots[slotId];
      if (!tile) return;
      if (tile.image) {
        const cur = tileSpan(tile);
        if (cols * cur.rows !== rows * cur.cols) {
          requestRecrop(slotId, cols, rows);
          return;
        }
      }
      resizeTile(slotId, { cols, rows });
    };

    // Every anchor the live drop would DELETE, outlined at its real footprint. A
    // footprint drop can evict a tile whose body reaches far past the gold cue —
    // dropping a 2x2 onto one cell of an 11x2 evicts the whole 11x2, ten cells the
    // cue never touched. `snappetPreview.evicts` already names them; drawing each
    // one's rect (dimmed rejected styling — "this goes away") makes the deletion
    // visible BEFORE the drop instead of a tile silently vanishing after it.
    // `evicts` is only ever populated on a VALID placement (canPlace returns none
    // on a rejection), and only a multi-cell drag carries a snappetPreview at all,
    // so this is empty on /build and whenever a drop displaces nothing.
    const evictRects = snappetPreview
      ? snappetPreview.evicts.flatMap((id) => {
          const slot = frameSlots.find((s) => s.id === id);
          if (!slot) return [];
          return [{ id, rect: snappetRect(slot, tileSpan(slots[id]), tileSize) }];
        })
      : [];

    return (
      <div
        ref={containerRef}
        className="relative w-full flex flex-col items-center"
        // The reserved bleed gutter + the clip that bounds the overhang to it. No
        // gutter configured (every /build frame) ⇒ no style attribute at all.
        style={gutterFraction > 0 ? { padding: `${gutterFraction * 100}%`, overflow: "hidden" } : undefined}
      >
        {/* Main frame */}
        <div
          ref={frameRef}
          // Clicking empty frame space clears the snappet selection (a click ON a
          // snappet or a handle stops propagation, so it survives). Attached only
          // when the design has a snappet — inert, and unattached, on /build.
          onClick={anySpan ? () => selectSnappet(null) : undefined}
          className="relative w-full rounded-md overflow-hidden"
          style={{
            height: containerHeight || "auto",
            aspectRatio: containerHeight ? undefined : `${totalWidthInches} / ${frameConfig.heightInches + extraBottomRows * frameConfig.tileSizeInches}`,
            background: "#111111",
            // Signature sticker drop shadow at 50% opacity so the whole design
            // lifts off the workbench without being as heavy as a solid offset.
            boxShadow: "8px 8px 0 rgba(30,27,23,0.5)",
          }}
        >
          {/* Matte black frame texture */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.15) 100%)",
            }}
          />

          {/* ═══ INNER FRAME GROOVES ═══ */}

          {/* Top rail groove — inner frame only */}
          {containerWidth > 0 && (
            <div
              className="absolute"
              style={{
                left: wingPx,
                width: innerWidthPx,
                top: tileSize * 0.1,
                height: tileSize * 0.8,
                background: GROOVE_H,
                borderTop: GROOVE_BORDER_DARK,
                borderBottom: GROOVE_BORDER_LIGHT,
              }}
            />
          )}

          {/* Left rail groove — stops above the bottom rail */}
          {containerWidth > 0 && (
            <div
              className="absolute"
              style={{
                left: wingPx + tileSize * 0.1,
                width: tileSize * 0.8,
                top: tileSize,
                height: baseFrameHeight - 2 * tileSize,
                background: GROOVE_V_LTR,
                borderLeft: GROOVE_BORDER_DARK,
                borderRight: GROOVE_BORDER_LIGHT,
              }}
            />
          )}

          {/* Right rail groove — stops above the bottom rail */}
          {containerWidth > 0 && (
            <div
              className="absolute"
              style={{
                left: wingPx + innerWidthPx - tileSize + tileSize * 0.1,
                width: tileSize * 0.8,
                top: tileSize,
                height: baseFrameHeight - 2 * tileSize,
                background: GROOVE_V_RTL,
                borderLeft: GROOVE_BORDER_LIGHT,
                borderRight: GROOVE_BORDER_DARK,
              }}
            />
          )}

          {/* Bottom rail groove — full inner width, mirrors the top rail */}
          {containerWidth > 0 && containerHeight > 0 && (
            <div
              className="absolute"
              style={{
                left: wingPx,
                width: innerWidthPx,
                bottom: tileSize * 0.1,
                height: tileSize * 0.8,
                background: GROOVE_H,
                borderTop: GROOVE_BORDER_DARK,
                borderBottom: GROOVE_BORDER_LIGHT,
              }}
            />
          )}

          {/* ═══ WING GROOVES ═══ */}
          {containerWidth > 0 && hasWings && Array.from({ length: frameConfig.wingColumns }, (_, col) => (
            <div key={`wing-grooves-${col}`}>
              {/* Wing-left column groove */}
              <div
                className="absolute"
                style={{
                  left: wingPx - (col + 1) * tileSize + tileSize * 0.1,
                  width: tileSize * 0.8,
                  top: tileSize,
                  bottom: tileSize,
                  background: GROOVE_V_LTR,
                  borderLeft: GROOVE_BORDER_DARK,
                  borderRight: GROOVE_BORDER_LIGHT,
                }}
              />
              {/* Wing-left top groove */}
              <div
                className="absolute"
                style={{
                  left: wingPx - (col + 1) * tileSize + tileSize * 0.1,
                  top: tileSize * 0.1,
                  width: tileSize * 0.8,
                  height: tileSize * 0.8,
                  background: GROOVE_H,
                  borderTop: GROOVE_BORDER_DARK,
                  borderBottom: GROOVE_BORDER_LIGHT,
                }}
              />
              {/* Wing-left bottom groove */}
              <div
                className="absolute"
                style={{
                  left: wingPx - (col + 1) * tileSize + tileSize * 0.1,
                  bottom: tileSize * 0.1,
                  width: tileSize * 0.8,
                  height: tileSize * 0.8,
                  background: GROOVE_H,
                  borderTop: GROOVE_BORDER_DARK,
                  borderBottom: GROOVE_BORDER_LIGHT,
                }}
              />

              {/* Wing-right column groove */}
              <div
                className="absolute"
                style={{
                  left: wingPx + innerWidthPx + col * tileSize + tileSize * 0.1,
                  width: tileSize * 0.8,
                  top: tileSize,
                  bottom: tileSize,
                  background: GROOVE_V_RTL,
                  borderLeft: GROOVE_BORDER_LIGHT,
                  borderRight: GROOVE_BORDER_DARK,
                }}
              />
              {/* Wing-right top groove */}
              <div
                className="absolute"
                style={{
                  left: wingPx + innerWidthPx + col * tileSize + tileSize * 0.1,
                  top: tileSize * 0.1,
                  width: tileSize * 0.8,
                  height: tileSize * 0.8,
                  background: GROOVE_H,
                  borderTop: GROOVE_BORDER_DARK,
                  borderBottom: GROOVE_BORDER_LIGHT,
                }}
              />
              {/* Wing-right bottom groove */}
              <div
                className="absolute"
                style={{
                  left: wingPx + innerWidthPx + col * tileSize + tileSize * 0.1,
                  bottom: tileSize * 0.1,
                  width: tileSize * 0.8,
                  height: tileSize * 0.8,
                  background: GROOVE_H,
                  borderTop: GROOVE_BORDER_DARK,
                  borderBottom: GROOVE_BORDER_LIGHT,
                }}
              />
            </div>
          ))}

          {/* License plate area */}
          {plateArea && (
            <LicensePlateArea
              x={plateArea.x}
              y={plateArea.y}
              width={plateArea.width}
              height={plateArea.height}
              plateState={plateState}
            />
          )}

          {/* All rail slots (standard + wing zones). The slots no longer carry an
              `isOver` flag — a single gliding indicator (below) renders the drop
              cue instead, so a drag never re-renders every cell. A slot in a section
              that's been switched to text/image is SUPPRESSED (no tile, no drop) —
              its section overlay below covers it. (Never triggers on /build.) */}
          {cellSlots.map((slot) => (
            <RailSlot
              key={slot.id}
              slot={slot}
              placedTile={covered?.has(slot.id) ? undefined : slots[slot.id]}
              covered={covered?.has(slot.id)}
            />
          ))}

          {/* Section overlays (school builder) — TEXT panels only. A text panel is
              ONE element drawn over the whole panel's bounding box, hiding its tiles.
              Uploaded art is NO LONGER a section overlay: it lives as a SNAPPET in
              the layer below (one unified system), so there is no image branch here.
              Renders nothing on /build (sections is empty). */}
          {containerWidth > 0 &&
            SECTION_IDS.map((id) => {
              const sec = sections[id];
              if (!sec || sec.mode !== "text") return null;
              const box = sectionBounds(id, frameSlots, frameConfig);
              if (!box) return null;
              const selected = selectedSectionId === id;
              return (
                <div
                  key={`section-${id}`}
                  onClick={() => selectSection(id)}
                  className="absolute cursor-pointer overflow-hidden rounded-[3px]"
                  style={{
                    left: box.x,
                    top: box.y,
                    width: box.width,
                    height: box.height,
                    zIndex: selected ? 3 : 2,
                    boxShadow: selected
                      ? "0 0 0 3px #f8c53b, 0 0 14px 2px rgba(248,197,59,0.55)"
                      : undefined,
                  }}
                >
                  {sec.text?.text ? (
                    <SectionTextElement width={box.width} height={box.height} config={sec.text} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#1e1b17]/70 px-1 text-center text-[10px] font-bold uppercase tracking-wide text-[#faf0d6]/70">
                      Add a phrase
                    </div>
                  )}
                </div>
              );
            })}

          {/* Tile drop indicator — ONE element that glides to the target cell.
              It's always mounted (while the frame has size) and driven purely by
              transform/size + opacity, so moving the cursor cell-to-cell slides
              the cue smoothly instead of popping a glow on and off each slot.
              Sized to the live `overSlot` rect, so it marks the EXACT cell the
              tile will drop into; opacity 0 (and pointer-events off) when idle.

              A cue that OVERHANGS the frame is drawn in the bleed layer below
              instead — inside this clip its overhanging edge would be sliced off
              while the tile it previews is not. */}
          {containerWidth > 0 && !cueOverhangs && (
            <div
              aria-hidden
              className={`ff-drop-indicator pointer-events-none absolute left-0 top-0 z-[2] ${
                cueRejected ? "ff-drop-indicator--rejected" : ""
              }`}
              style={{
                width: cueRect ? cueRect.width : tileSize,
                height: cueRect ? cueRect.height : tileSize,
                transform: `translate3d(${cueRect ? cueRect.x : 0}px, ${cueRect ? cueRect.y : 0}px, 0)`,
                opacity: cueRect ? 1 : 0,
              }}
            />
          )}

          {/* Text bars — draggable to move; drag off the frame to remove. Still
              click-to-select, with the Position controls as a drag-free fallback. */}
          {containerWidth > 0 &&
            textBars.map((bar) => (
              <PlacedBar
                key={bar.id}
                bar={bar}
                rect={barRect(bar)}
                qrCode={qrCode}
                selected={bar.id === selectedBarId}
                onSelect={() => selectBar(bar.id)}
              />
            ))}

          {/* Banner landing preview — a translucent, banner-shaped ghost over the
              EXACT run of slots the dragged banner will occupy on drop (computed
              in DndProvider with the same placement math the store commits, and
              positioned with the same `barRect` geometry as a real placed bar, so
              there's no drift). Valid → the banner's color + a dashed ink outline
              reading "it lands HERE"; invalid (row can't fit it) → a red tint. */}
          {containerWidth > 0 && bannerPreview && (() => {
            // `barRect` yields {x, y, width, height} — map x/y to left/top the same
            // way a real PlacedBar does. (Spreading it raw wrote invalid `x:`/`y:`
            // CSS on the div, pinning the ghost to the frame's top-left corner.)
            const r = barRect(bannerPreview);
            return (
            <div
              aria-hidden
              className={`ff-banner-preview pointer-events-none absolute z-[3] rounded-[3px] ${
                bannerPreview.valid ? "" : "ff-banner-preview--invalid"
              }`}
              style={{
                left: r.x,
                top: r.y,
                width: r.width,
                height: r.height,
                background: bannerPreview.valid
                  ? bannerPreview.backgroundColor
                  : "rgba(214,69,69,0.18)",
                opacity: bannerPreview.valid ? 0.55 : 1,
                border: bannerPreview.valid
                  ? "2px dashed #1e1b17"
                  : "2px dashed #d64545",
                boxShadow: bannerPreview.valid
                  ? "0 0 14px 2px rgba(248,197,59,0.45)"
                  : "0 0 12px 2px rgba(214,69,69,0.4)",
              }}
            />
            );
          })()}

          {/* Frame edge highlight */}
          <div
            className="absolute inset-0 rounded-md pointer-events-none"
            style={{
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          />
        </div>

        {/* ═══ SNAPPET LAYER — the only thing allowed outside the frame's clip ═══
            Multi-cell tiles may legally OVERHANG the outer edge (see canPlace's
            "offgrid is allowed" rule), but the frame root above is
            `overflow-hidden` and must stay that way — the rail grooves and the
            edge highlight are drawn as full-bleed boxes and rely on that clip to
            get their crisp rounded corners. So the anchors render in a SIBLING
            layer pinned exactly over the frame, where overflow is visible and the
            overhang can escape the frame — but NOT the canvas: the root's clip and
            its reserved gutter bound the escape to `overhangTiles` of bleed.

            Positioned from `gutterPx` rather than `inset-0` because the root's box
            is now the frame PLUS that gutter; these four numbers are the frame's
            own rect, so a snappet's rect means the same thing in both layers.

            No z-index of its own: it must NOT create a stacking context, so the
            z-indexes inside it stay directly comparable with the frame root's.
            Being a later sibling of the (z-auto) frame root already paints it
            above the frame's art, while the anchors' own z-index 1 keeps them
            below the two z-index-2 overlays that must stay readable on top of a
            snappet — the section overlays (a suppressed zone is one printed piece)
            and the 1x1 drop cue. The overhanging cue lives here at z-index 4, on
            top of everything, because a cue you cannot see is a cue that lies.

            Pointer-transparent so the empty frame beneath it stays clickable; the
            anchors take pointer events back via a `display: contents` wrapper,
            which passes the inherited value down without generating a box of its
            own that could swallow clicks. */}
        {containerWidth > 0 && (snappetAnchors.length > 0 || cueOverhangs || evictRects.length > 0) && (
          <div
            ref={snappetLayerRef}
            className="pointer-events-none absolute"
            style={{
              left: gutterPx,
              top: gutterPx,
              width: containerWidth,
              height: containerHeight,
              overflow: "visible",
            }}
          >
            <div style={{ display: "contents", pointerEvents: "auto" }}>
              {snappetAnchors.map(({ slot, rect }) => (
                <RailSlot
                  key={slot.id}
                  slot={slot}
                  placedTile={slots[slot.id]}
                  spanWidth={rect.width}
                  spanHeight={rect.height}
                />
              ))}

              {/* Resize handles on the SELECTED snappet — its own pointer-capture
                  drag (never a dnd-kit droppable, so no cell is ever resized). */}
              {selectedAnchor && resolveResize && (
                <SnappetResizeHandles
                  anchorSlot={selectedAnchor.slot}
                  span={tileSpan(slots[selectedAnchor.slot.id])}
                  tileSize={tileSize}
                  layerRef={snappetLayerRef}
                  maxCols={resizeGrid.cols}
                  maxRows={resizeGrid.rows}
                  resolve={resolveResize}
                  commit={(cols, rows) => commitResize(selectedAnchor.slot.id, cols, rows)}
                />
              )}
            </div>

            {/* Eviction warnings — a dimmed red outline over each anchor this drop
                would delete, at its FULL footprint (which may overhang, hence this
                layer). Sits above the anchors (z-3) but below the live cue (z-4):
                the cue says "it lands here", these say "and these go away". */}
            {evictRects.map(({ id, rect }) => (
              <div
                key={`evict-${id}`}
                aria-hidden
                className="ff-drop-indicator ff-drop-indicator--rejected pointer-events-none absolute left-0 top-0"
                style={{
                  zIndex: 3,
                  width: rect.width,
                  height: rect.height,
                  transform: `translate3d(${rect.x}px, ${rect.y}px, 0)`,
                  opacity: 0.5,
                }}
              />
            ))}

            {/* The overhanging twin of the frame-root drop cue — same element,
                same geometry, drawn where it will not be sliced in half. */}
            {cueOverhangs && (
              <div
                aria-hidden
                className={`ff-drop-indicator pointer-events-none absolute left-0 top-0 ${
                  cueRejected ? "ff-drop-indicator--rejected" : ""
                }`}
                style={{
                  zIndex: 4,
                  width: cueRect ? cueRect.width : tileSize,
                  height: cueRect ? cueRect.height : tileSize,
                  transform: `translate3d(${cueRect ? cueRect.x : 0}px, ${cueRect ? cueRect.y : 0}px, 0)`,
                  opacity: cueRect ? 1 : 0,
                }}
              />
            )}
          </div>
        )}
      </div>
    );
  }
);
