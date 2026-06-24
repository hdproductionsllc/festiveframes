import type { BottomBarConfig, QRCodeConfig } from "@/lib/types";

export const DEFAULT_BOTTOM_BAR: BottomBarConfig = {
  text: "FESTIVE FRAMES",
  fontFamily: "'Stars and Stripes', 'Bebas Neue', sans-serif",
  fontSize: 0.85, // BIG — borderless print, sub-inch frame, must read from the car behind
  textColor: "#FFFFFF",
  backgroundColor: "#1B2A4A",
  textAlign: "center",
  letterSpacing: 2,
};

export const DEFAULT_QR_CODE: QRCodeConfig = {
  enabled: true, // first text bar gets the QR by default
  url: "https://festiveframes.co",
  size: 40,
};
