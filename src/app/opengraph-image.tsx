import { ImageResponse } from "next/og";
import { copy } from "@/content/copy";

// Code-rendered default Open Graph / social-share image for the whole site,
// served by Next's file convention at /opengraph-image. 1200x630, no external
// assets or fonts (ImageResponse/Satori supports a flexbox-only subset of CSS).
//
// Matches the LIVE "sticker" brand: a bright blue field with a cream sticker
// card — thick ink border + the signature hard offset shadow — the bold wordmark,
// a gold "Custom License Plate Frames" pill, and the tagline. (The previous
// navy/cream "Vintage Americana" version was the retired /classic look.)

export const runtime = "edge";

export const alt = `${copy.site.brandName} — ${copy.site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Sticker palette (matches the homepage + transactional emails).
const PAGE = "#fff9ec"; // warm cream card
const INK = "#1e1b17"; // text + borders + hard shadow
const GOLD = "#f8c53b";
const PINK = "#ed5aa0";
const BLUE = "#3fb0e6";
const RED = "#C8102E";

// A single five-point star drawn with clip-path (supported by Satori/next-og).
function Star({ size: s, color }: { size: number; color: string }) {
  return (
    <div
      style={{
        width: s,
        height: s,
        backgroundColor: color,
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
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: BLUE,
          padding: 56,
          fontFamily: "sans-serif",
        }}
      >
        {/* Cream sticker card with the signature thick ink border + hard offset shadow. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: PAGE,
            border: `8px solid ${INK}`,
            borderRadius: 36,
            boxShadow: `20px 20px 0 ${INK}`,
            padding: "56px 72px",
          }}
        >
          {/* Festive star row. */}
          <div style={{ display: "flex", gap: 22, marginBottom: 30 }}>
            {[PINK, GOLD, RED, GOLD, PINK].map((c, i) => (
              <Star key={i} size={i === 2 ? 46 : 34} color={c} />
            ))}
          </div>

          {/* Wordmark. */}
          <div
            style={{
              display: "flex",
              fontSize: 132,
              fontWeight: 800,
              letterSpacing: "-3px",
              lineHeight: 1,
              color: INK,
            }}
          >
            {copy.site.brandName}
          </div>

          {/* Gold pill: the descriptive product, with the brand-entity wording. */}
          <div
            style={{
              display: "flex",
              marginTop: 34,
              backgroundColor: GOLD,
              border: `5px solid ${INK}`,
              borderRadius: 999,
              padding: "12px 34px",
              fontSize: 38,
              fontWeight: 800,
              color: INK,
            }}
          >
            Custom License Plate Frames
          </div>

          {/* Tagline. */}
          <div
            style={{
              display: "flex",
              marginTop: 30,
              fontSize: 36,
              fontWeight: 600,
              color: INK,
              opacity: 0.78,
            }}
          >
            {copy.site.tagline}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
