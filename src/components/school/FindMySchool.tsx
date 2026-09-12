"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import "./find-my-school.css";
import { RequestSchoolForm } from "./RequestSchoolForm";

// ─── Find my school ──────────────────────────────────────────────────────────
//
// A parent arriving from a group chat knows exactly one thing: the name of their
// school. Everything the site offered them was either "paste your school's
// website" (nobody has that to hand) or a builder with no school in it at all.
// This is the one box that turns a name into their school's frame.
//
// IT IS NATIONAL NOW, and it answers from two places on purpose:
//
//   THE 27 AUTHORED KITS are ranked in the browser, off an array this component
//   is handed. No request, no wait — and they are the schools where we have done
//   real work, so they belong at the top of the list the instant a letter lands.
//
//   THE OTHER 29,440 come from /api/school/find, debounced. The roster is 2.4 MB
//   and cannot ship to a phone; the server holds the index.
//
// Merged authored-first and deduped by slug. The route already drops roster rows
// belonging to an authored kit, so a school cannot appear twice under two names.
//
// City and state are on every row because names repeat nationally — there are
// eleven Lincoln High Schools and the name alone does not pick one.

export interface SchoolChoice {
  slug: string;
  schoolName: string;
  shortName: string;
  mascot: string;
  city: string;
}

/** Fold accents and punctuation so "St. Louis U. High" matches "st louis u high". */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Rank by WHERE the query hits, not just whether it does. A parent typing "sluh"
 * wants SLUH first, not a school in a city called Sluhville; a prefix hit on the
 * name beats a hit buried in the city.
 */
export function score(kit: SchoolChoice, q: string): number {
  const fields: Array<[string, number]> = [
    [norm(kit.shortName), 100],
    [norm(kit.schoolName), 90],
    [norm(kit.slug.replace(/-/g, " ")), 80],
    [norm(kit.mascot), 50],
    [norm(kit.city), 30],
  ];
  let best = 0;
  for (const [value, weight] of fields) {
    if (!value) continue;
    if (value === q) best = Math.max(best, weight + 50);
    else if (value.startsWith(q)) best = Math.max(best, weight + 25);
    else if (value.includes(q)) best = Math.max(best, weight);
    else {
      // Word-initial match, so "jr bills" finds "Jr. Billikens" and "kirk" finds
      // "Kirkwood" even when the query lands mid-phrase.
      const words = value.split(" ");
      if (words.some((w) => w.startsWith(q))) best = Math.max(best, weight - 10);
    }
  }
  return best;
}

/** The ranked hits for a query. Exported so the test exercises what ships. */
export function rankSchools(schools: SchoolChoice[], query: string, limit = 6): SchoolChoice[] {
  const n = norm(query);
  if (n.length < 2) return [];
  return schools
    .map((k) => ({ kit: k, s: score(k, n) }))
    .filter((m) => m.s > 0)
    .sort((a, b) => b.s - a.s || a.kit.schoolName.localeCompare(b.kit.schoolName))
    .slice(0, limit)
    .map((m) => m.kit);
}

/** One row of the national index, as /api/school/find returns it. */
interface RosterHit {
  slug: string;
  name: string;
  city: string;
  state: string;
  type: "PUBLIC" | "PRIVATE";
}

/** What a row renders as, whichever half of the search it came from. */
interface Row {
  slug: string;
  title: string;
  /** The line under the name: mascot and city for an authored kit, city and
   *  state for a roster school. */
  detail: string;
}

/** The finder shows at most this many rows. Authored kits take the first places
 *  they earn; the roster fills what is left. */
const TOTAL = 8;
/** Long enough that a phone keyboard's per-letter burst collapses into one
 *  request, short enough that the list feels like it is keeping up. */
const DEBOUNCE_MS = 150;

