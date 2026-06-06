"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRCodeOverlayProps {
  /** Destination the QR encodes. Defaults to the live site. */
  url?: string;
  size: number;
}

// Generates the QR from the configured URL at runtime, so the code on screen
// (and in the printed export) always points exactly where `url` says — no
// dependence on a pre-baked image whose destination we can't verify.
export function QRCodeOverlay({ url = "https://festiveframes.co", size }: QRCodeOverlayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, {
      margin: 1,
      errorCorrectionLevel: "M",
      width: Math.max(120, Math.round(size * 3)), // render high-res, scale down for crispness
      color: { dark: "#000000", light: "#FFFFFF" },
    })
      .then((d) => active && setDataUrl(d))
      .catch(() => active && setDataUrl(null));
    return () => {
      active = false;
    };
  }, [url, size]);

  if (!dataUrl) {
    // Placeholder keeps layout stable until the code is ready.
    return <div className="rounded-sm bg-white/90" style={{ width: size, height: size }} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={`QR code linking to ${url}`}
      width={size}
      height={size}
      className="rounded-sm bg-white"
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
