import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Social-share card for the MySchoolFrame landing page (myschoolframe.com
// rewrites here). This is the image a booster president's board sees when the
// link gets forwarded — the whole outreach strategy is that forward, so the
// unfurl has to look like a real company. Served by Next's file convention at
// /school/opengraph-image; overrides the site-wide Festive Frames sticker card
// for this segment only.

export const alt = "MySchoolFrame — Your school. Your story. Your frame.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The product's own palette (school-landing.css): school navy, brass, paper.
const NAVY = "#1b2a4a";
const NAVY_DEEP = "#14203a";
const BRASS = "#f8c53b";
const PAPER = "#f6f3ec";

// Graduate — the collegiate slab the builder leads with — committed next to
// this file (OFL) so Satori renders the real wordmark, not a fallback. Read
// from disk on the Node runtime: the edge-runtime fetch(new URL(...,
// import.meta.url)) pattern gets bundler-rewritten to a relative
// /_next/static asset path that fetch() cannot parse, and this build does not
// use `output: standalone`, so the src tree is present under cwd at runtime.
const graduateFont = readFile(
  join(process.cwd(), "src/app/school/_brand/Graduate.ttf"),
);

// The owner's logo, REVERSED (navy ink -> paper, brass kept) because this card is
// navy and the navy original would vanish on it. Satori takes a data: URI.
const logo = readFile(join(process.cwd(), "public/brand/msf-logo-reverse.png")).then(
  (b) => `data:image/png;base64,${b.toString("base64")}`,
);
/** public/brand/msf-logo-reverse.png is 800 x 410. */
const LOGO_W = 440;
const LOGO_H = Math.round((LOGO_W * 410) / 800);

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
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori, not the DOM */}
        <img src={await logo} width={LOGO_W} height={LOGO_H} alt="" />

        {/* The locked headline, brass middle beat matching the hero h1. */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 22,
            fontSize: 64,
            marginTop: 30,
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
            marginTop: 34,
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
