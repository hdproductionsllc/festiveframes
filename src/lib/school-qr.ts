// ─────────────────────────────────────────────────────────────
// A school's QR code — the thing a club prints. It encodes the TRACKABLE link
// (/q/<school>/<placement>, app/q), so every scan is counted and credited to where
// it was printed before the parent lands on the school's builder.
//
// Always the production address (config/season SITE_URL), never msfOrigin(): that
// one honours MSF_SITE_URL for a local run, and a code printed from a laptop must
// not encode localhost. Settings match scripts/pilot-qr.mjs, which makes the
// designed cards: error correction H (survives a crease or a thumb), the spec's
// 4-module quiet zone, near-black on white.
// ─────────────────────────────────────────────────────────────

import QRCode from "qrcode";
import { SITE_URL } from "@/config/season";

const QR_OPTIONS = { errorCorrectionLevel: "H", margin: 4, color: { dark: "#111111", light: "#FFFFFF" } } as const;

/** The address a school's QR code carries. */
export function schoolScanUrl(slug: string, placement: string): string {
  return `${SITE_URL}/q/${slug}/${placement}`;
}

/** The school's builder itself — the link to paste in a newsletter or text. */
export function schoolBuilderUrl(slug: string): string {
  return `${SITE_URL}/s/${slug}`;
}

export function schoolQrSvg(slug: string, placement: string): Promise<string> {
  return QRCode.toString(schoolScanUrl(slug, placement), { ...QR_OPTIONS, type: "svg" });
}

/** PNG at a print-friendly width (1200 px ≈ 4 in at 300 DPI). */
export function schoolQrPng(slug: string, placement: string): Promise<Buffer> {
  return QRCode.toBuffer(schoolScanUrl(slug, placement), { ...QR_OPTIONS, type: "png", width: 1200 });
}
