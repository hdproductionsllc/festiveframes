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
    // ─── DIE-STRUCK ENAMEL series ──────────────────────────────
    // A different make from the embroidered patches below, and deliberately so.
    // At the size these are actually seen — about an inch, on a car, in a car
    // park — every embroidered badge carries the same thread texture, so they
    // blur toward each other and the sport is hard to read at a glance. Hard
    // enamel gives each badge crisp high-contrast edges, and its polished metal
    // borders sit closer to the frame's own brass rim than thread does. That is
    // the premise of the whole product reading premium at distance: fake the
    // shine, and let contrast do the work detail cannot do at that size.
    //
    // Generated on a magenta chroma field and cut with a GLOBAL chroma key, not
    // the edge-connected fill the older art needs: a pin has real HOLES in it
    // (the gap between the goggle lenses), and an enclosed hole is unreachable
    // from the border, so an edge-connected fill leaves it filled — which it did,
    // and the despill then turned it maroon. The style block forbids magenta in
    // the artwork precisely so a global key is safe here. Then despilled, because
    // magenta bouncing off a plated edge leaves a red rim that reads as a dirty
    // outline on navy.
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
      id: `${H}:water-polo`,
      setId: H,
      name: "Water Polo",
      artworkUrl: `${A}/water-polo.png`,
      emoji: "🤽",
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
      id: `${H}:swim-dive`,
      setId: H,
      name: "Swim & Dive",
      artworkUrl: `${A}/swim-dive.png`,
      emoji: "🏊",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:honor-star`,
      setId: H,
      name: "Honor Roll",
      artworkUrl: `${A}/honor-star.png`,
      emoji: "⭐",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    // ─── EMBROIDERED PATCH series ──────────────────────────────
    //
    // Generated art, cut from a magenta chroma field by chroma-plane keying with the
    // measured backdrop un-multiplied out of every partial-alpha pixel — so the edges
    // carry no matte and the gold merrow border survives intact on any field colour.
    // The merrow border is the series' unifier: it echoes the badge's own brass rim,
    // so a patch and the frame read as one product rather than a sticker on a part.
    //
    // These lead the palette because they are the current quality bar; the flat
    // originals below stay until they are replaced in kind.
    {
      id: `${H}:art-club`,
      setId: H,
      name: "Art Club",
      artworkUrl: `${A}/art-club.png`,
      emoji: "🎨",
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
      id: `${H}:star`,
      setId: H,
      name: "Star",
      artworkUrl: `${A}/star.png`,
      emoji: "⭐",
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
      id: `${H}:laurel`,
      setId: H,
      name: "Laurel Wreath",
      artworkUrl: `${A}/laurel.png`,
      emoji: "🏵️",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
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
      id: `${H}:science`,
      setId: H,
      name: "Science",
      artworkUrl: `${A}/science.png`,
      emoji: "🧪",
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
      id: `${H}:drama`,
      setId: H,
      name: "Drama",
      artworkUrl: `${A}/drama.png`,
      emoji: "🎭",
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
      id: `${H}:robotics`,
      setId: H,
      name: "Robotics",
      artworkUrl: `${A}/robotics.png`,
      emoji: "🤖",
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
      id: `${H}:debate`,
      setId: H,
      name: "Debate",
      artworkUrl: `${A}/debate.png`,
      emoji: "⚖️",
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
      id: `${H}:track`,
      setId: H,
      name: "Track",
      artworkUrl: `${A}/track.png`,
      emoji: "👟",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:marching-band`,
      setId: H,
      name: "Marching Band",
      artworkUrl: `${A}/marching-band.png`,
      emoji: "🎺",
      backgroundColor: NAVY,
      defaultSpan: TALL,
    },
    {
      id: `${H}:yearbook`,
      setId: H,
      name: "Yearbook",
      artworkUrl: `${A}/yearbook.png`,
      emoji: "📖",
      backgroundColor: NAVY,
      defaultSpan: TALL,
    },
    {
      id: `${H}:gavel`,
      setId: H,
      name: "Gavel",
      artworkUrl: `${A}/gavel.png`,
      emoji: "⚖️",
      backgroundColor: NAVY,
      defaultSpan: TALL,
    },
    {
      id: `${H}:robotic-arm`,
      setId: H,
      name: "Robotic Arm",
      artworkUrl: `${A}/robotic-arm.png`,
      emoji: "🦾",
      backgroundColor: NAVY,
      defaultSpan: TALL,
    },
    {
      id: `${H}:diploma`,
      setId: H,
      name: "Diploma",
      artworkUrl: `${A}/diploma.png`,
      emoji: "🎓",
      backgroundColor: NAVY,
      defaultSpan: TALL,
    },
    {
      id: `${H}:field-hockey`,
      setId: H,
      name: "Field Hockey",
      artworkUrl: `${A}/field-hockey.png`,
      emoji: "🏑",
      backgroundColor: NAVY,
      defaultSpan: TALL,
    },
    {
      id: `${H}:baseball-bat`,
      setId: H,
      name: "Baseball Bat",
      artworkUrl: `${A}/baseball-bat.png`,
      emoji: "⚾",
      backgroundColor: NAVY,
      defaultSpan: TALL,
    },
    {
      id: `${H}:torch`,
      setId: H,
      name: "Torch",
      artworkUrl: `${A}/torch.png`,
      emoji: "🔥",
      backgroundColor: NAVY,
      defaultSpan: TALL,
    },
    {
      id: `${H}:trophy`,
      setId: H,
      name: "Trophy",
      artworkUrl: `${A}/trophy.png`,
      emoji: "🏆",
      backgroundColor: NAVY,
      defaultSpan: TALL,
    },
    {
      id: `${H}:soccer-patch`,
      setId: H,
      name: "Soccer (patch)",
      artworkUrl: `${A}/soccer-patch.png`,
      emoji: "⚽",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:football-patch`,
      setId: H,
      name: "Football (patch)",
      artworkUrl: `${A}/football-patch.png`,
      emoji: "🏈",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:basketball-patch`,
      setId: H,
      name: "Basketball (patch)",
      artworkUrl: `${A}/basketball-patch.png`,
      emoji: "🏀",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:volleyball-patch`,
      setId: H,
      name: "Volleyball (patch)",
      artworkUrl: `${A}/volleyball-patch.png`,
      emoji: "🏐",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:softball-patch`,
      setId: H,
      name: "Softball (patch)",
      artworkUrl: `${A}/softball-patch.png`,
      emoji: "🥎",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:baseball-patch`,
      setId: H,
      name: "Baseball (patch)",
      artworkUrl: `${A}/baseball-patch.png`,
      emoji: "⚾",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
  ],
  // No starter layouts yet — the collection is a palette of activities that each
  // school picks from, so presets would be guesses. Same as the July 4th set.
  presets: [],
};
