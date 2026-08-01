"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import "./find-my-school.css";

// ─── Find my school ──────────────────────────────────────────────────────────
//
// A parent arriving from a group chat knows exactly one thing: the name of their
// school. Everything the site offered them was either "paste your school's
// website" (nobody has that to hand) or a builder with no school in it at all.
// This is the one box that turns a name into their school's frame.
//
// It searches the kits we have and, when there is no match, hands off to the
// URL intake rather than dead-ending — which is the case for almost every school
// in the country and therefore the case that has to feel intentional.

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
    .replace(/[\u0300-\u036f]/g, "")
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
  const router = useRouter();

  const matches = useMemo(() => rankSchools(schools, q), [q, schools]);

  const searched = norm(q).length >= 2;

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
          if (e.key === "Enter" && matches[0]) router.push(`/s/${matches[0].slug}`);
        }}
        aria-describedby="msf-find-help"
      />

      {searched && matches.length > 0 ? (
        <ul className="msf-find-list">
          {matches.map((k) => (
            <li key={k.slug}>
              <a href={`/s/${k.slug}`}>
                <strong>{k.schoolName}</strong>
                <span>
                  {k.mascot} · {k.city}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {searched && matches.length === 0 ? (
        // The common case nationally, so it must not read as failure. The builder
        // themes itself from any school's own website, so "not listed" is a
        // different route to the same place, not a wall.
        <div className="msf-find-miss">
          <p>
            We don&apos;t have <strong>{q.trim()}</strong> pre-built yet, which is
            no problem at all.
          </p>
          <a className="msf-btn msf-btn-primary" href="/lab/school">
            Build it from your school&apos;s website
          </a>
        </div>
      ) : null}

      <p className="msf-find-help" id="msf-find-help">
        {searched
          ? "Tap your school to open its frame."
          : "Type your school's name, nickname or mascot."}
      </p>
    </div>
  );
}
