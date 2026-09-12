#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// build-roster — the national school list, turned into a file the app can ship.
//
//   node scripts/build-roster.mjs <path-to-us_high_schools.json>
//
// Input is the NCES directory extract (CCD for public schools, PSS for private),
// public-domain federal data. Output is `src/data/roster/us-high-schools.json`:
// a COMPACT array-of-arrays with a header row, because 34k objects with seven
// repeated keys each is about 9 MB of the same seven words.
//
// DETERMINISTIC AND OFFLINE. No network, no clock, no randomness — run it twice
// on the same input and `git diff` is empty. That matters because the file is
// committed: a rebuild that reshuffles rows would produce a 34,000-line diff
// nobody can review.
//
// WHAT THIS SCRIPT DOES NOT DO: slugs. A school's URL identity is derived once,
// in `src/data/roster.ts`, from the row's own name/city/state. Deriving it here
// too would be the recurring defect this codebase keeps writing down — an axis
// computed on one side and written longhand on the other — so the roster file
// carries no slug column and the runtime owns the rule. `roster.test.ts` asserts
// the derived slugs are unique across the whole built file.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..", "src", "data", "roster");
const OUT_FILE = join(OUT_DIR, "us-high-schools.json");

/** The seven fields a roster row carries, in order. Mirrored by roster.ts. */
const HEADER = ["id", "name", "city", "state", "zip", "type", "population"];

/** Smallest enrolment worth a page. Below this a "high school" is usually a
 *  program of a handful of students sharing another school's building; a frame
 *  fundraiser needs a parent body. Rows with NO population are KEPT — private
 *  (PSS) entries often omit it, and absence is not smallness. */
const MIN_POPULATION = 50;

/**
 * Facilities, not schools. Every one of these serves real students, but none has
 * the thing this product is for — a school community with a spirit store, a
 * booster club and parents in the bleachers — and a license-plate frame naming a
 * juvenile detention centre is a mistake we would only find out about from the
 * person it happened to.
 */
const EXCLUDE_NAME =
  /detention|juvenile|correction|jail|prison|hospital|treatment|residential|rehab|day treatment|alternative learning ctr/i;

function main() {
  const src = process.argv[2];
  if (!src) {
    console.error("usage: node scripts/build-roster.mjs <path-to-us_high_schools.json>");
    process.exit(2);
  }

  const rows = JSON.parse(readFileSync(resolve(src), "utf8"));
  if (!Array.isArray(rows)) throw new Error(`${src} is not an array`);

  let droppedSmall = 0;
  let droppedName = 0;
  let droppedShape = 0;
  const kept = [];

  for (const r of rows) {
    // The source already title-cases names; normalising here means whitespace
    // only. Anything cleverer ("St" -> "Saint") invents a name the school does
    // not use, and the name is what a parent types into the finder.
    const name = String(r?.name ?? "").replace(/\s+/g, " ").trim();
    const city = String(r?.city ?? "").replace(/\s+/g, " ").trim();
    const state = String(r?.state ?? "").trim().toUpperCase();
    const id = String(r?.id ?? "").trim();

    if (!id || !name || !city || !state) {
      droppedShape += 1;
      continue;
    }
    if (EXCLUDE_NAME.test(name)) {
      droppedName += 1;
      continue;
    }
    const population =
      typeof r.population === "number" && Number.isFinite(r.population) ? r.population : null;
    if (population !== null && population < MIN_POPULATION) {
      droppedSmall += 1;
      continue;
    }

    kept.push([
      id,
      name,
      city,
      state,
      String(r?.zip ?? "").trim(),
      r?.type === "PRIVATE" ? "PRIVATE" : "PUBLIC",
      population,
    ]);
  }

  // Sorted by state, then city, then name, then id. Source order would be just as
  // deterministic, but this makes a rebuild's diff readable: a school that moved
  // between extracts shows up next to its neighbours instead of at a random line.
  kept.sort(
    (a, b) =>
      a[3].localeCompare(b[3]) ||
      a[2].localeCompare(b[2]) ||
      a[1].localeCompare(b[1]) ||
      a[0].localeCompare(b[0]),
  );

  // One row per line: compact enough to stay a 2–3 MB file, line-oriented enough
  // that git can diff it.
  const body = [HEADER, ...kept].map((r) => JSON.stringify(r)).join(",\n");
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, `[\n${body}\n]\n`);

  const states = new Set(kept.map((r) => r[3]));
  console.log(`rows in            ${rows.length}`);
  console.log(`  dropped, malformed ${droppedShape}`);
  console.log(`  dropped, name      ${droppedName}   (${EXCLUDE_NAME.source})`);
  console.log(`  dropped, pop < ${MIN_POPULATION}    ${droppedSmall}`);
  console.log(`rows kept          ${kept.length}   across ${states.size} states/territories`);
  console.log(`wrote              ${OUT_FILE}`);
}

main();
