"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { BottomBarConfig, QRCodeConfig } from "@/lib/types";
import { QRCodeOverlay } from "@/components/qr-code/QRCodeOverlay";
import {
  fitTextBarFont,
  textBarAvailWidth,
  QR_SIZE_RATIO,
  QR_GAP_RATIO,
} from "@/lib/utils/text-bar";

interface BottomTextBarProps {
  config: BottomBarConfig;
  qrConfig: QRCodeConfig;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function BottomTextBar({ config, qrConfig, x, y, width, height }: BottomTextBarProps) {
  // QR sized exactly like the render (fraction of bar height) so preview == print.
  const qrSize = height * QR_SIZE_RATIO;

  const spanRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(() => height * 0.6);
  const [fontTick, setFontTick] = useState(0);

  // Re-measure once web fonts finish loading (metrics change Bebas etc.).
  useEffect(() => {
    let active = true;
    const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
    fonts?.ready?.then(() => active && setFontTick((t) => t + 1));
    return () => {
      active = false;
    };
  }, []);

  // Side padding mirrors the render geometry (fractions of bar height); the QR's
  // width is reserved on BOTH sides so centered text stays centered, exactly as
  // textBarAvailWidth() computes it for the proof render.
  const sidePad = (width - textBarAvailWidth(width, height, qrConfig.enabled)) / 2;

  // AUTO-FIT: grow the font to the largest size that fills the bar height and
  // still fits the available width — the SAME shared rule the proof render uses,
  // so the live preview matches the exported banner exactly (true WYSIWYG).
  useLayoutEffect(() => {
    const span = spanRef.current;
    if (!span) return;
    const ctx = (span.ownerDocument.createElement("canvas")).getContext("2d");
    if (!ctx) return;
    const avail = textBarAvailWidth(width, height, qrConfig.enabled);
    if (avail <= 0) return;
    const text = config.text || "YOUR TEXT HERE";
    const fs = fitTextBarFont(ctx, text, config.fontFamily, config.letterSpacing, height, avail, config.fontSize ?? 1);
    setFontSize(fs);
  }, [
    config.text,
    config.fontFamily,
    config.letterSpacing,
    config.fontSize,
    width,
    height,
    qrConfig.enabled,
    fontTick,
  ]);

  return (
    <div
      className="overflow-hidden rounded-[3px]"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        backgroundColor: config.backgroundColor,
        boxShadow: "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2)",
      }}
    >
      <div
        className="relative flex h-full w-full items-center"
        style={{
          justifyContent: config.textAlign === "left" ? "flex-start" : config.textAlign === "right" ? "flex-end" : "center",
          paddingLeft: sidePad,
          paddingRight: sidePad,
        }}
      >
        <span
          ref={spanRef}
          className="select-none whitespace-nowrap font-bold"
          style={{
            fontFamily: config.fontFamily,
            color: config.textColor,
            fontSize,
            letterSpacing: config.letterSpacing,
          }}
        >
          {config.text || "YOUR TEXT HERE"}
        </span>

        {qrConfig.enabled && (
          <div className="absolute flex h-full items-center" style={{ right: height * QR_GAP_RATIO }}>
            <QRCodeOverlay url={qrConfig.url} size={qrSize} />
          </div>
        )}
      </div>
    </div>
  );
}
