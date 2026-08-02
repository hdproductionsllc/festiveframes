import { Graduate } from "next/font/google";
import type { FrameConfig } from "@/lib/types";
import { BuilderFontsDeferred } from "@/app/BuilderFontsDeferred";
import { SchoolBuilder } from "@/components/designer/SchoolDesigner";
import { CHIP_PRESET_PIECE, type SchoolKit } from "@/data/school-kits";

// ─── A school's own builder page ─────────────────────────────────────────────
//
// The body of /s/<slug>, lifted out so a second GEOMETRY can serve the same page
// without a copy of it. Extracted when the slim fork needed to be shown wearing a
// real school: /lab/slim was the generic Wildcats builder, so the one thing the
// fork exists to be judged on — how a keystone reads under a real school's name,
// on real artwork — was the one thing it could not show. Duplicating this markup
// to fix that would have meant two heroes drifting apart, which is the same
// mistake the two RENDERERS keep making.
//
// The frame is a parameter; nothing else is. Both routes get the same welcome
// band, the same chips, the same store wiring, and `SchoolBuilder` scopes the
// persist key by variant + slug so a slim design can never reach the live one.

// Self-hosted via next/font — the welcome band CANNOT fall back to Times the way a
// lost @import race does on phones (which rendered the headline in a thin-thick
// serif that read as fat and filled-in; the frame banners were never affected
// because the builder re-renders on font load).
const graduate = Graduate({ weight: "400", subsets: ["latin"] });

export function SchoolKitPage({
  kit,
  /** Omit for the live geometry. The fork passes SCHOOL_SLIM_FRAME_CONFIG. */
  frameConfig,
  /** Scopes the persist key, so two geometries never share a saved design. */
  variant,
  /** Rendered above the hero. The fork uses it to say what it is. */
  banner,
}: {
  kit: SchoolKit;
  frameConfig?: FrameConfig;
  variant?: string;
  banner?: React.ReactNode;
}) {
  const w = kit.welcome;
  return (
    // The school's colour is handed to the CHROME, not just the frame: the stage,
    // the panel headers and the primary action all read from `--ff-school`, so the
    // builder wears the school instead of sitting in neutral grey beside it.
    <div
      className="build-skin school-skin"
      style={{ "--ff-school": kit.colors.frame } as React.CSSProperties}
    >
      {banner}
      {/* The font picker's optional faces, loaded after paint so they cannot
          block a parent seeing their school's frame. See the component. */}
      <BuilderFontsDeferred />
      {/* School-branded welcome: the kit's own colors and banner voice, so a
          parent arriving from a QR or a booster link lands on THEIR school,
          not on our brand. Facts in the copy come from the kit, which is
          research-sourced and owner-reviewed before a school goes live. */}
      <SchoolBuilder
        kit={kit}
        frameConfig={frameConfig}
        variant={variant}
        hero={w ? (
          <section className="msf-kit-hero">
            {/* The school's own lockup, above its own words. This is the first
                thing on the page for a reason: a parent should recognise their
                school before they read anything. Only kits carrying authorized
                marks have one — everyone else opens on the headline. */}
            {/* Kit marks are arbitrary per-school files, so next/image would need
                every one of them whitelisted. */}
            {kit.marks?.lockup && (
              // eslint-disable-next-line @next/next/no-img-element
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
        ) : null}
      />
    </div>
  );
}
