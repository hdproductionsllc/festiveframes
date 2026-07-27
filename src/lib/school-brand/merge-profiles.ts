import type { SchoolProfile, TextCandidate, ColorCandidate, LogoCandidate } from "./types";

// ─── Fold second-hop pages into the entry page's profile ─────────────────────
//
// The second hop exists because the entry page's logo is usually the too-small one
// (see crawl-targets.ts). Merging is evidence ACCUMULATION, not replacement: the
// entry page stays the identity anchor — it is the URL the user vouched for — and
// the athletics/brand pages contribute candidates into the same ranked lists.

/** Concat + dedupe text candidates by normalised value, keeping the best score. */
function mergeText(base: TextCandidate[], extra: TextCandidate[]): TextCandidate[] {
  const byValue = new Map<string, TextCandidate>();
  for (const c of [...base, ...extra]) {
    const key = c.value.trim().toLowerCase();
    const prev = byValue.get(key);
    if (!prev || prev.confidence < c.confidence) byValue.set(key, c);
  }
  return [...byValue.values()].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Colours SUM their hit counts across pages. `hits` is the corroboration measure the
 * brand kit gates on (MIN_COLOR_HITS), and a colour declared once on the homepage
 * and once on the athletics page IS corroborated — two independent pages agreeing is
 * stronger evidence than two declarations in one stylesheet, not weaker.
 */
function mergeColors(base: ColorCandidate[], extra: ColorCandidate[]): ColorCandidate[] {
  const byHex = new Map<string, ColorCandidate>();
  for (const c of [...base, ...extra]) {
    const prev = byHex.get(c.hex);
    if (!prev) {
      byHex.set(c.hex, { ...c });
    } else {
      prev.hits += c.hits;
      prev.confidence = Math.max(prev.confidence, c.confidence);
    }
  }
  return [...byHex.values()].sort(
    (a, b) => b.confidence - a.confidence || b.hits - a.hits,
  );
}

/** Logos dedupe on URL, keeping the higher-scored duplicate. */
function mergeLogos(base: LogoCandidate[], extra: LogoCandidate[]): LogoCandidate[] {
  const byUrl = new Map<string, LogoCandidate>();
  for (const c of [...base, ...extra]) {
    const prev = byUrl.get(c.url);
    if (!prev || prev.score < c.score) byUrl.set(c.url, c);
  }
  return [...byUrl.values()].sort((a, b) => b.score - a.score);
}

/**
 * Merge second-hop profiles into the entry profile.
 *
 * Deliberately NOT merged: `platform` and its confidence/signals (the entry page
 * fingerprinted the site; a vendor-hosted subpage disagreeing is noise), `pageUrl`
 * and `host` (the user's URL is the identity), and `droppedLogos` (debug data whose
 * page of origin matters — concatenated it would say a candidate was dropped from a
 * page it never appeared on).
 */
export function mergeProfiles(entry: SchoolProfile, extras: SchoolProfile[]): SchoolProfile {
  if (extras.length === 0) return entry;
  let names = entry.names;
  let mottos = entry.mottos;
  let mascots = entry.mascots;
  let colors = entry.colors;
  let logos = entry.logos;
  for (const p of extras) {
    names = mergeText(names, p.names);
    mottos = mergeText(mottos, p.mottos);
    mascots = mergeText(mascots, p.mascots);
    colors = mergeColors(colors, p.colors);
    logos = mergeLogos(logos, p.logos);
  }
  return { ...entry, names, mottos, mascots, colors, logos };
}
