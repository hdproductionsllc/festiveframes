import type { BottomBarConfig } from "@/lib/types";
import { luminance } from "@/lib/utils/tile-theme";
import type { SchoolProfile, TextCandidate } from "./types";

/**
 * The parts of a profile this module reads.
 *
 * Structural rather than `SchoolProfile`, because the SCAN ROUTE deliberately strips
 * `logos`/`droppedLogos` out of what it returns — those are superseded by the decoded
 * candidate list, and returning both would invite the client to render the untested
 * one. The client therefore holds an `Omit<SchoolProfile, ...>`, and a kit builder
 * that demanded the whole shape could not be called from the one place it exists to
 * serve.
 */
export type BrandSource = Pick<SchoolProfile, "names" | "mottos" | "mascots" | "colors">;

// ─── SchoolProfile → concrete design decisions ───────────────────────────────
//
// The scanner returns RANKED LISTS because every extraction can be wrong. This module
// is where the lists become one opinion: the exact banner texts and colours the
// builder should apply when the user clicks "Use this school". Pure, so the demo's
// most visible moment — paste a URL, watch the frame become the school's — is
// testable against fixture profiles with no store and no DOM.
//
// It returns null rather than a half-kit when the profile cannot support the story.
// A frame that says "HOME OF THE" with no mascot, or reskins to a link-blue primary,
// is worse than leaving the defaults: the demo's magic is that the result looks
// DELIBERATE, and a half-filled template reads as a mail merge gone wrong.

/** Only trust a candidate this confident for AUTO-application. The picker UI can
 *  still offer weaker ones — a human choosing a 0.4 guess is fine; the machine
 *  choosing it silently is how a frame ships saying HOME OF THE NEWSLETTER. */
const AUTO_CONFIDENCE = 0.55;

/** The reskin needs colours that are actually THEIRS. Below this many independent
 *  declarations, a colour is more likely a theme accent than a school colour. */
const MIN_COLOR_HITS = 2;

export interface SchoolBrandKit {
  /** For labelling the kit in the UI ("Parkway West Longhorns"). */
  schoolName: string;
  mascot: string | null;
  /** `#RRGGBB`. Primary carries the banners; secondary is offered for accents. */
  primary: string;
  secondary: string | null;
  /**
   * Ready-to-apply SECTION text patches, matching the seeded design's own shape:
   * the top strip says "HOME OF THE", the bottom's headline carries the mascot and
   * its tagline the school name. Filling the pattern the placeholder already
   * teaches — rather than inventing a new arrangement — is what makes the applied
   * frame read as "your school", instantly, to someone who has seen any gym wall.
   */
  top: Partial<BottomBarConfig>;
  bottom: Partial<BottomBarConfig>;
  /** What was decided and why, in order. Shown in the debug panel and asserted in
   *  tests, so a silent change of opinion cannot ship unnoticed. */
  notes: string[];
}

/** Best candidate at or above the auto floor, or null. */
function best(list: TextCandidate[]): TextCandidate | null {
  const top = list[0];
  return top && top.confidence >= AUTO_CONFIDENCE ? top : null;
}

/**
 * Text colour for a banner on `bg` — white on dark, near-black on light. The same
 * luminance split the tile edges use, so the reskinned banners follow the exact rule
 * the rest of the frame already obeys.
 */
export function bannerTextOn(bg: string): string {
  return luminance(bg) > 0.55 ? "#1e1b17" : "#FFFFFF";
}

/**
 * Decide the whole kit, or decline.
 *
 * Copy shape is deliberate and fixed rather than configurable: the top bar carries
 * the SCHOOL, the bottom carries the IDENTITY. "HOME OF THE {MASCOT}" is the single
 * most common piece of real school-gym English there is, which is exactly why the
 * mascot extractor hunts that phrase on the way in — the demo plays the school's own
 * words back to it. Motto is the fallback when no mascot clears the floor, because a
 * motto is still THEIRS; a generic "GO TEAM" is nobody's.
 */
export function buildBrandKit(profile: BrandSource): SchoolBrandKit | null {
  const notes: string[] = [];

  const name = best(profile.names);
  if (!name) return null; // no confident name → nothing to hang the story on
  notes.push(`name "${name.value}" from ${name.source} (${name.confidence.toFixed(2)})`);

  // Colours: the first candidate with real corroboration. `role` is assigned by
  // rank order upstream, but rank alone is not enough here — hits is what separates
  // "declared once by a carousel" from "declared everywhere the brand shows up".
  const solid = profile.colors.filter((c) => c.hits >= MIN_COLOR_HITS);
  const primary = solid[0] ?? null;
  if (!primary) return null; // reskinning to a guessed colour is worse than not reskinning
  const secondary = solid.find((c) => c.hex !== primary.hex) ?? null;
  notes.push(`primary ${primary.hex} (${primary.hits} hits), secondary ${secondary?.hex ?? "none"}`);

  const mascot = best(profile.mascots);
  const motto = best(profile.mottos);
  if (!mascot && !motto) return null; // a one-banner kit reads as broken, not minimal

  const textColor = bannerTextOn(primary.hex);
  // With a mascot: the classic gym-wall stack — HOME OF THE / LONGHORNS — with the
  // school's name in the tagline tier, so all three identities are on the frame.
  // Without one: the name takes the headline and the motto the tagline, which is
  // still unmistakably theirs; "HOME OF THE" with nothing under it never ships.
  const top = mascot ? "HOME OF THE" : name.value.toUpperCase();
  const headline = mascot ? mascot.value.toUpperCase() : (motto!.value.toUpperCase());
  const tagline = mascot ? name.value.toUpperCase() : undefined;
  notes.push(mascot ? `stack from mascot "${mascot.value}"` : `stack from motto "${motto!.value}"`);

  return {
    schoolName: name.value,
    mascot: mascot?.value ?? null,
    primary: primary.hex,
    secondary: secondary?.hex ?? null,
    top: { text: top, backgroundColor: primary.hex, textColor },
    bottom: {
      text: headline,
      ...(tagline !== undefined ? { tagline } : {}),
      backgroundColor: primary.hex,
      textColor,
    },
    notes,
  };
}
