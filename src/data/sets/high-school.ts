import type { TileSet, TileSpan } from "@/lib/types";
import { TILE_BG } from "@/lib/utils/tile-theme";

// ─── High School Collection ─────────────────────────────────────────────────
//
// Becky Newman's high-school activities artwork (die-cut "snappet" stickers),
// delivered 2026-07-22. Same shape as the 4th of July set: real PNG art on a
// white background, with an emoji purely as a fallback if a file is missing.
//
// The art files live in `public/tiles/high-school/`. These pieces are NOT
// surfaced as their own set — `schoolSet` spreads them into the school palette
// (see ./school for why), so this module is the DATA and ./school is the
// presentation.
const A = "/tiles/high-school";

/** setId shorthand. */
const H = "hs";

/**
 * FIELD colours, per piece, drawn from the standard palette (see tile-theme).
 *
 * Every piece's art is now cut out to transparency, so the field really is what you
 * see behind it — which makes this a real design choice rather than a dead value.
 * Each was picked by measuring the art's mean contrast against both fields and then
 * eyeballing the result: white-on-navy logos (DECA, Student Council, FCA) and
 * light/high-key art (volleyball, soccer) sit on NAVY; dark line art and dark type
 * sit on WHITE.
 */
const WHITE = TILE_BG.white;
const NAVY = TILE_BG.navy;

/**
 * Preferred footprint for this collection. Every piece is square (2000x2000
 * sources), and at a single 0.991" cell the art — especially the lockups with
 * text — is too small to read, so a 2x2 is the size these are meant to be seen at.
 *
 * This is a PREFERENCE, not a requirement: a palette drag resolves through
 * `spanLadder`, so dropping one where 2x2 cannot seat (the one-row top/bottom
 * banners) seats the largest that does — 2x1 there — instead of refusing. Because
 * they still read fine at 1x1, they stay in the Fill All / Random pool as well.
 */
const PREFERRED: TileSpan = { cols: 2, rows: 2 };

/**
 * The exact PNG filenames this set expects in `public/tiles/high-school/`.
 * Becky's originals arrive named "High School Collection <Thing> snappet.png";
 * `scripts/import-high-school-art.mjs` renames them to these slugs.
 */
export const ART_MANIFEST: readonly string[] = [
  "basketball.png",
  "cross-country.png",
  "field-hockey.png",
  "football.png",
  "golf.png",
  "soccer-ball.png",
  "tennis.png",
  "volleyball.png",
  "future-christian-athletes.png",
  "deca.png",
  "fbla.png",
  "honor-society.png",
  "mu-alpha-theta.png",
  "robotics-club.png",
  "chess-club.png",
  "speech-and-debate.png",
  "drama-theater.png",
  "photography-club.png",
  "yearbook-club.png",
  "student-council.png",
];

export const highSchoolSet: TileSet = {
  id: H,
  name: "High School",
  icon: "🏫",
  description:
    "Becky Newman's high-school collection — team sports, academic clubs, and activities.",
  price: 0,
  // Ordered so related activities sit together in one flat palette:
  // athletics → academic/competition clubs → arts & media → student government.
  pieces: [
    // ─── Athletics ─────────────────────────────────────────────
    {
      id: `${H}:basketball`,
      setId: H,
      name: "Basketball",
      artworkUrl: `${A}/basketball.png`,
      emoji: "🏀",
      backgroundColor: WHITE,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:cross-country`,
      setId: H,
      name: "Cross Country",
      artworkUrl: `${A}/cross-country.png`,
      emoji: "🏃",
      backgroundColor: WHITE,
      defaultSpan: PREFERRED,
    },
    // Field Hockey is the one piece whose PNG has not arrived yet. Its entry stays
    // commented out (rather than pointing at a missing file) so the palette never
    // renders a broken tile — drop the art in and uncomment to complete the set.
    // {
    //   id: `${H}:field-hockey`,
    //   setId: H,
    //   name: "Field Hockey",
    //   artworkUrl: `${A}/field-hockey.png`,
    //   emoji: "🏑",
    //   backgroundColor: WHITE,
    // },
    {
      id: `${H}:football`,
      setId: H,
      name: "Football",
      artworkUrl: `${A}/football.png`,
      emoji: "🏈",
      backgroundColor: WHITE,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:golf`,
      setId: H,
      name: "Golf",
      artworkUrl: `${A}/golf.png`,
      emoji: "⛳",
      backgroundColor: WHITE,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:soccer-ball`,
      setId: H,
      name: "Soccer Ball",
      artworkUrl: `${A}/soccer-ball.png`,
      emoji: "⚽",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:tennis`,
      setId: H,
      name: "Tennis",
      artworkUrl: `${A}/tennis.png`,
      emoji: "🎾",
      backgroundColor: WHITE,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:volleyball`,
      setId: H,
      name: "Volleyball",
      artworkUrl: `${A}/volleyball.png`,
      emoji: "🏐",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:future-christian-athletes`,
      setId: H,
      name: "Future Christian Athletes",
      artworkUrl: `${A}/future-christian-athletes.png`,
      emoji: "✝️",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },

    // ─── Academic & competition clubs ──────────────────────────
    {
      id: `${H}:deca`,
      setId: H,
      name: "DECA",
      artworkUrl: `${A}/deca.png`,
      emoji: "📈",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:fbla`,
      setId: H,
      name: "FBLA",
      artworkUrl: `${A}/fbla.png`,
      emoji: "💼",
      backgroundColor: WHITE,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:honor-society`,
      setId: H,
      name: "Honor Society",
      artworkUrl: `${A}/honor-society.png`,
      emoji: "🎓",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:mu-alpha-theta`,
      setId: H,
      name: "Mu Alpha Theta",
      artworkUrl: `${A}/mu-alpha-theta.png`,
      emoji: "📐",
      backgroundColor: WHITE,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:robotics-club`,
      setId: H,
      name: "Robotics Club",
      artworkUrl: `${A}/robotics-club.png`,
      emoji: "🤖",
      backgroundColor: WHITE,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:chess-club`,
      setId: H,
      name: "Chess Club",
      artworkUrl: `${A}/chess-club.png`,
      emoji: "♟️",
      backgroundColor: WHITE,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:speech-and-debate`,
      setId: H,
      name: "Speech and Debate",
      artworkUrl: `${A}/speech-and-debate.png`,
      emoji: "🗣️",
      backgroundColor: WHITE,
      defaultSpan: PREFERRED,
    },

    // ─── Arts & media ──────────────────────────────────────────
    {
      id: `${H}:drama-theater`,
      setId: H,
      name: "Drama & Theater",
      artworkUrl: `${A}/drama-theater.png`,
      emoji: "🎭",
      backgroundColor: WHITE,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:photography-club`,
      setId: H,
      name: "Photography Club",
      artworkUrl: `${A}/photography-club.png`,
      emoji: "📷",
      backgroundColor: WHITE,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:yearbook-club`,
      setId: H,
      name: "Yearbook Club",
      artworkUrl: `${A}/yearbook-club.png`,
      emoji: "📖",
      backgroundColor: WHITE,
      defaultSpan: PREFERRED,
    },

    // ─── Student government ────────────────────────────────────
    {
      id: `${H}:student-council`,
      setId: H,
      name: "Student Council",
      artworkUrl: `${A}/student-council.png`,
      emoji: "🗳️",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
  ],
  // No starter layouts yet — the collection is a palette of activities that each
  // school picks from, so presets would be guesses. Same as the July 4th set.
  presets: [],
};
