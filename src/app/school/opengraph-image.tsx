import { ImageResponse } from "next/og";

// Social-share card for the MySchoolFrame landing page (myschoolframe.com
// rewrites here). This is the image a booster president's board sees when the
// link gets forwarded — the whole outreach strategy is that forward, so the
// unfurl has to look like a real company. Served by Next's file convention at
// /school/opengraph-image; overrides the site-wide Festive Frames sticker card
// for this segment only.

export const runtime = "edge";

export const alt = "MySchoolFrame — Your school. Your story. Your frame.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The product's own palette (school-landing.css): school navy, brass, paper.
const NAVY = "#1b2a4a";
const NAVY_DEEP = "#14203a";
const BRASS = "#f8c53b";
const PAPER = "#f6f3ec";

// Graduate — the collegiate slab the builder leads with — committed next to
// this file (OFL) so Satori renders the real wordmark, not a fallback.
const graduateFont = fetch(new URL("./_brand/Graduate.ttf", import.meta.url)).then(
  (res) => res.arrayBuffer(),
);

/** The plate-frame mark, same geometry as icon.svg. Monochrome: the chenille
 *  bar is punched OUT of the bottom band (evenodd), so it stays visible when
 *  the whole mark renders in one color. */
function Mark({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 64 64">
      <path
        fill={BRASS}
        fillRule="evenodd"
        d="M10 13 h44 a7 7 0 0 1 7 7 v24 a7 7 0 0 1 -7 7 h-44 a7 7 0 0 1 -7 -7 v-24 a7 7 0 0 1 7 -7 Z
           M11 18 a3 3 0 0 0 -3 3 v14 a3 3 0 0 0 3 3 h42 a3 3 0 0 0 3 -3 v-14 a3 3 0 0 0 -3 -3 Z
           M24.5 42 h15 a2.5 2.5 0 0 1 0 5 h-15 a2.5 2.5 0 0 1 0 -5 Z"
      />
    </svg>
  );
}

export default async function OpengraphImage() {
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
          background: `radial-gradient(1000px 500px at 50% -160px, #2a3c66 0%, ${NAVY} 55%, ${NAVY_DEEP} 100%)`,
          color: PAPER,
          fontFamily: "Graduate",
          padding: 60,
        }}
      >
        {/* Lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: 22, color: BRASS }}>
          <Mark s={64} />
          <div style={{ fontSize: 46, letterSpacing: "0.04em" }}>MySchoolFrame</div>
        </div>

        {/* The locked headline, brass middle beat matching the hero h1. */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 22,
            fontSize: 72,
            marginTop: 52,
            textAlign: "center",
          }}
        >
          <span>Your school.</span>
          <span style={{ color: BRASS }}>Your story.</span>
          <span>Your frame.</span>
        </div>

        <div
          style={{
            fontSize: 26,
            marginTop: 56,
            color: "#aab6d0",
            letterSpacing: "0.08em",
          }}
        >
          myschoolframe.com
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Graduate",
          data: await graduateFont,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
