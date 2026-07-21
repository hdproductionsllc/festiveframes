import type { TileSet, PlacedTile, DesignPreset } from "@/lib/types";

// ─── School Spirit ──────────────────────────────────────────────────────────
//
// PLACEHOLDER art only. Every piece renders via its EMOJI fallback (artworkUrl is
// intentionally empty) sitting on a school-ish background color, exactly like the
// hidden seasonal sets wait on an artist. The real collegiate / varsity artwork is
// a human task tracked in tasks/school-spirit-ideogram-brief.md; when those PNGs
// land, drop each file path into the matching piece's `artworkUrl` and the emoji
// fallback simply stops being used — no structural change here.
//
// This set is registered and getSet-able, but it is NOT in the global
// SURFACED_SET_IDS, so it never appears on /build. It is surfaced ONLY in the
// school builder via SCHOOL_SURFACED_SET_IDS (see ./index.ts).

const S = "school"; // setId shorthand

// PLACEHOLDER art = Twemoji SVGs (CC-BY 4.0), the SAME emoji-as-art mechanism the
// Essentials set uses. The palette renders `artworkUrl` (not `piece.emoji`), so an
// empty url would show a blank color block — these give the intended, visible emoji
// placeholder. They're generic (not the bespoke varsity art in the brief) and are
// CDN-hosted (no missing LOCAL files). Real collegiate art replaces each url later.
const T = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@v15.1.0/assets/svg";

// Collegiate placeholder palette — deep navy, varsity gold, court/turf accents.
const NAVY = "#1B2A4A";
const GOLD = "#F5B700";
const CRIMSON = "#9E1B32";
const ROYAL = "#1B4DFF";
const FOREST = "#2D8B46";
const TURF = "#3B7A3B";
const COURT = "#C46A2B";
const INK = "#1a1a1a";

