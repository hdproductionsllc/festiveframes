// ─────────────────────────────────────────────────────────────
// generate-qr.mjs
//
// Generates print-ready QR code PNGs for booth marketing.
// Each code points at the /buy page with a UTM campaign tag so we
// can tell which physical placement (booth sign, car decal, business
// card) drove the scan.
//
// Output: public/marketing/qr/*.png
// Run:    node scripts/generate-qr.mjs
//
// Notes:
//  - 1024px wide, high error correction (level H) so the code still
//    scans even if the print is scuffed, partially covered, or has a
//    logo dropped in the center later.
//  - Wide quiet zone (margin) so scanners lock on from a few feet.
//  - Dark navy (#0F1B33) on white for strong print contrast.
//  - SITE_URL is read from src/config/season.ts so codes always match
//    the live domain. Re-run this script after the production domain
//    is confirmed there.
// ─────────────────────────────────────────────────────────────

import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import QRCode from "qrcode";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

// Read SITE_URL straight from the season config so we never hardcode
// the domain in two places. Simple regex avoids needing a TS loader.
async function readSiteUrl() {
  const seasonPath = join(repoRoot, "src", "config", "season.ts");
  const src = await readFile(seasonPath, "utf8");
  const match = src.match(/export\s+const\s+SITE_URL\s*=\s*["'`]([^"'`]+)["'`]/);
  if (!match) {
    throw new Error(`Could not find SITE_URL in ${seasonPath}`);
  }
  return match[1].replace(/\/+$/, ""); // strip any trailing slash
}

const QR_OPTIONS = {
  errorCorrectionLevel: "H", // highest recovery; survives print wear
  type: "png",
  width: 1024, // large enough to scale to 300 dpi print without softness
  margin: 4, // generous quiet zone for scan-from-distance reliability
  color: {
    dark: "#0F1B33", // brand navy-deep
    light: "#FFFFFF", // white background for max print contrast
  },
};

async function main() {
  const siteUrl = await readSiteUrl();

  const targets = [
    {
      file: "buy-booth.png",
      url: `${siteUrl}/buy?utm_source=qr&utm_campaign=booth`,
    },
    {
      file: "buy-car.png",
      url: `${siteUrl}/buy?utm_source=qr&utm_campaign=car`,
    },
    {
      file: "buy-card.png",
      url: `${siteUrl}/buy?utm_source=qr&utm_campaign=card`,
    },
  ];

  const outDir = join(repoRoot, "public", "marketing", "qr");
  await mkdir(outDir, { recursive: true });

  for (const { file, url } of targets) {
    const outPath = join(outDir, file);
    await QRCode.toFile(outPath, url, QR_OPTIONS);
    console.log(`  wrote ${file}  ->  ${url}`);
  }

  console.log(`\nDone. ${targets.length} QR PNGs written to public/marketing/qr/`);
}

main().catch((err) => {
  console.error("QR generation failed:", err);
  process.exit(1);
});
