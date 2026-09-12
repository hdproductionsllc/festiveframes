import { allSchoolKits, getSchoolKit, type SchoolKit } from "@/data/school-kits";
import { rosterEntry, type RosterEntry } from "@/data/roster";
import { thinKitFromRoster } from "@/data/thin-kit";

// ─── What school is /s/<slug>? ───────────────────────────────────────────────
//
// One answer, in one place, for a question three callers ask (the builder page,
// its metadata, the sample renderer). The order is the product:
//
//   1. AN AUTHORED KIT WINS. The 27 carry researched facts, real colours and
//      sometimes the school's own marks. A roster row for the same school is a
//      worse page about the same school, so it never gets served.
//   2. Otherwise the ROSTER, through `thinKitFromRoster` — a working builder in
//      neutral navy that claims nothing.
//   3. Otherwise nothing, and the caller 404s.
//
// The one wrinkle is that a school with an authored kit has TWO slugs: the
// authored one ("sluh-jr-bills") and the one its roster row derives
// ("st-louis-university-high-school-saint-louis-mo"). Both are reachable — a QR
// printed from the finder, a link someone kept — so the roster slug redirects
// rather than 404ing or, worse, serving a second thin page for a school we have
// already done the homework on. The join is `rosterId`, which is why it is on the
// kit at all.
//
// SERVER ONLY, by way of `data/roster` — see the guard at the top of that file.

export type SchoolResolution =
  /** A hand-authored kit, byte for byte what it has always been. */
  | { kind: "authored"; kit: SchoolKit }
  /** A roster row wearing a thin kit. `entry` is kept for the callers that want
   *  the raw row (the brand-scan cache keys on it; metadata reads the state). */
  | { kind: "roster"; kit: SchoolKit; entry: RosterEntry }
  /** This slug is a second name for an authored kit. Send them to the real one. */
  | { kind: "redirect"; to: string }
  | { kind: "missing" };

/** rosterId -> authored slug. Built once; `allSchoolKits()` is a module constant. */
let authoredByRosterId: Map<string, string> | null = null;

function rosterIdIndex(): Map<string, string> {
  if (!authoredByRosterId) {
    authoredByRosterId = new Map();
    for (const kit of allSchoolKits()) {
      if (kit.rosterId) authoredByRosterId.set(kit.rosterId, kit.slug);
    }
  }
  return authoredByRosterId;
}

/** The authored kit's slug for a roster row, or undefined. Three of the 27 have
 *  no roster row at all (the federal private-school extract does not list them),
 *  so this is a miss for them and they are simply unreachable by roster slug. */
export function authoredSlugForRosterId(rosterId: string): string | undefined {
  return rosterIdIndex().get(rosterId);
}

export function resolveSchoolSlug(slug: string): SchoolResolution {
  const authored = getSchoolKit(slug);
  if (authored) return { kind: "authored", kit: authored };

  const entry = rosterEntry(slug);
  if (!entry) return { kind: "missing" };

  const already = authoredSlugForRosterId(entry.id);
  if (already) return { kind: "redirect", to: already };

  return { kind: "roster", kit: thinKitFromRoster(entry), entry };
}

/**
 * The kit for a slug, or undefined — the shape `getSchoolKit` has, widened to
 * the whole country.
 *
 * Callers that can act on a redirect should use `resolveSchoolSlug` instead; this
 * is for the ones that only need something to render (the sample harness). It
 * follows the redirect rather than reporting it, so a roster slug for an authored
 * school resolves to the authored kit and never to a thin duplicate.
 */
export function resolveSchoolKit(slug: string): SchoolKit | undefined {
  const r = resolveSchoolSlug(slug);
  if (r.kind === "authored" || r.kind === "roster") return r.kit;
  if (r.kind === "redirect") return getSchoolKit(r.to);
  return undefined;
}