/** School-appropriate spirit icons. Emoji-only fallback (artworkUrl empty). */
export const schoolSet: TileSet = {
  id: S,
  name: "School Spirit",
  icon: "🎓",
  description:
    "Placeholder varsity spirit tiles — stars, pennants, trophies, mascot balls, and school colors. Real collegiate art drops in later.",
  price: 0,
  pieces: [
    // ─── Spirit icons (Twemoji SVG placeholders) ───────────────
    { id: `${S}:star`, setId: S, name: "Star", artworkUrl: `${T}/2b50.svg`, emoji: "⭐", backgroundColor: NAVY },
    { id: `${S}:pennant`, setId: S, name: "Pennant", artworkUrl: `${T}/1f6a9.svg`, emoji: "🚩", backgroundColor: GOLD, textColor: "#333333" },
    { id: `${S}:trophy`, setId: S, name: "Trophy", artworkUrl: `${T}/1f3c6.svg`, emoji: "🏆", backgroundColor: NAVY },
    { id: `${S}:medal`, setId: S, name: "Medal", artworkUrl: `${T}/1f3c5.svg`, emoji: "🏅", backgroundColor: CRIMSON },
    { id: `${S}:megaphone`, setId: S, name: "Megaphone", artworkUrl: `${T}/1f4e3.svg`, emoji: "📣", backgroundColor: ROYAL },
    { id: `${S}:grad-cap`, setId: S, name: "Grad Cap", artworkUrl: `${T}/1f393.svg`, emoji: "🎓", backgroundColor: INK },
    { id: `${S}:number-one`, setId: S, name: "Number One", artworkUrl: `${T}/1f947.svg`, emoji: "🥇", backgroundColor: GOLD, textColor: "#333333" },
    { id: `${S}:crown`, setId: S, name: "Crown", artworkUrl: `${T}/1f451.svg`, emoji: "👑", backgroundColor: NAVY },
    { id: `${S}:shield`, setId: S, name: "Shield", artworkUrl: `${T}/1f6e1.svg`, emoji: "🛡️", backgroundColor: CRIMSON },
    { id: `${S}:lightning`, setId: S, name: "Lightning", artworkUrl: `${T}/26a1.svg`, emoji: "⚡", backgroundColor: GOLD, textColor: "#333333" },
    { id: `${S}:fire`, setId: S, name: "Fire", artworkUrl: `${T}/1f525.svg`, emoji: "🔥", backgroundColor: "#FF4500" },
    { id: `${S}:heart`, setId: S, name: "Heart", artworkUrl: `${T}/2764.svg`, emoji: "❤️", backgroundColor: CRIMSON },
    { id: `${S}:paw`, setId: S, name: "Paw", artworkUrl: `${T}/1f43e.svg`, emoji: "🐾", backgroundColor: "#8B4513" },
    { id: `${S}:book`, setId: S, name: "Book", artworkUrl: `${T}/1f4da.svg`, emoji: "📚", backgroundColor: FOREST },

    // ─── Sports ────────────────────────────────────────────────
    { id: `${S}:football`, setId: S, name: "Football", artworkUrl: `${T}/1f3c8.svg`, emoji: "🏈", backgroundColor: "#8B4513" },
    { id: `${S}:basketball`, setId: S, name: "Basketball", artworkUrl: `${T}/1f3c0.svg`, emoji: "🏀", backgroundColor: COURT },
    { id: `${S}:soccer`, setId: S, name: "Soccer", artworkUrl: `${T}/26bd.svg`, emoji: "⚽", backgroundColor: TURF },
    { id: `${S}:baseball`, setId: S, name: "Baseball", artworkUrl: `${T}/26be.svg`, emoji: "⚾", backgroundColor: CRIMSON },

    // ─── Arts ──────────────────────────────────────────────────
    { id: `${S}:music`, setId: S, name: "Band", artworkUrl: `${T}/1f3b5.svg`, emoji: "🎵", backgroundColor: NAVY },
    { id: `${S}:drama`, setId: S, name: "Drama", artworkUrl: `${T}/1f3ad.svg`, emoji: "🎭", backgroundColor: "#7B2D8E" },

    // ─── School colors (solids — empty url, color-block by design) ─
    { id: `${S}:solid-navy`, setId: S, name: "Navy", artworkUrl: "", emoji: "🟦", backgroundColor: NAVY },
    { id: `${S}:solid-gold`, setId: S, name: "Gold", artworkUrl: "", emoji: "🟨", backgroundColor: GOLD, textColor: "#333333" },
    { id: `${S}:solid-white`, setId: S, name: "White", artworkUrl: "", emoji: "⬜", backgroundColor: "#FFFFFF", textColor: "#333333" },
    { id: `${S}:solid-black`, setId: S, name: "Black", artworkUrl: "", emoji: "⬛", backgroundColor: INK },
    { id: `${S}:solid-crimson`, setId: S, name: "Crimson", artworkUrl: "", emoji: "🟥", backgroundColor: CRIMSON },
    { id: `${S}:solid-royal`, setId: S, name: "Royal", artworkUrl: "", emoji: "🟦", backgroundColor: ROYAL },
    { id: `${S}:solid-forest`, setId: S, name: "Forest", artworkUrl: "", emoji: "🟩", backgroundColor: FOREST },

    // ─── Multi-cell TEST tiles (dev only) ──────────────────────
    // Labeled placeholder art at fixed spans so multi-cell placement / rendering /
    // resize can be tested on the side panels (2 tiles wide) and rails before the
    // real varsity art lands. Each carries a `defaultSpan`, so dragging it drops a
    // snappet of that footprint. School-only (never surfaced on /build); remove once
    // real multi-cell art exists.
    { id: `${S}:test-2x3`, setId: S, name: "Test 2×3", artworkUrl: "/tiles/school/test/2x3.svg", emoji: "🔳", backgroundColor: NAVY, defaultSpan: { cols: 2, rows: 3 } },
    { id: `${S}:test-2x4`, setId: S, name: "Test 2×4", artworkUrl: "/tiles/school/test/2x4.svg", emoji: "🔳", backgroundColor: CRIMSON, defaultSpan: { cols: 2, rows: 4 } },
    { id: `${S}:test-2x2`, setId: S, name: "Test 2×2", artworkUrl: "/tiles/school/test/2x2.svg", emoji: "🔳", backgroundColor: ROYAL, defaultSpan: { cols: 2, rows: 2 } },
    { id: `${S}:test-2x1`, setId: S, name: "Test 2×1", artworkUrl: "/tiles/school/test/2x1.svg", emoji: "🔳", backgroundColor: TURF, defaultSpan: { cols: 2, rows: 1 } },
    { id: `${S}:test-1x2`, setId: S, name: "Test 1×2", artworkUrl: "/tiles/school/test/1x2.svg", emoji: "🔳", backgroundColor: GOLD, textColor: "#333333", defaultSpan: { cols: 1, rows: 2 } },
  ],
  presets: buildPresets(),
};

// ─── Presets ────────────────────────────────────────────────────────────────
// Standard 23-slot layouts (top rail + inner side rails + bottom corners). These
// are well-formed but currently inert in the school builder shell (it doesn't
// mount a preset gallery yet) — they exist so the set matches the shape of every
// other set and is ready the moment a "Looks" picker is wired for schools.
function buildPresets(): DesignPreset[] {
  const tile = (slug: string): PlacedTile => ({ pieceId: `${S}:${slug}`, setId: S });
  const TOP = Array.from({ length: 11 }, (_, i) => `frame:top-${i}`);
  const LEFT = Array.from({ length: 5 }, (_, i) => `frame:left-${i}`);
  const RIGHT = Array.from({ length: 5 }, (_, i) => `frame:right-${i}`);
  const ALL = [...TOP, ...LEFT, ...RIGHT, "frame:bottom-left-0", "frame:bottom-right-0"];

  const cycle = (slugs: string[]): Record<string, PlacedTile> =>
    Object.fromEntries(ALL.map((id, i) => [id, tile(slugs[i % slugs.length])]));

  return [
    {
      id: `${S}:spirit-day`,
      name: "Spirit Day",
      description: "Stars and pennants in navy and gold",
      slots: cycle(["star", "solid-gold", "pennant", "solid-navy"]),
      bottomBar: { text: "GO TEAM", backgroundColor: NAVY, textColor: GOLD },
    },
    {
      id: `${S}:champions`,
      name: "Champions",
      description: "Trophies and medals for the winning season",
      slots: cycle(["trophy", "solid-navy", "medal", "star"]),
      bottomBar: { text: "STATE CHAMPIONS", backgroundColor: CRIMSON, textColor: "#FFFFFF" },
    },
  ];
}
