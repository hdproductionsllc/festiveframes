import type { Metadata } from "next";
import { Graduate } from "next/font/google";
import { notFound } from "next/navigation";
// Same three-layer stylesheet stack as /lab/school, same order, same reasons —
// see that page's header comments. The builder is ONE engine; this route only
// changes which kit seeds it.
import "../../school-fonts.css";
import { BuilderFontsDeferred } from "../../BuilderFontsDeferred";
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
    // The school's colour is handed to the CHROME, not just the frame: the stage,
    // the panel headers and the primary action all read from `--ff-school`, so the
    // builder wears the school instead of sitting in neutral grey beside it.
    <div
      className="build-skin school-skin"
      style={{ "--ff-school": kit.colors.frame } as React.CSSProperties}
    >
      {/* The font picker's optional faces, loaded after paint so they cannot
          block a parent seeing their school's frame. See the component. */}
      <BuilderFontsDeferred />
      {/* School-branded welcome: the kit's own colors and banner voice, so a
          parent arriving from a QR or a booster link lands on THEIR school,
          not on our brand. Facts in the copy come from the kit, which is
          research-sourced and owner-reviewed before a school goes live. */}
      <SchoolBuilder kit={kit} hero={w ? (
        <section className="msf-kit-hero">
          {/* The school's own lockup, above its own words. This is the first
              thing on the page for a reason: a parent should recognise their
              school before they read anything. Only kits carrying authorized
              marks have one — everyone else opens on the headline. */}
          {kit.marks?.lockup && (
            // eslint-disable-next-line @next/next/no-img-element -- kit marks are
            // arbitrary per-school files; next/image would need each one whitelisted.
            <img className="msf-kit-lockup" src={kit.marks.lockup} alt={`${kit.schoolName} logo`} />
          )}
          <p className={`msf-kit-headline ${graduate.className}`}>{w.headline}</p>
          {w.message.map((m) => (
            <p className="msf-kit-line" key={m.slice(0, 24)}>
              {m}
            </p>
          ))}
          {/* Say what they ARE. They were styled as pills and read as a list of
              facts about the school, so nobody knew a whole frame was one tap
              away. The label names the action, the arrow marks them as controls,
              and the hover lifts them. */}
          <p className="msf-kit-chips-label">
            One tap builds the frame. Pick what they do:
          </p>
          <div className="msf-kit-chips">
            {w.chips.map((c) => (
              // Live controls, not decoration: each chip carries its preset in
              // the hash; the builder below listens and composes the frame.
              <a
                key={c}
                className="msf-kit-chip"
                href={`#preset=${encodeURIComponent(CHIP_PRESET_PIECE[c.toLowerCase()] ?? "generic")}`}
              >
                {c}
                <span aria-hidden className="msf-kit-chip-go">→</span>
              </a>
            ))}
          </div>
          <p className="msf-kit-ordering">{w.ordering}</p>
        </section>
      ) : null} />
    </div>
  );
}
