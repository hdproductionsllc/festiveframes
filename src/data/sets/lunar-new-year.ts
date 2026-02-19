import type { TileSet, PlacedTile, DesignPreset } from "@/lib/types";

const T = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@v15.1.0/assets/svg";
const S = "lunar";
const tile = (id: string): PlacedTile => ({ pieceId: `${S}:${id}`, setId: S });

const TOP = Array.from({ length: 11 }, (_, i) => `frame:top-${i}`);
const LEFT = Array.from({ length: 5 }, (_, i) => `frame:left-${i}`);
const RIGHT = Array.from({ length: 5 }, (_, i) => `frame:right-${i}`);
const ALL = [...TOP, ...LEFT, ...RIGHT, "frame:bottom-left-0", "frame:bottom-right-0"];

const presets: DesignPreset[] = [
  {
    id: `${S}:lucky-dragon`,
    name: "Lucky Dragon",
    description: "Dragons and red envelopes — prosperity and power",
    slots: Object.fromEntries(ALL.map((id, i) =>
      [id, tile(i % 4 === 0 ? "dragon" : i % 4 === 1 ? "envelope" : i % 4 === 2 ? "gold" : "imperial")]
    )),
    bottomBar: { text: "GONG XI FA CAI", backgroundColor: "#C41E1E", textColor: "#FFD700" },
  },
  {
    id: `${S}:lantern-festival`,
    name: "Lantern Festival",
    description: "Red lanterns and fireworks lighting the night",
    slots: Object.fromEntries(ALL.map((id, i) =>
      [id, tile(i % 3 === 0 ? "lantern" : i % 3 === 1 ? "fireworks" : "imperial")]
    )),
  },
  {
    id: `${S}:year-of-snake`,
    name: "Year of the Snake",
    description: "2025 zodiac — serpentine elegance",
    slots: Object.fromEntries(ALL.map((id, i) =>
      [id, tile(i % 4 === 0 ? "snake" : i % 4 === 1 ? "envelope" : i % 4 === 2 ? "firecracker" : "gold")]
    )),
    bottomBar: { text: "YEAR OF THE SNAKE", backgroundColor: "#1a1a1a", textColor: "#FFD700" },
  },
];

export const lunarNewYearSet: TileSet = {
  id: S,
  name: "Lunar New Year",
  icon: "🧧",
  description: "Celebrate the Lunar New Year with dragons, lanterns, and luck",
  price: 11.99,
  pieces: [
    // ─── Colors ─────────────────────────────────────────────
    { id: `${S}:imperial`, setId: S, name: "Imperial Red", artworkUrl: "", emoji: "🟥", backgroundColor: "#C41E1E" },
    { id: `${S}:gold`, setId: S, name: "Lucky Gold", artworkUrl: "", emoji: "🟨", backgroundColor: "#FFD700", textColor: "#333" },
    { id: `${S}:black`, setId: S, name: "Ink Black", artworkUrl: "", emoji: "⬛", backgroundColor: "#1a1a1a" },
    { id: `${S}:jade`, setId: S, name: "Jade", artworkUrl: "", emoji: "🟩", backgroundColor: "#00A86B" },
    { id: `${S}:silk`, setId: S, name: "Silk Cream", artworkUrl: "", emoji: "⬜", backgroundColor: "#FFF8E7", textColor: "#333" },

    // ─── Icons ──────────────────────────────────────────────
    { id: `${S}:dragon`, setId: S, name: "Dragon", artworkUrl: `${T}/1f409.svg`, emoji: "🐉", backgroundColor: "#C41E1E" },
    { id: `${S}:dragon-face`, setId: S, name: "Dragon Face", artworkUrl: `${T}/1f432.svg`, emoji: "🐲", backgroundColor: "#FFD700", textColor: "#333" },
    { id: `${S}:envelope`, setId: S, name: "Red Envelope", artworkUrl: `${T}/1f9e7.svg`, emoji: "🧧", backgroundColor: "#C41E1E" },
    { id: `${S}:lantern`, setId: S, name: "Lantern", artworkUrl: `${T}/1f3ee.svg`, emoji: "🏮", backgroundColor: "#C41E1E" },
    { id: `${S}:firecracker`, setId: S, name: "Firecracker", artworkUrl: `${T}/1f9e8.svg`, emoji: "🧨", backgroundColor: "#C41E1E" },
    { id: `${S}:fireworks`, setId: S, name: "Fireworks", artworkUrl: `${T}/1f386.svg`, emoji: "🎆", backgroundColor: "#1a1a1a" },
    { id: `${S}:sparkler`, setId: S, name: "Sparkler", artworkUrl: `${T}/1f387.svg`, emoji: "🎇", backgroundColor: "#1a1a1a" },
    { id: `${S}:confetti`, setId: S, name: "Confetti", artworkUrl: `${T}/1f38a.svg`, emoji: "🎊", backgroundColor: "#FFD700", textColor: "#333" },
    { id: `${S}:dumpling`, setId: S, name: "Dumpling", artworkUrl: `${T}/1f95f.svg`, emoji: "🥟", backgroundColor: "#FFF8E7", textColor: "#333" },
    { id: `${S}:panda`, setId: S, name: "Panda", artworkUrl: `${T}/1f43c.svg`, emoji: "🐼", backgroundColor: "#00A86B" },
    { id: `${S}:mahjong`, setId: S, name: "Mahjong", artworkUrl: `${T}/1f004.svg`, emoji: "🀄", backgroundColor: "#FFF8E7", textColor: "#333" },
    { id: `${S}:snake`, setId: S, name: "Snake", artworkUrl: `${T}/1f40d.svg`, emoji: "🐍", backgroundColor: "#00A86B" },
    { id: `${S}:tiger`, setId: S, name: "Tiger", artworkUrl: `${T}/1f42f.svg`, emoji: "🐯", backgroundColor: "#FFD700", textColor: "#333" },
    { id: `${S}:rabbit`, setId: S, name: "Rabbit", artworkUrl: `${T}/1f430.svg`, emoji: "🐰", backgroundColor: "#FFB7C5", textColor: "#333" },
    { id: `${S}:yin-yang`, setId: S, name: "Yin Yang", artworkUrl: `${T}/262f.svg`, emoji: "☯️", backgroundColor: "#1a1a1a" },
    { id: `${S}:chopsticks`, setId: S, name: "Chopsticks", artworkUrl: `${T}/1f962.svg`, emoji: "🥢", backgroundColor: "#C41E1E" },
  ],
  presets,
};
