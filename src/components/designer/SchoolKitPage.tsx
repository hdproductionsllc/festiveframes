import Image from "next/image";
import { Graduate } from "next/font/google";
import type { FrameConfig } from "@/lib/types";
import type { SchoolVariantId } from "@/data/school-variants";
import { BuilderFontsDeferred } from "@/app/BuilderFontsDeferred";
import { SchoolBuilder } from "@/components/designer/SchoolDesigner";
import { chipPiece, type SchoolKit } from "@/data/school-kits";

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
  /** Offer the website scanner for THIS school. Only /s/<slug> on a roster-backed
   *  (thin) kit passes it — see SchoolBuilder's `brandScan`. */
  brandScan,
  /** The production print-file export in the header. Lab routes only — see
   *  SchoolDesigner's `operatorTools`. */
  operatorTools = false,
}: {
  kit: SchoolKit;
  frameConfig?: FrameConfig;
  variant?: SchoolVariantId;
  banner?: React.ReactNode;
  brandScan?: { slug: string; heading?: string; blurb?: React.ReactNode };
  operatorTools?: boolean;
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
        brandScan={brandScan}
        operatorTools={operatorTools}
        hero={w ? (
          <section className="msf-kit-hero">
            {/* The school's own lockup, above its own words. This is the first
                thing on the page for a reason: a parent should recognise their
                school before they read anything. Only kits carrying authorized
                marks have one — everyone else opens on the headline. */}
            {/* Whitelisting is a REMOTE-url rule. A kit's marks are files we ship
                under public/kits, so next/image optimizes them with nothing added
                to next.config — which matters here, because this is the first and
                largest thing on the page (SLUH's lockup is a 115 KB PNG drawn into
                304 CSS px on a phone). A kit pointing at somebody else's host would
                need the whitelist, so that case keeps the raw <img>.
                The intrinsic size is SLUH's lockup, the only one in the catalogue;
                it sets the pre-decode aspect ratio only — `.msf-kit-lockup` gives
                the box `width: min(400px, 78vw); height: auto`, and once the file
                is decoded the browser uses its real ratio. A future kit with a
                differently-shaped lockup would reflow once on load, not stretch. */}
            {kit.marks?.lockup && (kit.marks.lockup.startsWith("/") ? (
              <Image
                className="msf-kit-lockup"
                src={kit.marks.lockup}
                alt={`${kit.schoolName} logo`}
                width={776}
                height={249}
                sizes="(max-width: 512px) 78vw, 400px"
                priority
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="msf-kit-lockup" src={kit.marks.lockup} alt={`${kit.schoolName} logo`} />
            ))}
            {/* THE SCHOOL'S OWN MARK beside its welcome, for the kits that have a
                crest and no lockup (all six pilot schools). A parent arriving from a
                QR recognises the mustang before reading a word, and it sits BESIDE
                the headline rather than above it, so it costs the first screen no
                height: on a phone the whole band has to stay short enough that the
                frame is on screen too. */}
            <div className="msf-kit-title">
              {!kit.marks?.lockup && kit.marks?.crest?.startsWith("/") && (
                <Image
                  className="msf-kit-crest"
                  src={kit.marks.crest}
                  alt=""
                  width={160}
                  height={160}
                  sizes="(max-width: 639px) 64px, 88px"
                  priority
                />
              )}
              <p className={`msf-kit-headline ${graduate.className}`}>{w.headline}</p>
            </div>
            {/* The school's story. On a phone it waits at the foot of the builder
                (SchoolDesigner reads the same kit), because up here its three lines
                were what kept the frame off the first screen. */}
            {w.message.map((m) => (
              <p className="msf-kit-line msf-kit-roomy" key={m.slice(0, 24)}>
                {m}
              </p>
            ))}
            {/* Say what the chips ARE: styled as pills they read as a list of facts
                about the school, so the label names the action and the arrow marks
                each one as a control. */}
            <p className="msf-kit-chips-label">
              Tap an activity and we&apos;ll build the frame around it:
            </p>
            <div className="msf-kit-chips">
              {w.chips.flatMap((c) => {
                // Live controls, not decoration: each chip carries its badge in
                // the hash; the builder below listens and composes the frame. A
                // label with no badge is a tradition, not an activity — tapping it
                // could only ever build the generic crest — so it is not a chip.
                const piece = chipPiece(c);
                return piece ? [
                  <a key={c} className="msf-kit-chip" href={`#preset=${encodeURIComponent(piece)}`}>
                    {c}
                    <span aria-hidden className="msf-kit-chip-go">→</span>
                  </a>,
                ] : [];
              })}
            </div>
            {/* On a phone this sentence sits beside the Send button instead. */}
            <p className="msf-kit-ordering msf-kit-roomy">{w.ordering}</p>
          </section>
        ) : null}
      />
    </div>
  );
}
