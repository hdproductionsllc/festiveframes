import type { TileSet, TileSpan } from "@/lib/types";
import { TILE_BG } from "@/lib/utils/tile-theme";

// ─── High School Collection ─────────────────────────────────────────────────
//
// Embroidered-patch artwork for high-school activities, produced in house:
// Ideogram prompt library -> chroma-plane background keyer -> print-quality
// intake gate. Real PNG art with an emoji purely as a fallback if a file is
// missing.
//
// The collection began as flat die-cut "snappet" stickers from an outside
// illustrator. Those are GONE — every flat original has been withdrawn, and the
// last six (club logos: DECA, FBLA, NHS, Mu Alpha Theta, Future Christian
// Athletes, Student Council) went with them. Two independent reasons not to
// bring them back: they no longer match the embroidered look that is now the
// product, and each was a third party organisation's registered mark, which is
// not ours to print on a part we sell.
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
 * The scheme is NAVY-DOMINANT, matching the product mock: full-colour objects (the
 * balls, the racket, the masks) and white-on-colour logos all sit on navy, where
 * they read as premium enamel badges. WHITE is reserved for art that is itself dark
 * or navy line work — a black chess knight or navy type would simply disappear on a
 * navy field.
 *
 * An earlier pass chose these by pure luminance contrast and came out white-heavy.
 * That metric maximises raw light/dark distance, which pushes mid-tone colour art
 * onto white; but a brown football on navy reads better than the same football on
 * white, exactly as the mock shows. Contrast was the wrong objective — the right one
 * is 'does the art still read', and beyond that it is a look, not a measurement.
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
/** Portrait pieces — a torch, a bat, a rolled diploma — are drawn 1:2. The renderer
 *  fits art with `objectFit: contain`, so a square footprint would letterbox them
 *  and waste half the tile. */
const TALL: TileSpan = { cols: 1, rows: 2 };

const PREFERRED: TileSpan = { cols: 2, rows: 2 };

