#!/usr/bin/env node
// Import Becky Newman's High School Collection snappets into the repo.
//
// Her files arrive named "High School Collection <Thing> snappet.png" (a couple of
// the earlier emails say "High School artwork" in the subject but the filenames are
// consistent). The palette expects short kebab-case slugs, so this renames them and
// drops them in public/tiles/high-school/, then reports anything still missing.
//
//   node scripts/import-high-school-art.mjs ~/Downloads/becky-highschool
//
// Re-runnable: copying the same file twice is a no-op overwrite. Nothing is deleted.

import { readdirSync, copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

const DEST = "public/tiles/high-school";

/** Slug -> the distinctive words in Becky's filename (lowercased, order-free). */
const SLUGS = {
  "basketball.png": ["basketball"],
  "cross-country.png": ["cross", "country"],
  "field-hockey.png": ["field", "hockey"],
  "football.png": ["football"],
  "golf.png": ["golf"],
  "soccer-ball.png": ["soccer"],
  "tennis.png": ["tennis"],
  "volleyball.png": ["volleyball"],
  "future-christian-athletes.png": ["future", "christian", "athletes"],
  "deca.png": ["deca"],
  "fbla.png": ["fbla"],
  "honor-society.png": ["honor", "society"],
  "mu-alpha-theta.png": ["mu", "alpha", "theta"],
  "robotics-club.png": ["robotics"],
  "chess-club.png": ["chess"],
  "speech-and-debate.png": ["speech", "debate"],
  "drama-theater.png": ["drama"],
  "photography-club.png": ["photography"],
  "yearbook-club.png": ["yearbook"],
  "student-council.png": ["student", "council"],
};

const srcDir = process.argv[2];
if (!srcDir) {
  console.error("usage: node scripts/import-high-school-art.mjs <source-dir>");
  process.exit(1);
}
if (!existsSync(srcDir)) {
  console.error(`source dir not found: ${srcDir}`);
  process.exit(1);
}

mkdirSync(DEST, { recursive: true });

const sources = readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith(".png"));
const claimed = new Set();
let copied = 0;

for (const [slug, words] of Object.entries(SLUGS)) {
  // "football" must not also swallow "flag football"-style names, so prefer the
  // match that uses the most words and hasn't already been claimed by another slug.
  const match = sources
    .filter((f) => !claimed.has(f))
    .find((f) => {
      const hay = basename(f, ".png").toLowerCase();
      return words.every((w) => hay.includes(w));
    });

  if (!match) continue;
  claimed.add(match);
  copyFileSync(join(srcDir, match), join(DEST, slug));
  console.log(`  ${match}  ->  ${slug}`);
  copied++;
}

const missing = Object.keys(SLUGS).filter((s) => !existsSync(join(DEST, s)));
const unmatched = sources.filter((f) => !claimed.has(f));

console.log(`\ncopied ${copied}, present ${Object.keys(SLUGS).length - missing.length}/20`);
if (unmatched.length) console.log(`unmatched source files:\n  ${unmatched.join("\n  ")}`);
if (missing.length) {
  console.log(`still missing:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}
console.log('all 20 present — add "hs" to SCHOOL_SURFACED_SET_IDS to switch the set on.');
