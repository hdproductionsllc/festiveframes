import type { TileSet, PlacedTile, DesignPreset } from "@/lib/types";

const T = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@v15.1.0/assets/svg";
const S = "sakura";
const tile = (id: string): PlacedTile => ({ pieceId: `${S}:${id}`, setId: S });

const TOP = Array.from({ length: 11 }, (_, i) => `frame:top-${i}`);
const LEFT = Array.from({ length: 5 }, (_, i) => `frame:left-${i}`);
const RIGHT = Array.from({ length: 5 }, (_, i) => `frame:right-${i}`);
const ALL = [...TOP, ...LEFT, ...RIGHT, "frame:bottom-left-0", "frame:bottom-right-0"];

const presets: DesignPreset[] = [
  {
    id: `${S}:zen-garden`,
    name: "Zen Garden",
    description: "Cherry blossoms and waves — peaceful minimalism",
    slots: Object.fromEntries(ALL.map((id, i) =>
      [id, tile(i % 4 === 0 ? "blossom" : i % 4 === 1 ? "wave" : i % 4 === 2 ? "blush" : "navy")]
    )),
    bottomBar: { text: "ZEN", backgroundColor: "#1B2A4A", textColor: "#FFB7C5" },
  },
  {
    id: `${S}:fuji-sunrise`,
    name: "Fuji Sunrise",
    description: "Mount Fuji at dawn with cherry blossoms",
    slots: Object.fromEntries(ALL.map((id, i) =>
      [id, tile(i % 5 === 0 ? "fuji" : i % 5 === 1 ? "blossom" : i % 5 === 2 ? "sun-red" : i % 5 === 3 ? "blush" : "white")]
    )),
  },
  {
    id: `${S}:torii-path`,
    name: "Torii Path",
    description: "Red torii gates with lanterns along the path",
    slots: Object.fromEntries(ALL.map((id, i) =>
      [id, tile(i % 3 === 0 ? "torii" : i % 3 === 1 ? "lantern" : "vermillion")]
    )),
  },
];

export const sakuraSet: TileSet = {
  id: S,
  name: "Sakura",
  icon: "🌸",
  description: "Japanese-inspired cherry blossoms, waves, and zen",
  price: 11.99,
  pieces: [
    // ─── Colors ─────────────────────────────────────────────
    { id: `${S}:blush`, setId: S, name: "Sakura Pink", artworkUrl: "", emoji: "🌸", backgroundColor: "#FFB7C5" , textColor: "#333" },
    { id: `${S}:navy`, setId: S, name: "Indigo", artworkUrl: "", emoji: "🟦", backgroundColor: "#1B2A4A" },
    { id: `${S}:white`, setId: S, name: "Rice Paper", artworkUrl: "", emoji: "⬜", backgroundColor: "#FAF3E0", textColor: "#333" },
    { id: `${S}:vermillion`, setId: S, name: "Vermillion", artworkUrl: "", emoji: "🟥", backgroundColor: "#D03A2F" },
    { id: `${S}:matcha`, setId: S, name: "Matcha", artworkUrl: "", emoji: "🟩", backgroundColor: "#7B9A6D" },
    { id: `${S}:sun-red`, setId: S, name: "Hinomaru Red", artworkUrl: "", emoji: "🔴", backgroundColor: "#BC002D" },

    // ─── Icons ──────────────────────────────────────────────
    { id: `${S}:blossom`, setId: S, name: "Cherry Blossom", artworkUrl: `${T}/1f338.svg`, emoji: "🌸", backgroundColor: "#FFB7C5", textColor: "#333" },
    { id: `${S}:fuji`, setId: S, name: "Mount Fuji", artworkUrl: `${T}/1f5fb.svg`, emoji: "🗻", backgroundColor: "#E8F0FE", textColor: "#333" },
    { id: `${S}:torii`, setId: S, name: "Torii Gate", artworkUrl: `${T}/26e9.svg`, emoji: "⛩️", backgroundColor: "#D03A2F" },
    { id: `${S}:wave`, setId: S, name: "Great Wave", artworkUrl: `${T}/1f30a.svg`, emoji: "🌊", backgroundColor: "#1B2A4A" },
    { id: `${S}:castle`, setId: S, name: "Castle", artworkUrl: `${T}/1f3ef.svg`, emoji: "🏯", backgroundColor: "#FAF3E0", textColor: "#333" },
    { id: `${S}:tea`, setId: S, name: "Matcha Tea", artworkUrl: `${T}/1f375.svg`, emoji: "🍵", backgroundColor: "#7B9A6D" },
    { id: `${S}:sushi`, setId: S, name: "Sushi", artworkUrl: `${T}/1f363.svg`, emoji: "🍣", backgroundColor: "#FAF3E0", textColor: "#333" },
    { id: `${S}:moon`, setId: S, name: "Moon Viewing", artworkUrl: `${T}/1f391.svg`, emoji: "🎑", backgroundColor: "#1B2A4A" },
    { id: `${S}:dango`, setId: S, name: "Dango", artworkUrl: `${T}/1f361.svg`, emoji: "🍡", backgroundColor: "#FFB7C5", textColor: "#333" },
    { id: `${S}:wind-chime`, setId: S, name: "Wind Chime", artworkUrl: `${T}/1f390.svg`, emoji: "🎐", backgroundColor: "#87CEEB" },
    { id: `${S}:koi`, setId: S, name: "Koi Streamer", artworkUrl: `${T}/1f38f.svg`, emoji: "🎏", backgroundColor: "#1B2A4A" },
    { id: `${S}:lantern`, setId: S, name: "Lantern", artworkUrl: `${T}/1f3ee.svg`, emoji: "🏮", backgroundColor: "#D03A2F" },
    { id: `${S}:dragon`, setId: S, name: "Dragon", artworkUrl: `${T}/1f409.svg`, emoji: "🐉", backgroundColor: "#1B2A4A" },
    { id: `${S}:cards`, setId: S, name: "Hanafuda", artworkUrl: `${T}/1f3b4.svg`, emoji: "🎴", backgroundColor: "#1a1a1a" },
    { id: `${S}:dolls`, setId: S, name: "Hina Dolls", artworkUrl: `${T}/1f38e.svg`, emoji: "🎎", backgroundColor: "#D03A2F" },
    { id: `${S}:tanabata`, setId: S, name: "Tanabata", artworkUrl: `${T}/1f38b.svg`, emoji: "🎋", backgroundColor: "#7B9A6D" },
  ],
  presets,
};
