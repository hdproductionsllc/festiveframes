"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { BottomBarConfig, QRCodeConfig } from "@/lib/types";
import { QRCodeOverlay } from "@/components/qr-code/QRCodeOverlay";

interface BottomTextBarProps {
  config: BottomBarConfig;
  qrConfig: QRCodeConfig;
  x: number;
  y: number;
  width: number;
  height: number;
}

const PAD_X = 12; // matches px-3

export function BottomTextBar({ config, qrConfig, x, y, width, height }: BottomTextBarProps) {
  const baseFontSize = Math.max(10, height * (config.fontSize ?? 0.42));
  const qrSize = Math.min(qrConfig.size, height * 0.85);

  const spanRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(baseFontSize);
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

  // Right padding reserves space for the QR so text never slides under it,
  // for any alignment.
  const rightPad = qrConfig.enabled ? qrSize + 16 : PAD_X;

  // Shrink the font until the text fits — guarantees no cut-off, whatever the
  // quantized bar width turned out to be.
  useLayoutEffect(() => {
    const span = spanRef.current;
    if (!span) return;
    const avail = width - PAD_X - rightPad;
    if (avail <= 0) return;
    let fs = baseFontSize;
    span.style.fontSize = `${fs}px`;
    let guard = 0;
    while (span.scrollWidth > avail && fs > 6 && guard < 80) {
      fs -= 1;
      span.style.fontSize = `${fs}px`;
      guard++;
    }
    setFontSize(fs);
  }, [
    config.text,
    config.fontFamily,
    config.letterSpacing,
    config.fontSize,
    width,
    height,
    qrConfig.enabled,
    qrSize,
    baseFontSize,
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
          paddingLeft: PAD_X,
          paddingRight: rightPad,
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
          <div className="absolute right-2 flex h-full items-center">
            <QRCodeOverlay url={qrConfig.url} size={qrSize} />
          </div>
        )}
      </div>
    </div>
  );
}
