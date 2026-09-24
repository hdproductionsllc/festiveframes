import type { TilePiece, TileSet, TileSpan } from "@/lib/types";
import { TILE_BG } from "@/lib/utils/tile-theme";
import { LIGHT_ENAMEL_FILES } from "./high-school-light.generated";

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
const NAVY = TILE_BG.navy;

/**
 * EVERY FOOTPRINT IS SQUARE, because every badge is a square (owner, 2026-09-23).
 *
 * The footprint used to follow the art's own aspect — TALL {1,2} for an upright
 * torch, WIDE {2,1} for a trumpet lying flat. Two things retired that: the art is
 * now padded to a centred transparent square at intake (`high-school.spans.test.ts`
 * measures every PNG), and on the school frames the SQUARE RULE sizes every badge
 * from the frame, not from the piece (FrameConfig.badgeShape). A non-square
 * declaration would be a second shape rule living beside the cell's own.
 */
const PREFERRED: TileSpan = { cols: 2, rows: 2 };

/**
 * Each badge's IVORY-ENAMEL twin, where it has one (scripts/light-enamel.mjs):
 * the same pin with its navy enamel re-inked, drawn on a school colour where ivory
 * reads better than navy (`badgeArtworkUrl` decides). Attached from the generated list
 * rather than typed per piece, so a twin on disk and a twin in the data cannot
 * disagree.
 */
const LIGHT = new Set(LIGHT_ENAMEL_FILES);

/**
 * Badges whose art is WITHHELD from every offer — the tray, the activity picker,
 * the welcome chips and the kit signatures — until it is redrawn, id -> why.
 *
 * They stay registered in the set below, so a design saved with one still
 * resolves and prints what its owner chose; nobody new is handed it. Redraw
 * through the art pipeline, clear the one-inch test, then delete the entry.
 */
export const WITHHELD_ART: ReadonlyMap<string, string> = new Map([
  [
    `${H}:quiz-bowl`,
    "the art is a brass desk bell, which a parent reads as a hotel concierge bell, not Scholar Bowl; redraw as a buzzer with its light lit",
  ],
  [
    `${H}:model-un`,
    "a gridded globe inside an olive wreath reads as the United Nations emblem, whose commercial use is restricted; redraw without the wreath",
  ],
]);
function withDarkFieldTwins(pieces: TilePiece[]): TilePiece[] {
  return pieces.map((p) => {
    const file = /^\/tiles\/high-school\/([^/]+)\.png$/.exec(p.artworkUrl)?.[1];
    return file && LIGHT.has(file) ? { ...p, darkFieldArtworkUrl: `${A}/light/${file}.png` } : p;
  });
}

export const highSchoolSet: TileSet = {
  id: H,
  name: "High School",
  icon: "🏫",
  description:
    "Embroidered high-school patches — team sports, academic clubs, and activities.",
  price: 0,
  // Ordered so related activities sit together in one flat palette.
  pieces: withDarkFieldTwins([
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
    // 3px matte erode, trimmed to content, then padded to a centred transparent
    // SQUARE — every badge is square (owner, 2026-09-23), so the file is too.
    //
    // ORDER is what a phone tray shows first: arts and academics lead, athletics
    // follow (owner: strong non-sports examples).
    //
    // IDs are unchanged wherever one existed, so saved designs keep resolving.

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

    {
      id: `${H}:jazz-band`,
      setId: H,
      name: "Jazz Band",
      artworkUrl: `${A}/jazz-band.png`,
      emoji: "🎷",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:color-guard`,
      setId: H,
      name: "Color Guard",
      artworkUrl: `${A}/color-guard.png`,
      emoji: "🚩",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:film`,
      setId: H,
      name: "Film",
      artworkUrl: `${A}/film.png`,
      emoji: "🎬",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:ceramics`,
      setId: H,
      name: "Ceramics",
      artworkUrl: `${A}/ceramics.png`,
      emoji: "🏺",
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

    {
      id: `${H}:crew`,
      setId: H,
      name: "Crew",
      artworkUrl: `${A}/crew.png`,
      emoji: "🚣",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:sailing`,
      setId: H,
      name: "Sailing",
      artworkUrl: `${A}/sailing.png`,
      emoji: "⛵",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:ski`,
      setId: H,
      name: "Ski Team",
      artworkUrl: `${A}/ski.png`,
      emoji: "🎿",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:weightlifting`,
      setId: H,
      name: "Weightlifting",
      artworkUrl: `${A}/weightlifting.png`,
      emoji: "🏋️",
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

    {
      id: `${H}:model-un`,
      setId: H,
      name: "Model UN",
      artworkUrl: `${A}/model-un.png`,
      emoji: "🌍",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:campus-ministry`,
      setId: H,
      name: "Campus Ministry",
      artworkUrl: `${A}/campus-ministry.png`,
      emoji: "✝️",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:culinary`,
      setId: H,
      name: "Culinary",
      artworkUrl: `${A}/culinary.png`,
      emoji: "👨‍🍳",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:agriculture`,
      setId: H,
      name: "Agriculture",
      artworkUrl: `${A}/agriculture.png`,
      emoji: "🌾",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:scouts`,
      setId: H,
      name: "Scouting",
      artworkUrl: `${A}/scouts.png`,
      emoji: "🧭",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },

    // ── Honours ──
    {
      id: `${H}:diploma-tall`,
      setId: H,
      name: "Diploma (upright)",
      artworkUrl: `${A}/diploma-tall.png`,
      emoji: "📜",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:grad-cap`,
      setId: H,
      name: "Graduation Cap",
      artworkUrl: `${A}/grad-cap.png`,
      emoji: "🎓",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:diploma-cap`,
      setId: H,
      name: "Cap & Diploma",
      artworkUrl: `${A}/diploma-cap.png`,
      emoji: "🎓",
      backgroundColor: NAVY,
      defaultSpan: PREFERRED,
    },
    {
      id: `${H}:grad-tassel`,
      setId: H,
      name: "Tassel",
      artworkUrl: `${A}/grad-tassel.png`,
      emoji: "🎓",
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
  ]),
  // No starter layouts yet — the collection is a palette of activities that each
  // school picks from, so presets would be guesses. Same as the July 4th set.
  presets: [],
};
