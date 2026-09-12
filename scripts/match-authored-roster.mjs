#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// match-authored-roster — propose a roster row for each hand-authored kit.
//
//   node scripts/match-authored-roster.mjs
//
// The 27 authored kits predate the national roster and name their schools the
// way the schools do ("St. Louis University High School", "SLUH"); the roster
// names them the way the federal directory does ("St Louis University High
// School"). `rosterId` on a kit is what ties the two together, and it has to be
// RIGHT: a wrong id redirects some other school's page into this one.
//
// So this script PROPOSES and a human decides. It prints every kit with its best
// candidates and a confidence, and prints nothing into any source file — the
// `rosterId` lines are pasted into `data/school-kits.ts` by hand, after reading
// the candidate list. There is no "apply" mode on purpose.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const norm = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// "Saint" and "St" are the same word in a school name and the two corpora
// disagree about it constantly; so are the school-type suffixes.
const canon = (s) =>
  norm(s)
    .replace(/\bsaint\b/g, "st")
    .replace(/\b(senior|sr|junior|jr)\b/g, "")
    .replace(/\bh s\b/g, "high school")
    .replace(/\bhigh\b(?! school)/g, "high school")
    .replace(/\s+/g, " ")
    .trim();

function kitsFromSource() {
  const src = readFileSync(join(ROOT, "src/data/school-kits.ts"), "utf8");
  const out = [];
  // The catalogue is a literal array of object literals with these three fields
  // in this order on every entry; parsing it beats importing TypeScript from a
  // plain node script for a one-off review tool.
  const re =
    /slug:\s*"([^"]+)",\s*\n\s*schoolName:\s*"([^"]+)",\s*\n\s*shortName:\s*"([^"]+)",\s*\n\s*mascot:\s*"([^"]*)",\s*\n\s*city:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) {
    out.push({ slug: m[1], schoolName: m[2], shortName: m[3], mascot: m[4], city: m[5] });
  }
  return out;
}

function bigrams(s) {
  const set = new Set();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  return set;
}

/** Dice coefficient over character bigrams — forgiving about word order and
 *  abbreviation, harsh about a different school. */
function similarity(a, b) {
  const A = bigrams(a);
  const B = bigrams(b);
  let shared = 0;
  for (const g of A) if (B.has(g)) shared += 1;
  return (2 * shared) / (A.size + B.size || 1);
}

function main() {
  const rows = JSON.parse(readFileSync(join(ROOT, "src/data/roster/us-high-schools.json"), "utf8")).slice(1);
  const kits = kitsFromSource();
  console.log(`${kits.length} authored kits, ${rows.length} roster rows\n`);

  for (const kit of kits) {
    const [, stateRaw] = /,\s*([A-Za-z]{2})\s*$/.exec(kit.city) ?? [];
    const state = (stateRaw ?? "").toUpperCase();
    const kitName = canon(kit.schoolName);
    const kitCity = norm(kit.city.replace(/,\s*[A-Za-z]{2}\s*$/, ""));

    const scored = rows
      .filter((r) => r[3] === state)
      .map((r) => {
        const nameScore = similarity(kitName, canon(r[1]));
        // Same-city is a strong signal but not a requirement: several of these
        // schools sit in a suburb the directory files under a different name
        // ("Frontenac" vs "Saint Louis").
        const cityBonus = norm(r[2]) === kitCity ? 0.12 : 0;
        return { row: r, score: nameScore + cityBonus, nameScore };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const best = scored[0];
    const runnerUp = scored[1];
    const margin = best && runnerUp ? best.score - runnerUp.score : 1;
    const flag =
      !best || best.nameScore < 0.7 ? "REVIEW" : margin < 0.08 ? "CLOSE " : "ok    ";

    console.log(`${flag} ${kit.slug}`);
    console.log(`       kit: ${kit.schoolName} — ${kit.city}`);
    for (const c of scored) {
      console.log(
        `       ${c.score.toFixed(3)} ${c.row[0]}  ${c.row[1]} — ${c.row[2]}, ${c.row[3]}  (${c.row[5]}, ${c.row[6] ?? "?"})`,
      );
    }
    console.log(`       => rosterId: "${best?.row[0] ?? ""}",`);
    console.log();
  }
}

main();
