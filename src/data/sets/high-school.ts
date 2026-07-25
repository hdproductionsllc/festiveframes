import type { TileSet } from "@/lib/types";

// ─── High School Collection ─────────────────────────────────────────────────
//
// Becky Newman's high-school activities artwork (die-cut "snappet" stickers),
// delivered 2026-07-22. Same shape as the 4th of July set: real PNG art on a
// white background, with an emoji purely as a fallback if a file is missing.
//
// The art files live in `public/tiles/high-school/`. Until every PNG in
// ART_MANIFEST (see below) is present, this set stays OUT of
// SCHOOL_SURFACED_SET_IDS so the palette never shows broken images — it is
// registered and getSet-able, exactly like the seasonal sets that wait on an
// artist. Flipping it on is a one-line change in ./index.ts.
const A = "/tiles/high-school";

/** setId shorthand. */
const H = "hs";

/** Die-cut snappets read as art-on-white, matching the July 4th collection. */
const WHITE = "#FFFFFF";

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
    },
    {
      id: `${H}:cross-country`,
      setId: H,
      name: "Cross Country",
      artworkUrl: `${A}/cross-country.png`,
      emoji: "🏃",
      backgroundColor: WHITE,
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
    },
    {
      id: `${H}:golf`,
      setId: H,
      name: "Golf",
      artworkUrl: `${A}/golf.png`,
      emoji: "⛳",
      backgroundColor: WHITE,
    },
    {
      id: `${H}:soccer-ball`,
      setId: H,
      name: "Soccer Ball",
      artworkUrl: `${A}/soccer-ball.png`,
      emoji: "⚽",
      backgroundColor: WHITE,
    },
    {
      id: `${H}:tennis`,
      setId: H,
      name: "Tennis",
      artworkUrl: `${A}/tennis.png`,
      emoji: "🎾",
      backgroundColor: WHITE,
    },
    {
      id: `${H}:volleyball`,
      setId: H,
      name: "Volleyball",
      artworkUrl: `${A}/volleyball.png`,
      emoji: "🏐",
      backgroundColor: WHITE,
    },
    {
      id: `${H}:future-christian-athletes`,
      setId: H,
      name: "Future Christian Athletes",
      artworkUrl: `${A}/future-christian-athletes.png`,
      emoji: "✝️",
      backgroundColor: WHITE,
    },

    // ─── Academic & competition clubs ──────────────────────────
    {
      id: `${H}:deca`,
      setId: H,
      name: "DECA",
      artworkUrl: `${A}/deca.png`,
      emoji: "📈",
      backgroundColor: WHITE,
    },
    {
      id: `${H}:fbla`,
      setId: H,
      name: "FBLA",
      artworkUrl: `${A}/fbla.png`,
      emoji: "💼",
      backgroundColor: WHITE,
    },
    {
      id: `${H}:honor-society`,
      setId: H,
      name: "Honor Society",
      artworkUrl: `${A}/honor-society.png`,
      emoji: "🎓",
      backgroundColor: WHITE,
    },
    {
      id: `${H}:mu-alpha-theta`,
      setId: H,
      name: "Mu Alpha Theta",
      artworkUrl: `${A}/mu-alpha-theta.png`,
      emoji: "📐",
      backgroundColor: WHITE,
    },
    {
      id: `${H}:robotics-club`,
      setId: H,
      name: "Robotics Club",
      artworkUrl: `${A}/robotics-club.png`,
      emoji: "🤖",
      backgroundColor: WHITE,
    },
    {
      id: `${H}:chess-club`,
      setId: H,
      name: "Chess Club",
      artworkUrl: `${A}/chess-club.png`,
      emoji: "♟️",
      backgroundColor: WHITE,
    },
    {
      id: `${H}:speech-and-debate`,
      setId: H,
      name: "Speech and Debate",
      artworkUrl: `${A}/speech-and-debate.png`,
      emoji: "🗣️",
      backgroundColor: WHITE,
    },

    // ─── Arts & media ──────────────────────────────────────────
    {
      id: `${H}:drama-theater`,
      setId: H,
      name: "Drama & Theater",
      artworkUrl: `${A}/drama-theater.png`,
      emoji: "🎭",
      backgroundColor: WHITE,
    },
    {
      id: `${H}:photography-club`,
      setId: H,
      name: "Photography Club",
      artworkUrl: `${A}/photography-club.png`,
      emoji: "📷",
      backgroundColor: WHITE,
    },
    {
      id: `${H}:yearbook-club`,
      setId: H,
      name: "Yearbook Club",
      artworkUrl: `${A}/yearbook-club.png`,
      emoji: "📖",
      backgroundColor: WHITE,
    },

    // ─── Student government ────────────────────────────────────
    {
      id: `${H}:student-council`,
      setId: H,
      name: "Student Council",
      artworkUrl: `${A}/student-council.png`,
      emoji: "🗳️",
      backgroundColor: WHITE,
    },
  ],
  // No starter layouts yet — the collection is a palette of activities that each
  // school picks from, so presets would be guesses. Same as the July 4th set.
  presets: [],
};