export function FindMySchool({
  schools,
  autoFocus = false,
  placeholder = "Start typing your school…",
  /** "dark" for a navy ground, "light" for paper. Only affects the labels — the
   *  input and results are a white card either way so the field always reads as
   *  somewhere to type. */
  tone = "light",
}: {
  schools: SchoolChoice[];
  autoFocus?: boolean;
  placeholder?: string;
  tone?: "light" | "dark";
}) {
  const [q, setQ] = useState("");
  const [roster, setRoster] = useState<{ q: string; hits: RosterHit[] }>({ q: "", hits: [] });
  const router = useRouter();

  const authored = useMemo(() => rankSchools(schools, q), [q, schools]);
  const searched = norm(q).length >= 2;
  const trimmed = q.trim();

  // ── The national half ──
  //
  // Debounced, and every in-flight request is abandoned when the query moves on:
  // without the abort, a slow answer for "lin" can land after a fast one for
  // "lincoln west" and replace the right list with a stale one.
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    // No clearing branch on purpose: a stale list is never MERGED, because every
    // merge below is gated on `roster.q === trimmed`. Clearing it here would be a
    // setState in an effect body for an effect nobody can see.
    if (!searched) return;
    const timer = setTimeout(() => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      fetch(`/api/school/find?q=${encodeURIComponent(trimmed)}`, { signal: ctrl.signal })
        .then((r) => r.json() as Promise<{ results?: RosterHit[] }>)
        .then((d) => setRoster({ q: trimmed, hits: d.results ?? [] }))
        // An aborted or failed request is not an empty result: leaving the last
        // list up beats flashing "we don't have your school" at somebody whose
        // wifi dropped for a second.
        .catch(() => {});
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed, searched]);

  const rows: Row[] = useMemo(() => {
    const out: Row[] = authored.map((k) => ({
      slug: k.slug,
      title: k.schoolName,
      detail: [k.mascot, k.city].filter(Boolean).join(" · "),
    }));
    const seen = new Set(out.map((r) => r.slug));
    // Only merge answers for the query on screen. A stale list under a newer
    // query is the same defect as a stale list replacing a newer one.
    if (roster.q === trimmed) {
      for (const hit of roster.hits) {
        if (out.length >= TOTAL || seen.has(hit.slug)) continue;
        seen.add(hit.slug);
        out.push({ slug: hit.slug, title: hit.name, detail: `${hit.city}, ${hit.state}` });
      }
    }
    return out.slice(0, TOTAL);
  }, [authored, roster, trimmed]);

  // The capture only appears once the national search has ANSWERED this query
  // with nothing. Showing it while the request is in flight tells a parent their
  // school is missing a quarter-second before it appears.
  const answered = roster.q === trimmed;
  const miss = searched && trimmed.length >= 3 && answered && rows.length === 0;

  return (
    <div className="msf-find" data-tone={tone}>
      <label className="msf-find-label" htmlFor="msf-find-input">
        Find your school
      </label>
      <input
        id="msf-find-input"
        className="msf-find-input"
        type="search"
        value={q}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          // Enter takes the top hit. On a phone this is the whole interaction.
          if (e.key === "Enter" && rows[0]) router.push(`/s/${rows[0].slug}`);
        }}
        aria-describedby="msf-find-help"
      />

      {searched && rows.length > 0 ? (
        <ul className="msf-find-list">
          {rows.map((r) => (
            <li key={r.slug}>
              <a href={`/s/${r.slug}`}>
                <strong>{r.title}</strong>
                <span>{r.detail}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {miss ? (
        // Rare now — the roster is every school the federal directories list — so
        // this is a genuine gap rather than the ordinary case, and the right
        // answer is to capture it rather than to send them somewhere else.
        <div className="msf-find-miss">
          <p>
            We don&apos;t have <strong>{trimmed}</strong> yet — and if it is a real
            school, that is a gap on our side.
          </p>
          <RequestSchoolForm schoolName={trimmed} tone={tone} />
        </div>
      ) : null}

      <p className="msf-find-help" id="msf-find-help">
        {!searched
          ? "Type your school's name, nickname or mascot."
          : rows.length > 0
            ? "Tap your school to open its frame."
            // On a miss the panel above already says what to do, so this must not
            // contradict it by telling them to tap a school that is not there.
            : answered
              ? "Nothing matched that name."
              : "Searching…"}
      </p>
    </div>
  );
}
