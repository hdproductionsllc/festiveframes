import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getSchoolKit, allSchoolKits } from "@/data/school-kits";
import { shift, luminance } from "@/lib/utils/tile-theme";

// ─── The share card for ONE school's builder ─────────────────────────────────
//
// /s/<school> is the page a parent reaches from a QR code in the bleachers and
// the link a booster president forwards to a board. It had no card of its own, so
// Next fell back to the app root's — and the app root is FESTIVE FRAMES, a
// patriotic blue sticker reading "Custom License Plate Frames". Every school link
// anyone shared unfurled as a different company's product.
//
// Icons resolve the same way: /s now carries its own icon.svg and apple-icon.png
// beside this file, because /s and /school are different route segments and the
// MySchoolFrame set under /school never reached here.
//
// Generated from the kit, so a new school needs nothing: its own colour is the
// field, its own name is the headline, and the MySchoolFrame mark sits above it.

export const alt = "MySchoolFrame — a custom license plate frame in your school's colors";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRASS = "#f8c53b";
const PAPER = "#f6f3ec";
const NAVY = "#1b2a4a";

export function generateStaticParams() {
  return allSchoolKits().map((k) => ({ slug: k.slug }));
}

// Graduate — the collegiate slab the product is set in — committed under
// /school/_brand (OFL). Read from disk on the Node runtime for the reason
// documented on the /school card: the edge-runtime fetch(new URL(...)) pattern
// gets bundler-rewritten to a path fetch() cannot parse.
const graduateFont = readFile(join(process.cwd(), "src/app/school/_brand/Graduate.ttf"));

/** The plate-frame mark, same geometry as icon.svg, in one colour. */
function Mark({ s, color }: { s: number; color: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 64 64">
      <path
        fill={color}
        fillRule="evenodd"
        d="M10 13 h44 a7 7 0 0 1 7 7 v24 a7 7 0 0 1 -7 7 h-44 a7 7 0 0 1 -7 -7 v-24 a7 7 0 0 1 7 -7 Z
           M11 18 a3 3 0 0 0 -3 3 v14 a3 3 0 0 0 3 3 h42 a3 3 0 0 0 3 -3 v-14 a3 3 0 0 0 -3 -3 Z
           M24.5 42 h15 a2.5 2.5 0 0 1 0 5 h-15 a2.5 2.5 0 0 1 0 -5 Z"
      />
    </svg>
  );
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const kit = getSchoolKit(slug);
  // An unknown slug 404s on the page itself; the card still has to render.
  const field = kit?.colors.frame ?? NAVY;
  const ink = kit?.banners.text ?? PAPER;
  // The accent has to read against the SCHOOL'S colour, not against navy. A brass
  // wordmark on a gold-ish school would vanish, which is the same defect the
  // banner lettering had.
  const accent = Math.abs(luminance(BRASS) - luminance(field)) > 0.25 ? BRASS : shift(ink, -0.25);
  const name = kit ? kit.schoolName.toUpperCase() : "YOUR SCHOOL";
  const mascot = kit ? kit.mascot.toUpperCase() : "";

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
          background: `radial-gradient(1000px 500px at 50% -160px, ${shift(field, 0.18)} 0%, ${field} 55%, ${shift(field, -0.3)} 100%)`,
          color: ink,
          fontFamily: "Graduate",
          padding: 60,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, color: accent }}>
          <Mark s={52} color={accent} />
          <div style={{ fontSize: 36, letterSpacing: "0.04em" }}>MySchoolFrame</div>
        </div>

        {/* The SCHOOL, as large as it fits. This is the whole point of the card:
            a booster board should see their own name, not ours. */}
        <div
          style={{
            display: "flex",
            textAlign: "center",
            fontSize: name.length > 26 ? 58 : 76,
            lineHeight: 1.1,
            marginTop: 44,
            maxWidth: 1000,
          }}
        >
          {name}
        </div>

        {mascot && (
          <div style={{ display: "flex", fontSize: 46, marginTop: 20, color: accent }}>
            {mascot.toUpperCase()}
          </div>
        )}

        <div style={{ display: "flex", fontSize: 26, marginTop: 46, opacity: 0.8, letterSpacing: "0.06em" }}>
          Design their frame · myschoolframe.com
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Graduate", data: await graduateFont, style: "normal", weight: 400 }],
    },
  );
}
