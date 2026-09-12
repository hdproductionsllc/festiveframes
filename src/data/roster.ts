import { readFileSync } from "node:fs";
import { join } from "node:path";

// ─── The national roster ─────────────────────────────────────────────────────
//
// 29,467 US high schools, from the NCES CCD (public) and PSS (private)
// directories. This is DATA, not kits: a row carries a name, a city and an
// enrolment, and nothing about how a frame looks. `data/thin-kit.ts` turns a row
// into a `SchoolKit` at request time; the 27 hand-authored kits in
// `data/school-kits.ts` are unchanged and still win (see `data/school-resolve.ts`).
//
// SERVER ONLY. The file is 2.4 MB — roughly forty times the JavaScript the
// builder page ships — and a client bundle that pulled it in would be a product
// defect nobody would notice until a phone on stadium wifi tried to load it.
// `import "server-only"` is the idiomatic guard and this file would use it, but
// the package is not installed and adding a dependency for one import is not
// worth it; the throw below is the same protection in one line.
//
// LAZY, ONCE PER PROCESS. The rows are read and indexed on the first call that
// needs them and held for the life of the process. Reading a source-tree file at
// runtime through `process.cwd()` is the pattern this app already deploys with —
// `/s/[slug]/opengraph-image.tsx` reads its font the same way.
//
// SLUGS ARE DERIVED HERE AND NOWHERE ELSE. The built file carries no slug column;
// `rosterSlug` below is the only implementation of the rule, so the build script
// and the runtime cannot drift apart. `roster.test.ts` asserts the result is
// unique across all 29,467 rows.

if (typeof window !== "undefined") {
  throw new Error(
    "data/roster is server-only: 2.4 MB of school rows must never reach a browser bundle.",
  );
}

export interface RosterEntry {
  /** The NCES/PSS id. Stable across rebuilds — this is what an authored kit
   *  pins itself to with `rosterId`, not the name or the slug. */
  id: string;
  /** URL identity: /s/<slug>. Derived, not stored. */
  slug: string;
  name: string;
  city: string;
  /** Two-letter postal code, uppercase. Territories (PR, VI, MP) appear here. */
  state: string;
  zip: string;
  type: "PUBLIC" | "PRIVATE";
  /** Enrolment, or null when the directory did not report one. */
  population: number | null;
}

/** One row of the built file, in header order. */
type Row = [string, string, string, string, string, "PUBLIC" | "PRIVATE", number | null];

const ROSTER_FILE = join(process.cwd(), "src", "data", "roster", "us-high-schools.json");

/** Fold accents and punctuation the way the client-side finder does, so
 *  "St. Louis U. High" and "st louis u high" are the same query. */
export function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** A row's URL identity, BEFORE collision handling. Name + city + state,
 *  because school names repeat freely across the country — there are eleven
 *  Lincoln High Schools and the slug has to tell them apart. */
export function rosterSlug(name: string, city: string, state: string): string {
  return normalise(`${name} ${city} ${state}`).replace(/ /g, "-");
}

// ── The index ────────────────────────────────────────────────────────────────
//
// Built once. `searchRoster` is typed into on every keystroke by every visitor,
// so it may not walk 29,467 rows: the inverted index below turns a query into a
// few hundred candidates before any scoring happens.

interface RosterIndex {
  rows: Row[];
  slugs: string[];
  bySlug: Map<string, number>;
  byId: Map<string, number>;
  /** Normalised name and city per row, so scoring never re-normalises. */
  normName: string[];
  normCity: string[];
  /** Every distinct token in any name or city, sorted — a prefix query is a
   *  binary search plus a scan. */
  tokens: string[];
  /** Row numbers carrying `tokens[i]`, ascending. */
  postings: number[][];
}

/**
 * A one-character query expands to thousands of tokens, and a parent holding a
 * phone gets no better answer for the extra work. The finder asks for two
 * characters before it searches at all; these are the belt to that's braces.
 */
