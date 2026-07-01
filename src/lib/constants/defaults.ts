import type { BottomBarConfig, QRCodeConfig } from "@/lib/types";

export const DEFAULT_BOTTOM_BAR: BottomBarConfig = {
  text: "FESTIVE FRAMES",
  fontFamily: "'Stars and Stripes', 'Bebas Neue', sans-serif",
  fontSize: 1, // FILL — auto-fit grows text to fill the bar; slider scales down from 100%
  textColor: "#FFFFFF",
  backgroundColor: "#1B2A4A",
  textAlign: "center",
  letterSpacing: 2,
};

export const DEFAULT_QR_CODE: QRCodeConfig = {
  enabled: false, // QR is opt-in — off by default; toggle it on per design
  url: "https://festiveframes.co",
  size: 40,
};
