"use client";

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

export function BottomTextBar({ config, qrConfig, x, y, width, height }: BottomTextBarProps) {
  const fontSize = Math.max(10, height * (config.fontSize ?? 0.42));
  const qrSize = Math.min(qrConfig.size, height * 0.85);

  return (
    <div
      className="overflow-hidden rounded-[3px]"
      style={{
        position: x === 0 && y === 0 ? "relative" : "absolute",
        left: x || undefined,
        top: y || undefined,
        width,
        height,
        backgroundColor: config.backgroundColor,
        boxShadow: "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2)",
      }}
    >
      <div
        className="w-full h-full flex items-center px-3 relative"
        style={{ justifyContent: config.textAlign === "left" ? "flex-start" : config.textAlign === "right" ? "flex-end" : "center" }}
      >
        <span
          className="truncate select-none font-bold"
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
          <div className="absolute right-2 flex items-center h-full">
            <QRCodeOverlay url={qrConfig.url} size={qrSize} />
          </div>
        )}
      </div>
    </div>
  );
}