const MAX_EXPANDED_TOKENS = 600;
const MAX_CANDIDATES = 20_000;

function buildIndex(rows: Row[]): RosterIndex {
  const slugs: string[] = [];
  const bySlug = new Map<string, number>();
  const byId = new Map<string, number>();
  const normName: string[] = [];
  const normCity: string[] = [];
  const postingsByToken = new Map<string, number[]>();

  for (let i = 0; i < rows.length; i++) {
    const [id, name, city, state] = rows[i];

    // Collisions are real: two "Central High School" rows in the same city of the
    // same state exist (a campus split across two NCES records). The suffix is
    // assigned in file order, and the file order is fixed by the build script, so
    // a slug is stable as long as the row above it is.
    const base = rosterSlug(name, city, state);
    let slug = base;
    for (let n = 2; bySlug.has(slug); n++) slug = `${base}-${n}`;
    slugs.push(slug);
    bySlug.set(slug, i);
    byId.set(id, i);

    const nn = normalise(name);
    const nc = normalise(city);
    normName.push(nn);
    normCity.push(nc);

    // ONE index over both fields. Scoring still distinguishes them (a hit in the
    // name outranks a hit in the city); the index only has to narrow.
    for (const token of new Set([...nn.split(" "), ...nc.split(" ")])) {
      if (!token) continue;
      const list = postingsByToken.get(token);
      if (list) list.push(i);
      else postingsByToken.set(token, [i]);
    }
  }

  const tokens = [...postingsByToken.keys()].sort();
  return {
    rows,
    slugs,
    bySlug,
    byId,
    normName,
    normCity,
    tokens,
    postings: tokens.map((t) => postingsByToken.get(t)!),
  };
}

/** First index in `tokens` at or after `prefix`. */
function lowerBound(tokens: string[], prefix: string): number {
  let lo = 0;
  let hi = tokens.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tokens[mid] < prefix) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Is `token` a whole-word prefix inside the normalised string `hay`?
 *
 * `spaced` is " " + token, precomputed by the caller: it is what stops "ville"
 * from matching "Albertville", and building it per row per token is a million
 * string allocations on a wide query.
 */
function hasWordPrefix(hay: string, token: string, spaced: string): boolean {
  return hay.startsWith(token) || hay.includes(spaced);
}

function entryAt(index: RosterIndex, i: number): RosterEntry {
  const [id, name, city, state, zip, type, population] = index.rows[i];
  return { id, slug: index.slugs[i], name, city, state, zip, type, population };
}

/**
 * Ranked matches for a query.
 *
 * Three tiers, because WHERE a query hits says more than whether it does. A
 * parent typing "albertville" wants Albertville High School, not the four
 * schools in the city of Albertville — so a name that STARTS with what they
 * typed beats a name that merely contains it, which beats a city match. Ties go
 * to the bigger school: with names repeating nationally, the larger enrolment is
 * the one more people are looking for.
 */
