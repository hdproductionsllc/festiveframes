import type { BottomBarConfig } from "@/lib/types";
import { luminance, shift } from "@/lib/utils/tile-theme";
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
   * The FRAME BODY colour — the largest single area of the product, and the reason
   * a school-branded frame reads as that school's at a glance.
   *
   * Not simply `primary`: the banners are primary, and a body in the same colour
   * swallows them. So the body takes the SECONDARY when the school has a real one,
   * and otherwise a darkened primary — related, obviously deliberate, and still
   * separated from the banners sitting on it.
   */
  frameColor: string;
  /** Painted behind every badge. The same surface colour as the body, so the frame
   *  reads as one object rather than tiles floating on an unrelated ground. */
  tileFieldColor: string;
  /**
   * Stands in for the BRASS rim — the LIGHTER of the school's two colours.
   *
   * Which one is lighter is decided by luminance, not by rank. The scan orders
   * colours by confidence, and that order says which is more likely to be a brand
   * colour, NOT which can carry an edge. A rim reads as metal because it runs
   * bright-to-dark; a dark rim on a dark body simply disappears, so the pair has to
   * be sorted by lightness before it is assigned.
   */
  rimColor: string;
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

  // The BANNERS take the same surface colour as the badges — see below. They used to
  // take `primary` while the badges took the darker of the pair, so whenever primary
  // was the lighter colour the frame came back with light banners and dark badges and
  // read as two designs sharing a plate. One background, one scheme.
  // A body identical to the banners hides them; a body unrelated to them looks like
  // two designs. Secondary if the school has one, else primary pushed away from the
  // banners — down on a light primary, and only slightly down on a dark one, since
  // darkening #101828 further just makes two blacks.
  // Schools almost always have two colours, and which is which matters more than
  // which the scan ranked first. Sort the pair by LUMINANCE and give each the job it
  // can actually do: the darker one becomes the surfaces (body and every badge
  // field), the lighter one replaces the gold rim. Ranking alone would routinely put
  // a navy on the rim, where it vanishes against a navy body.
  const pair = secondary
    ? [primary.hex, secondary.hex].sort((a, b) => luminance(a) - luminance(b))
    : null;
  const darker = pair ? pair[0] : shift(primary.hex, luminance(primary.hex) > 0.5 ? -0.45 : -0.3);
  const lighter = pair ? pair[1] : shift(primary.hex, 0.45);
  const frameColor = darker;
  const tileFieldColor = darker;
  const rimColor = lighter;
  // Recomputed against the surface it actually sits on, not against `primary`.
  const textColor = bannerTextOn(darker);
  notes.push(
    pair
      ? `surfaces ${darker} (darker of the pair, banners included), rim ${lighter} (lighter)`
      : `surfaces ${darker} + rim ${lighter}, both derived from the one colour found`,
  );
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
    frameColor,
    tileFieldColor,
    rimColor,
    top: { text: top, backgroundColor: darker, textColor },
    bottom: {
      text: headline,
      ...(tagline !== undefined ? { tagline } : {}),
      backgroundColor: darker,
      textColor,
    },
    notes,
  };
}
