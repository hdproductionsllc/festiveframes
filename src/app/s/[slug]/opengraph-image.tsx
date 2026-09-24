import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { isBuilderOpen, pilotSchoolKits } from "@/data/school-pilot";
import { resolveSchoolKit } from "@/data/school-resolve";
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
// field, its own name is the headline, and the MySchoolFrame logo sits above it.

export const alt = "MySchoolFrame — a custom license plate frame in your school's colors";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRASS = "#f8c53b";
const PAPER = "#f6f3ec";
const NAVY = "#1b2a4a";

/** The pilot schools' cards are baked; anything else renders on demand
 *  (`dynamicParams` defaults to true, which is what serves them) — as the
 *  neutral card while the pilot gate is closed to it. */
export function generateStaticParams() {
  return pilotSchoolKits().map((k) => ({ slug: k.slug }));
}

// Graduate — the collegiate slab the product is set in — committed under
// /school/_brand (OFL). Read from disk on the Node runtime for the reason
// documented on the /school card: the edge-runtime fetch(new URL(...)) pattern
// gets bundler-rewritten to a path fetch() cannot parse.
const graduateFont = readFile(join(process.cwd(), "src/app/school/_brand/Graduate.ttf"));

// The owner's logo in its own navy and brass, seated on a paper plate. The field is
// the SCHOOL'S colour — any colour at all — and no single ink reads on every one of
// them, so the logo brings its own ground instead of being recoloured per school.
const logo = readFile(join(process.cwd(), "public/brand/msf-logo.png")).then(
  (b) => `data:image/png;base64,${b.toString("base64")}`,
);
/** public/brand/msf-logo.png is 800 x 410. */
const LOGO_W = 250;
const LOGO_H = Math.round((LOGO_W * 410) / 800);

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // The RESOLVER, not the authored catalogue: /s/<slug> is national now, and a
  // card is the whole point of the school link a booster forwards into a group
  // chat. Without this every one of the 29,440 roster schools unfurled as "YOUR
  // SCHOOL" on a stock navy field — the generic card this file was written to
  // stop, just with a different cause.
  //
  // Behind the SAME pilot gate as the page: a school outside the pilot gets the
  // neutral card (navy, our logo, no school name or colours). Its page says "we're
  // not ready for X yet", and an unfurl in that school's colours saying "Design
  // their frame" would claim the relationship the page is careful not to.
  const resolved = resolveSchoolKit(slug);
  const kit = resolved && isBuilderOpen(resolved.slug) ? resolved : null;
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
        <div
          style={{
            display: "flex",
            padding: "14px 22px",
            background: PAPER,
            borderRadius: 18,
            boxShadow: "0 6px 18px rgba(0,0,0,0.28)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori, not the DOM */}
          <img src={await logo} width={LOGO_W} height={LOGO_H} alt="" />
        </div>

        {/* The SCHOOL, as large as it fits. This is the whole point of the card:
            a booster board should see their own name, not ours. */}
        <div
          style={{
            display: "flex",
            textAlign: "center",
            fontSize: name.length > 26 ? 58 : 76,
            lineHeight: 1.1,
            marginTop: 34,
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

        <div style={{ display: "flex", fontSize: 26, marginTop: 36, opacity: 0.8, letterSpacing: "0.06em" }}>
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
