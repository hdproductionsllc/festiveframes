import type { TileSet, PlacedTile, DesignPreset } from "@/lib/types";

const T = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@v15.1.0/assets/svg";

// ─── Preset helpers ─────────────────────────────────────────
const S = "essentials"; // setId shorthand
const tile = (pieceId: string): PlacedTile => ({ pieceId: `${S}:${pieceId}`, setId: S });

// All 23 standard slot IDs
const TOP = Array.from({ length: 11 }, (_, i) => `frame:top-${i}`);
const LEFT = Array.from({ length: 5 }, (_, i) => `frame:left-${i}`);
const RIGHT = Array.from({ length: 5 }, (_, i) => `frame:right-${i}`);
const BL = "frame:bottom-left-0";
const BR = "frame:bottom-right-0";
const ALL = [...TOP, ...LEFT, ...RIGHT, BL, BR];

/** Fill every slot with one tile */
function fillAll(pieceId: string): Record<string, PlacedTile> {
  return Object.fromEntries(ALL.map((id) => [id, tile(pieceId)]));
}

/** Alternating two tiles across all slots */
function checkerboard(a: string, b: string): Record<string, PlacedTile> {
  return Object.fromEntries(ALL.map((id, i) => [id, tile(i % 2 === 0 ? a : b)]));
}

/** Cycle through a list of tiles */
function cycle(pieces: string[]): Record<string, PlacedTile> {
  return Object.fromEntries(ALL.map((id, i) => [id, tile(pieces[i % pieces.length])]));
}

// ─── Presets ────────────────────────────────────────────────
const presets: DesignPreset[] = [
  {
    id: "essentials:checkerboard-bw",
    name: "Checkerboard",
    description: "Classic black and white alternating pattern",
    slots: checkerboard("black", "white"),
  },
  {
    id: "essentials:checkerboard-racing",
    name: "Racing Checkers",
    description: "Black and gold racing-inspired pattern",
    slots: checkerboard("black", "gold"),
  },
  {
    id: "essentials:rainbow",
    name: "Rainbow",
    description: "Full spectrum of color around the frame",
    slots: cycle(["red", "orange", "gold", "green", "teal", "blue", "purple", "pink"]),
  },
  {
    id: "essentials:all-gold",
    name: "Solid Gold",
    description: "Every slot filled with gold tiles",
    slots: fillAll("gold"),
  },
  {
    id: "essentials:ninja",
    name: "Ninja",
    description: "Black and silver stealth with shurikens",
    slots: Object.fromEntries(ALL.map((id, i) => [id, tile(i % 4 === 0 ? "star" : i % 4 === 2 ? "silver" : "black")])),
  },
  {
    id: "essentials:stars-navy",
    name: "Starry Night",
    description: "Gold stars on a deep navy background",
    slots: Object.fromEntries(ALL.map((id, i) => [id, tile(i % 3 === 0 ? "star" : "navy")])),
  },
  {
    id: "essentials:hearts-all",
    name: "All Heart",
    description: "Hearts all around with pink and red",
    slots: Object.fromEntries(ALL.map((id, i) => [id, tile(i % 2 === 0 ? "heart" : "pink")])),
  },
  {
    id: "essentials:fire-ice",
    name: "Fire & Ice",
    description: "Red and blue alternating — bold contrast",
    slots: checkerboard("red", "blue"),
  },
  {
    id: "essentials:sports-mix",
    name: "Game Day",
    description: "Mixed sports tiles for the fan",
    slots: cycle(["football", "baseball", "basketball", "soccer"]),
  },
  {
    id: "essentials:skull-crossbones",
    name: "Skull & Bones",
    description: "Skulls on black — edgy and bold",
    slots: Object.fromEntries(ALL.map((id, i) => [id, tile(i % 2 === 0 ? "skull" : "black")])),
  },
  {
    id: "essentials:patriot",
    name: "Patriot",
    description: "Red, white, and blue — stars and stripes",
    slots: cycle(["red", "white", "blue", "star", "red", "white", "blue"]),
  },
  {
    id: "essentials:paw-patrol",
    name: "Paw Patrol",
    description: "Paw prints for the pet lover",
    slots: Object.fromEntries(ALL.map((id, i) => [id, tile(i % 3 === 0 ? "paw" : i % 3 === 1 ? "orange" : "gold")])),
  },
];

