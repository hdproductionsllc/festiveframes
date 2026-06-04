import { ImageResponse } from "next/og";
import { copy } from "@/content/copy";

// Code-rendered default Open Graph image for the whole site, served by Next's
// file convention at /opengraph-image. 1200x630, no external assets or fonts
// (ImageResponse only supports a subset of CSS, so the layout is flexbox-only).
// Vintage Americana: deep navy field, a restrained gold star motif, the brand
// wordmark in a bold condensed display weight, and the tagline beneath.

export const runtime = "edge";

export const alt = `${copy.site.brandName} — ${copy.site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand palette (see project DESIGN notes).
const NAVY_DEEP = "#0F1B33";
const NAVY = "#1B2A4A";
const CREAM = "#F4ECD8";
const GOLD = "#FFD700";
const RED = "#C8102E";

// A single five-point star drawn with clip-path (supported by Satori/next-og).
function Star({ size: s, opacity }: { size: number; opacity: number }) {
  return (
    <div
      style={{
        width: s,
        height: s,
        backgroundColor: GOLD,
        opacity,
        clipPath:
          "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
      }}
    />
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: NAVY_DEEP,
          // Subtle radial lift toward the center so the field is not flat.
          backgroundImage: `radial-gradient(circle at 50% 42%, ${NAVY} 0%, ${NAVY_DEEP} 70%)`,
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Star motif: a restrained row of stars along the top. */}
        <div
          style={{
            display: "flex",
            gap: 28,
            position: "absolute",
            top: 70,
            opacity: 0.9,
          }}
        >
          {[0.35, 0.55, 0.85, 0.55, 0.35].map((o, i) => (
            <Star key={i} size={i === 2 ? 40 : 30} opacity={o} />
          ))}
        </div>

        {/* Gold hairline framing the composition like a plate frame edge. */}
        <div
          style={{
            position: "absolute",
            top: 36,
            left: 36,
            right: 36,
            bottom: 36,
            border: `2px solid ${GOLD}`,
            opacity: 0.55,
            borderRadius: 12,
          }}
        />

        {/* Wordmark. */}
        <div
          style={{
            display: "flex",
            fontSize: 128,
            fontWeight: 800,
            letterSpacing: "-2px",
            lineHeight: 1,
            color: CREAM,
            textTransform: "uppercase",
            marginTop: 24,
          }}
        >
          {copy.site.brandName}
        </div>

        {/* Red divider rule. */}
        <div
          style={{
            width: 220,
            height: 6,
            backgroundColor: RED,
            marginTop: 36,
            marginBottom: 36,
            borderRadius: 3,
          }}
        />

        {/* Tagline. */}
        <div
          style={{
            display: "flex",
            fontSize: 40,
            fontWeight: 500,
            color: GOLD,
            letterSpacing: "1px",
          }}
        >
          {copy.site.tagline}
        </div>
      </div>
    ),
    { ...size }
  );
}
