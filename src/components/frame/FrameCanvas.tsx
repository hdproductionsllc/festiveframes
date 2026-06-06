"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { FrameConfig, PlacedTile, BottomBarConfig, QRCodeConfig, PlacedTextBar } from "@/lib/types";
import { getTotalWidthInches } from "@/lib/constants/frame";
import { useFrameLayout } from "@/hooks/useFrameLayout";
import { useDesignStore } from "@/stores/design-store";
import { RailSlot } from "./RailSlot";
import { LicensePlateArea } from "./LicensePlateArea";
import { BottomTextBar } from "./BottomTextBar";

interface FrameCanvasProps {
  frameConfig: FrameConfig;
  slots: Record<string, PlacedTile>;
  bottomBar: BottomBarConfig;
  qrCode: QRCodeConfig;
  plateState: string;
  overSlotId?: string | null;
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

/** A placed text bar — draggable to move, or drag off the frame to remove. */
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
      title="Click to edit · drag to move · drag off the frame to remove"
      className={`absolute cursor-grab active:cursor-grabbing ${isDragging ? "opacity-40" : ""}`}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        touchAction: "none",
        zIndex: selected ? 2 : 1,
        boxShadow: selected ? "0 0 0 2px #FFD700" : undefined,
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
  function FrameCanvas({ frameConfig, slots, bottomBar, qrCode, plateState, overSlotId }, ref) {
    const frameRef = useRef<HTMLDivElement>(null);
    const textBars = useDesignStore((s) => s.textBars);
    const selectedBarId = useDesignStore((s) => s.selectedBarId);
    const selectBar = useDesignStore((s) => s.selectBar);
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

    const totalWidthInches = getTotalWidthInches(frameConfig);
    const scale = containerWidth > 0 ? containerWidth / totalWidthInches : 0;
    const tileSize = frameConfig.tileSizeInches * scale;
    const hasWings = frameConfig.wings && frameConfig.wingColumns > 0;
    const wingPx = hasWings ? frameConfig.wingWidthInches * scale : 0;
    const innerWidthPx = frameConfig.widthInches * scale;

    // Each bar sits over a run of top/bottom slots (gapless: step == tile).
    const barRect = (bar: PlacedTextBar) => ({
      x: wingPx + bar.startIndex * tileSize,
      y: bar.row === "top" ? 0 : containerHeight - tileSize,
      width: bar.widthUnits * tileSize,
      height: tileSize,
    });

    return (
      <div ref={containerRef} className="w-full flex flex-col items-center">
        {/* Main frame */}
        <div
          ref={frameRef}
          className="relative w-full rounded-md overflow-hidden"
          style={{
            height: containerHeight || "auto",
            aspectRatio: containerHeight ? undefined : `${totalWidthInches} / ${frameConfig.heightInches}`,
            background: "#111111",
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
                bottom: tileSize,
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
                bottom: tileSize,
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

          {/* All rail slots (standard + wing zones) */}
          {frameSlots.map((slot) => (
            <RailSlot
              key={slot.id}
              slot={slot}
              placedTile={slots[slot.id]}
              isOver={overSlotId === slot.id}
            />
          ))}

          {/* Text bars — draggable; drag off the frame to remove */}
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