export const highSchoolSet: TileSet = {
  id: H,
  name: "High School",
  icon: "🏫",
  description:
    "Embroidered high-school patches — team sports, academic clubs, and activities.",
  price: 0,
  // Ordered so related activities sit together in one flat palette.
  pieces: [
    // ─── THE ENAMEL LIBRARY ────────────────────────────────────────────────
    // One make, end to end. The embroidered patches this replaces were withdrawn
    // wholesale rather than mixed in: at the size a badge is actually seen — about
    // an inch, on a car — thread texture blurs and every patch reads as the same
    // brown or grey mass, while a die-struck pin holds its shape because the
    // polished metal border gives it a hard, high-contrast edge. A palette showing
    // both makes reads as two different products, which is the one thing a parent
    // scrolling it must not see.
    //
    // Generated with per-subject GEOMETRY specified, not just material. That is the
    // difference between a badge and a plausible-looking wrong one: the first
    // basketball came back with beach-ball seams and the first soccer ball with
    // invented panels, and both were fixed by stating what the object actually is
    // (a truncated icosahedron; one vertical seam, one horizontal, two curved side
    // seams). See tasks/enamel-pin-ideogram-prompts.md.
    //
    // Cut by scripts/cut-enamel-pins.mjs: global chroma key, hard unspill clamp,
    // 3px matte erode, trimmed to content and left at its OWN aspect so `contain`
    // fits the artwork rather than a square of padding around it.
    //
    // IDs are unchanged wherever one existed, so saved designs keep resolving.

    // ── Athletics ──
    {
      id: `${H}:soccer-patch`,
      setId: H,
      name: "Soccer",
      artworkUrl: `${A}/soccer.png`,
      emoji: "⚽",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:football-patch`,
      setId: H,
      name: "Football",
      artworkUrl: `${A}/football.png`,
      emoji: "🏈",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:basketball-patch`,
      setId: H,
      name: "Basketball",
      artworkUrl: `${A}/basketball.png`,
      emoji: "🏀",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:volleyball-patch`,
      setId: H,
      name: "Volleyball",
      artworkUrl: `${A}/volleyball.png`,
      emoji: "🏐",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:baseball-patch`,
      setId: H,
      name: "Baseball",
      artworkUrl: `${A}/baseball.png`,
      emoji: "⚾",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:softball-patch`,
      setId: H,
      name: "Softball",
      artworkUrl: `${A}/softball.png`,
      emoji: "🥎",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:track`,
      setId: H,
      name: "Track",
      artworkUrl: `${A}/track.png`,
      emoji: "🏃",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:cross-country`,
      setId: H,
      name: "Cross Country",
      artworkUrl: `${A}/cross-country.png`,
      emoji: "🌲",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:tennis`,
      setId: H,
      name: "Tennis",
      artworkUrl: `${A}/tennis.png`,
      emoji: "🎾",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:golf`,
      setId: H,
      name: "Golf",
      artworkUrl: `${A}/golf.png`,
      emoji: "⛳",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:swim-dive`,
      setId: H,
      name: "Swim & Dive",
      artworkUrl: `${A}/swim-dive.png`,
      emoji: "🏊",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:water-polo`,
      setId: H,
      name: "Water Polo",
      artworkUrl: `${A}/water-polo.png`,
      emoji: "🤽",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:racquetball`,
      setId: H,
      name: "Racquetball",
      artworkUrl: `${A}/racquetball.png`,
      emoji: "🎾",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:rugby`,
      setId: H,
      name: "Rugby",
      artworkUrl: `${A}/rugby.png`,
      emoji: "🏉",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:lacrosse`,
      setId: H,
      name: "Lacrosse",
      artworkUrl: `${A}/lacrosse.png`,
      emoji: "🥍",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:ice-hockey`,
      setId: H,
      name: "Ice Hockey",
      artworkUrl: `${A}/ice-hockey.png`,
      emoji: "🏒",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:field-hockey`,
      setId: H,
      name: "Field Hockey",
      artworkUrl: `${A}/field-hockey.png`,
      emoji: "🏑",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:wrestling`,
      setId: H,
      name: "Wrestling",
      artworkUrl: `${A}/wrestling.png`,
      emoji: "🤼",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:gymnastics`,
      setId: H,
      name: "Gymnastics",
      artworkUrl: `${A}/gymnastics.png`,
      emoji: "🤸",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:bowling`,
      setId: H,
      name: "Bowling",
      artworkUrl: `${A}/bowling.png`,
      emoji: "🎳",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:cheer`,
      setId: H,
      name: "Cheer",
      artworkUrl: `${A}/cheer.png`,
      emoji: "📣",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:dance`,
      setId: H,
      name: "Dance",
      artworkUrl: `${A}/dance.png`,
      emoji: "🩰",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:esports`,
      setId: H,
      name: "Esports",
      artworkUrl: `${A}/esports.png`,
      emoji: "🎮",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },

    // ── Music, arts & media ──
    {
      id: `${H}:band`,
      setId: H,
      name: "Band",
      artworkUrl: `${A}/band.png`,
      emoji: "🎺",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:marching-band`,
      setId: H,
      name: "Marching Band",
      artworkUrl: `${A}/marching-band.png`,
      emoji: "🎼",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:orchestra`,
      setId: H,
      name: "Orchestra",
      artworkUrl: `${A}/orchestra.png`,
      emoji: "🎻",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:choir`,
      setId: H,
      name: "Choir",
      artworkUrl: `${A}/choir.png`,
      emoji: "🎶",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:drama`,
      setId: H,
      name: "Drama",
      artworkUrl: `${A}/drama.png`,
      emoji: "🎭",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:art-club`,
      setId: H,
      name: "Art Club",
      artworkUrl: `${A}/art.png`,
      emoji: "🎨",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:photography`,
      setId: H,
      name: "Photography",
      artworkUrl: `${A}/photography.png`,
      emoji: "📷",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:yearbook`,
      setId: H,
      name: "Yearbook",
      artworkUrl: `${A}/yearbook.png`,
      emoji: "📔",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:journalism`,
      setId: H,
      name: "Journalism",
      artworkUrl: `${A}/journalism.png`,
      emoji: "📰",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },

    // ── Academic & competition ──
    {
      id: `${H}:science`,
      setId: H,
      name: "Science",
      artworkUrl: `${A}/science.png`,
      emoji: "🧪",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:robotics`,
      setId: H,
      name: "Robotics",
      artworkUrl: `${A}/robotics.png`,
      emoji: "🤖",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:robotic-arm`,
      setId: H,
      name: "Engineering",
      artworkUrl: `${A}/robotic-arm.png`,
      emoji: "🦾",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:chess`,
      setId: H,
      name: "Chess",
      artworkUrl: `${A}/chess.png`,
      emoji: "♞",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:debate`,
      setId: H,
      name: "Debate",
      artworkUrl: `${A}/debate.png`,
      emoji: "🎙️",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:quiz-bowl`,
      setId: H,
      name: "Quiz Bowl",
      artworkUrl: `${A}/quiz-bowl.png`,
      emoji: "🔔",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },

    // ── Leadership & service ──
    {
      id: `${H}:gavel`,
      setId: H,
      name: "Student Government",
      artworkUrl: `${A}/gavel.png`,
      emoji: "⚖️",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:service`,
      setId: H,
      name: "Service",
      artworkUrl: `${A}/service.png`,
      emoji: "🤝",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:rotc`,
      setId: H,
      name: "ROTC",
      artworkUrl: `${A}/rotc.png`,
      emoji: "🎖️",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },

    // ── Honours ──
    {
      id: `${H}:honor-star`,
      setId: H,
      name: "Honor Roll",
      artworkUrl: `${A}/honor-star.png`,
      emoji: "⭐",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:trophy`,
      setId: H,
      name: "Trophy",
      artworkUrl: `${A}/trophy.png`,
      emoji: "🏆",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:medal`,
      setId: H,
      name: "Medal",
      artworkUrl: `${A}/medal.png`,
      emoji: "🥇",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:star`,
      setId: H,
      name: "Star",
      artworkUrl: `${A}/star.png`,
      emoji: "⭐",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:crest`,
      setId: H,
      name: "Crest",
      artworkUrl: `${A}/crest.png`,
      emoji: "🛡️",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:diploma`,
      setId: H,
      name: "Diploma",
      artworkUrl: `${A}/diploma.png`,
      emoji: "📜",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:torch`,
      setId: H,
      name: "Torch",
      artworkUrl: `${A}/torch.png`,
      emoji: "🔥",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
  ],
  // No starter layouts yet — the collection is a palette of activities that each
  // school picks from, so presets would be guesses. Same as the July 4th set.
  presets: [],
};
