import type { TileSet, PlacedTile, DesignPreset } from "@/lib/types";
import { highSchoolSet } from "./high-school";

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
    "Becky's High School Collection, plus school-colour blocks and text presets.",
  price: 0,
  pieces: [
    // ─── Becky's High School Collection (REAL art) ─────────────
    // Spread in from ./high-school rather than surfaced as its own set: the palette
    // renders exactly one set at a time (TileGrid -> resolveSurfacedSetId) and has no
    // set switcher, so listing "hs" separately would hide the solids, multi-cell test
    // tiles, and text presets below. Leading the palette puts the real art first.
    // These keep their own `hs:` piece ids, which resolve fine — getPiece() is a flat
    // map across every set, not scoped to the set a piece is listed under.
    ...highSchoolSet.pieces,

    // ─── Spirit icons: REMOVED ─────────────────────────────────
    // Twenty Twemoji cartoons (star, pennant, trophy, mascot balls…) stood in until
    // real art existed. They now sit next to Becky's collection in the same palette,
    // where a flat emoji beside a drawn badge reads as a different product, not a
    // simpler option — so they are gone rather than demoted.
    //
    // The old note here said to keep them so saved designs still resolve. That is
    // handled properly now: `dropUnknownPieces` runs on hydrate and removes tiles
    // whose piece no longer exists, instead of leaving a record that renders as
    // nothing but still counts in the parts list.

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
    { id: `${S}:test-2x3`, setId: S, name: "Test 2×3", artworkUrl: "/tiles/school/test/2x3.svg", emoji: "🔳", backgroundColor: NAVY, defaultSpan: { cols: 2, rows: 3 }, spanRequired: true },
    { id: `${S}:test-2x4`, setId: S, name: "Test 2×4", artworkUrl: "/tiles/school/test/2x4.svg", emoji: "🔳", backgroundColor: CRIMSON, defaultSpan: { cols: 2, rows: 4 }, spanRequired: true },
    { id: `${S}:test-2x2`, setId: S, name: "Test 2×2", artworkUrl: "/tiles/school/test/2x2.svg", emoji: "🔳", backgroundColor: ROYAL, defaultSpan: { cols: 2, rows: 2 }, spanRequired: true },
    { id: `${S}:test-2x1`, setId: S, name: "Test 2×1", artworkUrl: "/tiles/school/test/2x1.svg", emoji: "🔳", backgroundColor: TURF, defaultSpan: { cols: 2, rows: 1 }, spanRequired: true },
    { id: `${S}:test-1x2`, setId: S, name: "Test 1×2", artworkUrl: "/tiles/school/test/1x2.svg", emoji: "🔳", backgroundColor: GOLD, textColor: "#333333", defaultSpan: { cols: 1, rows: 2 }, spanRequired: true },
  ],
  presets: buildPresets(),
};

// ─── Presets ────────────────────────────────────────────────────────────────
// Standard 23-slot layouts (top rail + inner side rails + bottom corners). These
// are well-formed but currently inert in the school builder shell (it doesn't
// mount a preset gallery yet) — they exist so the set matches the shape of every
// other set and is ready the moment a "Looks" picker is wired for schools.
function buildPresets(): DesignPreset[] {
  // Real art carries its OWN set id (`hs:`), so a preset naming it must too — the
  // twemoji stand-ins these used to cycle are gone.
  const tile = (id: string): PlacedTile =>
    id.includes(":") ? { pieceId: id, setId: id.split(":")[0] } : { pieceId: `${S}:${id}`, setId: S };
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
      description: "Team badges in navy and gold",
      slots: cycle(["hs:basketball-patch", "solid-gold", "hs:football-patch", "solid-navy"]),
      bottomBar: { text: "GO TEAM", backgroundColor: NAVY, textColor: GOLD },
    },
    {
      id: `${S}:champions`,
      name: "Champions",
      description: "Honours and leadership badges",
      slots: cycle(["hs:honor-society", "solid-navy", "hs:student-council", "hs:deca"]),
      bottomBar: { text: "STATE CHAMPIONS", backgroundColor: CRIMSON, textColor: "#FFFFFF" },
    },
  ];
}