export function searchIndex(index: RosterIndex, q: string, limit = 10): RosterEntry[] {
  const nq = normalise(q);
  if (nq.length < 2) return [];
  const qTokens = nq.split(" ").filter(Boolean);
  if (!qTokens.length) return [];
  const spaced = qTokens.map((t) => ` ${t}`);

  // Narrow on the MOST SELECTIVE token. "lincoln high school" should be answered
  // from the ~200 rows containing "lincoln", not the ~20,000 containing "high" —
  // and which token that is depends on the query, not on its position.
  let best: { tokenIndex: number; cost: number } | null = null;
  for (let t = 0; t < qTokens.length; t++) {
    const start = lowerBound(index.tokens, qTokens[t]);
    let cost = 0;
    let seen = 0;
    for (let i = start; i < index.tokens.length && seen < MAX_EXPANDED_TOKENS; i++, seen++) {
      if (!index.tokens[i].startsWith(qTokens[t])) break;
      cost += index.postings[i].length;
    }
    if (seen === 0) return []; // a token nothing starts with: no row can match all
    if (!best || cost < best.cost) best = { tokenIndex: t, cost };
  }

  const prefix = qTokens[best!.tokenIndex];
  const from = lowerBound(index.tokens, prefix);
  const candidates = new Set<number>();
  outer: for (let i = from, seen = 0; i < index.tokens.length && seen < MAX_EXPANDED_TOKENS; i++, seen++) {
    if (!index.tokens[i].startsWith(prefix)) break;
    for (const row of index.postings[i]) {
      candidates.add(row);
      if (candidates.size >= MAX_CANDIDATES) break outer;
    }
  }

  // Top-K by insertion rather than a sort of the whole candidate set: with limit
  // at 10 this is one pass, and the candidate set can be twenty thousand rows.
  const top: { i: number; score: number }[] = [];
  for (const i of candidates) {
    const name = index.normName[i];
    let score = 0;
    if (name.startsWith(nq)) score = 300;
    else if (qTokens.every((t, n) => hasWordPrefix(name, t, spaced[n]))) score = 200;
    else {
      const city = index.normCity[i];
      if (
        qTokens.every(
          (t, n) => hasWordPrefix(name, t, spaced[n]) || hasWordPrefix(city, t, spaced[n]),
        )
      )
        score = 100;
    }
    if (!score) continue;

    if (top.length === limit && !better(index, i, score, top[top.length - 1])) continue;
    let at = top.length;
    while (at > 0 && better(index, i, score, top[at - 1])) at--;
    top.splice(at, 0, { i, score });
    if (top.length > limit) top.pop();
  }
  return top.map((t) => entryAt(index, t.i));
}

/** Strict ordering: score, then enrolment, then name — so the result is stable
 *  whatever order the candidate Set happened to iterate in. */
function better(
  index: RosterIndex,
  i: number,
  score: number,
  against: { i: number; score: number },
): boolean {
  if (score !== against.score) return score > against.score;
  const a = index.rows[i][6] ?? 0;
  const b = index.rows[against.i][6] ?? 0;
  if (a !== b) return a > b;
  return index.rows[i][1].localeCompare(index.rows[against.i][1]) < 0;
}

// ── The process-wide singleton ───────────────────────────────────────────────

let cached: RosterIndex | null = null;

function index(): RosterIndex {
  if (!cached) {
    const parsed = JSON.parse(readFileSync(ROSTER_FILE, "utf8")) as unknown[][];
    // Row 0 is the header. It is in the file so a human opening it can read the
    // columns; dropping it here is the only place that has to know.
    cached = buildIndex(parsed.slice(1) as Row[]);
  }
  return cached;
}

export function rosterEntry(slug: string): RosterEntry | undefined {
  const i = index().bySlug.get(slug);
  return i === undefined ? undefined : entryAt(index(), i);
}

export function rosterEntryById(id: string): RosterEntry | undefined {
  const i = index().byId.get(id);
  return i === undefined ? undefined : entryAt(index(), i);
}

export function searchRoster(q: string, limit = 10): RosterEntry[] {
  return searchIndex(index(), q, limit);
}

/** Row count, for the README's claim and for tests that want to know the file
 *  actually loaded rather than silently coming back empty. */
export function rosterSize(): number {
  return index().rows.length;
}

/** Test seam: build an index over a handful of rows, without the 2.4 MB file. */
export const __buildIndexForTest = buildIndex;

/**
 * Test seam: every entry in the built file, in file order.
 *
 * Not exported for the product — nothing in it wants 29,467 rows at once, which
 * is the whole reason the index exists. The invariants worth asserting (unique
 * slugs, seven fields per row) are properties of the WHOLE file and a sample
 * would miss the single colliding pair that breaks one school's page.
 */
export function __allEntriesForTest(): RosterEntry[] {
  const idx = index();
  return idx.rows.map((_, i) => entryAt(idx, i));
}

export type { Row as RosterRow };
