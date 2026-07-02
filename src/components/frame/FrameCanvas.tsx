"use client";

import { forwardRef, useImperativeHandle, useRef, useEffect } from "react";
import { useDraggable, useDndContext } from "@dnd-kit/core";
import type { FrameConfig, PlacedTile, BottomBarConfig, QRCodeConfig, PlacedTextBar, TextBarPlacement, BannerPreview } from "@/lib/types";
import { getTotalWidthInches } from "@/lib/constants/frame";
import { useFrameLayout } from "@/hooks/useFrameLayout";
import { useDesignStore } from "@/stores/design-store";
import { SECTION_IDS, sectionBounds, slotSuppressed } from "@/lib/utils/sections";
import { RailSlot } from "./RailSlot";
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
        touchAction: "none",
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
  function FrameCanvas({ frameConfig, slots, bottomBar, qrCode, plateState, overSlotId, bannerPreview }, ref) {
    const frameRef = useRef<HTMLDivElement>(null);
    const textBars = useDesignStore((s) => s.textBars);
    const selectedBarId = useDesignStore((s) => s.selectedBarId);
    const selectBar = useDesignStore((s) => s.selectBar);
    // Sections (school builder). Empty on /build, so all section logic below is inert.
    const sections = useDesignStore((s) => s.sections);
    const selectedSectionId = useDesignStore((s) => s.selectedSectionId);
    const selectSection = useDesignStore((s) => s.selectSection);
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
    const overSlot = overSlotId ? frameSlots.find((s) => s.id === overSlotId) : null;

    return (
      <div ref={containerRef} className="w-full flex flex-col items-center">
        {/* Main frame */}
        <div
          ref={frameRef}
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
          {frameSlots
            .filter((slot) => !slotSuppressed(slot.zone, sections))
            .map((slot) => (
              <RailSlot
                key={slot.id}
                slot={slot}
                placedTile={slots[slot.id]}
              />
            ))}

          {/* Section overlays (school builder). Each section in text/image mode is
              ONE element drawn over the whole zone's bounding box, hiding its tiles.
              Renders nothing on /build (sections is empty). */}
          {containerWidth > 0 &&
            SECTION_IDS.map((id) => {
              const sec = sections[id];
              if (!sec || sec.mode === "tiles") return null;
              const box = sectionBounds(id, frameSlots);
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
                  {sec.mode === "image" && sec.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sec.imageUrl}
                      alt=""
                      draggable={false}
                      className="h-full w-full"
                      style={{ objectFit: sec.imageFit ?? "cover" }}
                    />
                  ) : sec.mode === "text" && sec.text?.text ? (
                    <SectionTextElement width={box.width} height={box.height} config={sec.text} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#1e1b17]/70 px-1 text-center text-[10px] font-bold uppercase tracking-wide text-[#faf0d6]/70">
                      {sec.mode === "text" ? "Add a phrase" : "Add art"}
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
              tile will drop into; opacity 0 (and pointer-events off) when idle. */}
          {containerWidth > 0 && (
            <div
              aria-hidden
              className="ff-drop-indicator pointer-events-none absolute left-0 top-0 z-[2]"
              style={{
                width: overSlot ? overSlot.width : tileSize,
                height: overSlot ? overSlot.height : tileSize,
                transform: `translate3d(${overSlot ? overSlot.x : 0}px, ${overSlot ? overSlot.y : 0}px, 0)`,
                opacity: overSlot ? 1 : 0,
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
      </div>
    );
  }
);
