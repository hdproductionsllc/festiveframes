import type { Metadata } from "next";
import { Graduate } from "next/font/google";
import { notFound } from "next/navigation";
// Same three-layer stylesheet stack as /lab/school, same order, same reasons —
// see that page's header comments. The builder is ONE engine; this route only
// changes which kit seeds it.
import "../../builder-fonts.css";
import "../../build/build-skin.css";
import "../../lab/school/school-skin.css";
import { SchoolBuilder } from "@/components/designer/SchoolDesigner";
import { allSchoolKits, getSchoolKit, CHIP_PRESET_PIECE } from "@/data/school-kits";

// ─── Per-school builder: /s/<slug> ───────────────────────────────────────────
//
// Each school's "own builder" is the shared engine opening in that school's kit:
// its colors on the frame body and banners, its mascot on the bottom bar, its own
// localStorage key. Adding a school is one entry in data/school-kits.ts — no new
// components, no new routes, nothing to keep in sync.

// Self-hosted via next/font — the welcome band CANNOT fall back to Times the
// way a lost @import race does on phones (which rendered the headline in a
// thin-thick serif that read as fat and filled-in; the frame banners were
// never affected because the builder re-renders on font load).
const graduate = Graduate({ weight: "400", subsets: ["latin"] });

export function generateStaticParams() {
  return allSchoolKits().map((k) => ({ slug: k.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const kit = getSchoolKit(slug);
  if (!kit) return { title: "MySchoolFrame" };
  return {
    title: `${kit.shortName} ${kit.mascot} — MySchoolFrame`,
    description: `Design a personalized ${kit.shortName} ${kit.mascot} license-plate frame in your school's colors.`,
    // Demo kits are research-guessed and the school hasn't authorized its name on a
    // public page — sales-demo only, never indexed. Flipping a kit to "verified"
    // (colors confirmed + written permission) is what opens it to search.
    robots: kit.status === "verified" ? undefined : { index: false, follow: false },
  };
}

export default async function SchoolKitBuilderPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const kit = getSchoolKit(slug);
  if (!kit) notFound();
  const w = kit.welcome;
  return (
    <div className="build-skin school-skin">
      {/* School-branded welcome: the kit's own colors and banner voice, so a
          parent arriving from a QR or a booster link lands on THEIR school,
          not on our brand. Facts in the copy come from the kit, which is
          research-sourced and owner-reviewed before a school goes live. */}
      {w && (
        <section
          style={{
            background: `linear-gradient(180deg, ${kit.colors.frame}, ${kit.colors.frame}e6)`,
            color: kit.banners.text,
            padding: "40px 20px 34px",
            textAlign: "center",
          }}
        >
          <p
            className={graduate.className}
            style={{
              margin: 0,
              fontSize: "clamp(26px, 4.2vw, 42px)",
              letterSpacing: "0.03em",
              // One soft lift only. The earlier three-layer varsity shadow
              // fattened Graduate at phone sizes and filled the letter
              // counters — at 26px a 1px glow is a third of a stroke.
              textShadow: "0 2px 4px rgba(0,0,0,0.30)",
            }}
          >
            {w.headline}
          </p>
          {w.message.map((m) => (
            <p
              key={m.slice(0, 24)}
              style={{
                maxWidth: 720,
                margin: "14px auto 0",
                fontSize: 17,
                lineHeight: 1.6,
                opacity: 0.94,
              }}
            >
              {m}
            </p>
          ))}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
              margin: "20px auto 0",
              maxWidth: 760,
            }}
          >
            {w.chips.map((c) => (
              // Live controls, not decoration: each chip carries its preset in
              // the hash; the builder below listens and composes the frame.
              <a
                key={c}
                href={`#preset=${encodeURIComponent(CHIP_PRESET_PIECE[c.toLowerCase()] ?? "generic")}`}
                style={{
                  border: `1px solid ${kit.banners.text}66`,
                  borderRadius: 999,
                  padding: "5px 14px",
                  fontSize: 13.5,
                  letterSpacing: "0.02em",
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                {c}
              </a>
            ))}
          </div>
          <p style={{ margin: "22px 0 0", fontSize: 14.5, opacity: 0.85 }}>{w.ordering}</p>
        </section>
      )}
      <SchoolBuilder kit={kit} />
    </div>
  );
}
