"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import type { FrameConfig, PlacedTile, BottomBarConfig, QRCodeConfig } from "@/lib/types";
import { getTotalWidthInches } from "@/lib/constants/frame";
import { useFrameLayout } from "@/hooks/useFrameLayout";
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

export const FrameCanvas = forwardRef<FrameCanvasHandle, FrameCanvasProps>(
  function FrameCanvas({ frameConfig, slots, bottomBar, qrCode, plateState, overSlotId }, ref) {
    const frameRef = useRef<HTMLDivElement>(null);
    const {
      containerRef,
      containerWidth,
      containerHeight,
      slots: frameSlots,
      plateArea,
      bottomBarArea,
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

          {/* Left rail groove */}
          {containerWidth > 0 && (
            <div
              className="absolute bottom-0"
              style={{
                left: wingPx + tileSize * 0.1,
                width: tileSize * 0.8,
                top: tileSize,
                background: GROOVE_V_LTR,
                borderLeft: GROOVE_BORDER_DARK,
                borderRight: GROOVE_BORDER_LIGHT,
              }}
            />
          )}

          {/* Right rail groove */}
          {containerWidth > 0 && (
            <div
              className="absolute bottom-0"
              style={{
                left: wingPx + innerWidthPx - tileSize + tileSize * 0.1,
                width: tileSize * 0.8,
                top: tileSize,
                background: GROOVE_V_RTL,
                borderLeft: GROOVE_BORDER_LIGHT,
                borderRight: GROOVE_BORDER_DARK,
              }}
            />
          )}

          {/* Bottom-left groove */}
          {containerWidth > 0 && containerHeight > 0 && (
            <div
              className="absolute"
              style={{
                left: wingPx + tileSize * 0.1,
                bottom: tileSize * 0.1,
                width: tileSize * 0.8,
                height: tileSize * 0.8,
                background: GROOVE_H,
                borderTop: GROOVE_BORDER_DARK,
                borderBottom: GROOVE_BORDER_LIGHT,
              }}
            />
          )}

          {/* Bottom-right groove */}
          {containerWidth > 0 && containerHeight > 0 && (
            <div
              className="absolute"
              style={{
                left: wingPx + innerWidthPx - tileSize + tileSize * 0.1,
                bottom: tileSize * 0.1,
                width: tileSize * 0.8,
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
                className="absolute bottom-0"
                style={{
                  left: wingPx - (col + 1) * tileSize + tileSize * 0.1,
                  width: tileSize * 0.8,
                  top: tileSize,
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
                className="absolute bottom-0"
                style={{
                  left: wingPx + innerWidthPx + col * tileSize + tileSize * 0.1,
                  width: tileSize * 0.8,
                  top: tileSize,
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

          {/* Bottom text bar */}
          {bottomBarArea && (
            <BottomTextBar
              config={bottomBar}
              qrConfig={qrCode}
              x={bottomBarArea.x}
              y={bottomBarArea.y}
              width={bottomBarArea.width}
              height={bottomBarArea.height}
            />
          )}

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