export const essentialsSet: TileSet = {
  id: "essentials",
  name: "Essentials",
  icon: "⭐",
  description: "Starter set with solid colors and popular shapes",
  price: 9.99,
  pieces: [
    // ─── Solid Colors ────────────────────────────────────
    { id: "essentials:red", setId: "essentials", name: "Red", artworkUrl: "", emoji: "🟥", backgroundColor: "#C8102E" },
    { id: "essentials:blue", setId: "essentials", name: "Blue", artworkUrl: "", emoji: "🟦", backgroundColor: "#1B4DFF" },
    { id: "essentials:white", setId: "essentials", name: "White", artworkUrl: "", emoji: "⬜", backgroundColor: "#FFFFFF", textColor: "#333333" },
    { id: "essentials:black", setId: "essentials", name: "Black", artworkUrl: "", emoji: "⬛", backgroundColor: "#1a1a1a" },
    { id: "essentials:gold", setId: "essentials", name: "Gold", artworkUrl: "", emoji: "🟨", backgroundColor: "#FFD700", textColor: "#333333" },
    { id: "essentials:green", setId: "essentials", name: "Green", artworkUrl: "", emoji: "🟩", backgroundColor: "#2D8B46" },
    { id: "essentials:purple", setId: "essentials", name: "Purple", artworkUrl: "", emoji: "🟪", backgroundColor: "#7B2D8E" },
    { id: "essentials:orange", setId: "essentials", name: "Orange", artworkUrl: "", emoji: "🟧", backgroundColor: "#FF6600" },
    { id: "essentials:pink", setId: "essentials", name: "Pink", artworkUrl: "", emoji: "💗", backgroundColor: "#FF69B4" },
    { id: "essentials:silver", setId: "essentials", name: "Silver", artworkUrl: "", emoji: "⬜", backgroundColor: "#C0C0C0", textColor: "#333333" },
    { id: "essentials:navy", setId: "essentials", name: "Navy", artworkUrl: "", emoji: "🟦", backgroundColor: "#1B2A4A" },
    { id: "essentials:teal", setId: "essentials", name: "Teal", artworkUrl: "", emoji: "🟩", backgroundColor: "#008080" },

    // ─── Popular Shapes (Twemoji SVGs — CC-BY 4.0) ──────
    { id: "essentials:star", setId: "essentials", name: "Star", artworkUrl: `${T}/2b50.svg`, emoji: "⭐", backgroundColor: "#1B2A4A" },
    { id: "essentials:heart", setId: "essentials", name: "Heart", artworkUrl: `${T}/2764.svg`, emoji: "❤️", backgroundColor: "#C8102E" },
    { id: "essentials:diamond", setId: "essentials", name: "Diamond", artworkUrl: `${T}/1f48e.svg`, emoji: "💎", backgroundColor: "#2196F3" },
    { id: "essentials:lightning", setId: "essentials", name: "Lightning", artworkUrl: `${T}/26a1.svg`, emoji: "⚡", backgroundColor: "#FFD700", textColor: "#333333" },
    { id: "essentials:fire", setId: "essentials", name: "Fire", artworkUrl: `${T}/1f525.svg`, emoji: "🔥", backgroundColor: "#FF4500" },
    { id: "essentials:crown", setId: "essentials", name: "Crown", artworkUrl: `${T}/1f451.svg`, emoji: "👑", backgroundColor: "#FFD700", textColor: "#333333" },
    { id: "essentials:peace", setId: "essentials", name: "Peace", artworkUrl: `${T}/262e.svg`, emoji: "☮️", backgroundColor: "#7B2D8E" },
    { id: "essentials:skull", setId: "essentials", name: "Skull", artworkUrl: `${T}/1f480.svg`, emoji: "💀", backgroundColor: "#1a1a1a" },
    { id: "essentials:music", setId: "essentials", name: "Music", artworkUrl: `${T}/1f3b5.svg`, emoji: "🎵", backgroundColor: "#1B2A4A" },
    { id: "essentials:paw", setId: "essentials", name: "Paw", artworkUrl: `${T}/1f43e.svg`, emoji: "🐾", backgroundColor: "#8B4513" },
    { id: "essentials:sun", setId: "essentials", name: "Sun", artworkUrl: `${T}/2600.svg`, emoji: "☀️", backgroundColor: "#FF8C00" },
    { id: "essentials:moon", setId: "essentials", name: "Moon", artworkUrl: `${T}/1f319.svg`, emoji: "🌙", backgroundColor: "#1B2A4A" },
    { id: "essentials:flower", setId: "essentials", name: "Flower", artworkUrl: `${T}/1f338.svg`, emoji: "🌸", backgroundColor: "#FF69B4" },
    { id: "essentials:smiley", setId: "essentials", name: "Smiley", artworkUrl: `${T}/1f60a.svg`, emoji: "😊", backgroundColor: "#FFD700", textColor: "#333333" },
    { id: "essentials:checkered", setId: "essentials", name: "Checkered", artworkUrl: `${T}/1f3c1.svg`, emoji: "🏁", backgroundColor: "#1a1a1a" },
    { id: "essentials:anchor", setId: "essentials", name: "Anchor", artworkUrl: `${T}/2693.svg`, emoji: "⚓", backgroundColor: "#1B3A6B" },
    { id: "essentials:cross", setId: "essentials", name: "Cross", artworkUrl: `${T}/271d.svg`, emoji: "✝️", backgroundColor: "#FFFFFF", textColor: "#333333" },
    { id: "essentials:rainbow", setId: "essentials", name: "Rainbow", artworkUrl: `${T}/1f308.svg`, emoji: "🌈", backgroundColor: "#87CEEB" },
    { id: "essentials:trophy", setId: "essentials", name: "Trophy", artworkUrl: `${T}/1f3c6.svg`, emoji: "🏆", backgroundColor: "#FFD700", textColor: "#333333" },
    { id: "essentials:soccer", setId: "essentials", name: "Soccer", artworkUrl: `${T}/26bd.svg`, emoji: "⚽", backgroundColor: "#2D8B46" },
    { id: "essentials:football", setId: "essentials", name: "Football", artworkUrl: `${T}/1f3c8.svg`, emoji: "🏈", backgroundColor: "#8B4513" },
    { id: "essentials:baseball", setId: "essentials", name: "Baseball", artworkUrl: `${T}/26be.svg`, emoji: "⚾", backgroundColor: "#CC0000" },
    { id: "essentials:basketball", setId: "essentials", name: "Basketball", artworkUrl: `${T}/1f3c0.svg`, emoji: "🏀", backgroundColor: "#FF6600" },
  ],
  presets,
};
