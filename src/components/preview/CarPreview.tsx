"use client";

import { useRef, useEffect } from "react";
import { usePreviewStore } from "@/stores/preview-store";
import { useOverlayDrag } from "@/hooks/useOverlayDrag";
import { stockCars } from "@/data/stock-cars";
import { CarSelector } from "./CarSelector";

interface CarPreviewProps {
  frameDataUrl: string | null;
}

export function CarPreview({ frameDataUrl }: CarPreviewProps) {
  const carPhotoUrl = usePreviewStore((s) => s.carPhotoUrl);
  const setCarPhoto = usePreviewStore((s) => s.setCarPhoto);
  const overlayX = usePreviewStore((s) => s.overlayX);
  const overlayY = usePreviewStore((s) => s.overlayY);
  const overlayScale = usePreviewStore((s) => s.overlayScale);
  const setOverlayScale = usePreviewStore((s) => s.setOverlayScale);

  const containerRef = useRef<HTMLDivElement>(null);
  const { onPointerDown, onPointerMove, onPointerUp, onWheel } =
    useOverlayDrag(containerRef);

  // Auto-select first stock car if none selected
  useEffect(() => {
    if (!carPhotoUrl && stockCars.length > 0) {
      setCarPhoto(stockCars[0].src, "stock");
    }
  }, [carPhotoUrl, setCarPhoto]);

  return (
    <div className="flex flex-col gap-3">
      {/* Preview viewport */}
      <div
        ref={containerRef}
        className="relative w-full rounded-md overflow-hidden bg-surface-800 cursor-grab active:cursor-grabbing select-none"
        style={{ aspectRatio: "3 / 2" }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
      >
        {/* Car photo background */}
        {carPhotoUrl && (
          <img
            src={carPhotoUrl}
            alt="Vehicle rear view"
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        )}

        {/* No car selected placeholder */}
        {!carPhotoUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-surface-500 text-sm">Select a vehicle below</p>
          </div>
        )}

        {/* Frame overlay — draggable */}
        {frameDataUrl && (
          <img
            src={frameDataUrl}
            alt="Your frame design"
            className="absolute pointer-events-auto"
            draggable={false}
            onPointerDown={onPointerDown}
            style={{
              left: `${overlayX}%`,
              top: `${overlayY}%`,
              transform: `translate(-50%, -50%) scale(${overlayScale})`,
              transformOrigin: "center center",
            }}
          />
        )}

        {/* Drag hint */}
        {frameDataUrl && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 pointer-events-none"
            data-export-ignore
          >
            <p className="text-[10px] text-surface-300">
              Drag to position &middot; Scroll to resize
            </p>
          </div>
        )}
      </div>

      {/* Car selector */}
      <CarSelector />

      {/* Scale slider */}
      <label className="flex items-center gap-3">
        <span className="text-xs text-surface-400 whitespace-nowrap">Scale</span>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.01}
          value={overlayScale}
          onChange={(e) => setOverlayScale(Number(e.target.value))}
          className="flex-1 h-1.5 rounded-full bg-surface-700 appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-brand-gold [&::-webkit-slider-thumb]:shadow-md"
        />
        <span className="text-xs text-surface-300 tabular-nums w-10 text-right">
          {Math.round(overlayScale * 100)}%
        </span>
      </label>
    </div>
  );
}
