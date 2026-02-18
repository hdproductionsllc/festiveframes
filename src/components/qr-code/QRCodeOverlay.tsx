"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRCodeOverlayProps {
  url: string;
  size: number;
}

export function QRCodeOverlay({ url, size }: QRCodeOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !url) return;

    QRCode.toCanvas(canvas, url, {
      width: size,
      margin: 1,
      color: { dark: "#000000", light: "#FFFFFF" },
    }).catch(() => {
      // Silently fail for invalid URLs
    });
  }, [url, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-sm"
      style={{ width: size, height: size }}
    />
  );
}
