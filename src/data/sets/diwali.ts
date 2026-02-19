import type { TileSet, PlacedTile, DesignPreset } from "@/lib/types";

const T = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@v15.1.0/assets/svg";
const S = "diwali";
const tile = (id: string): PlacedTile => ({ pieceId: `${S}:${id}`, setId: S });

const TOP = Array.from({ length: 11 }, (_, i) => `frame:top-${i}`);
const LEFT = Array.from({ length: 5 }, (_, i) => `frame:left-${i}`);
const RIGHT = Array.from({ length: 5 }, (_, i) => `frame:right-${i}`);
const ALL = [...TOP, ...LEFT, ...RIGHT, "frame:bottom-left-0", "frame:bottom-right-0"];

const presets: DesignPreset[] = [
  {
    id: `${S}:festival-lights`,
    name: "Festival of Lights",
    description: "Diyas and sparklers lighting the darkness",
    slots: Object.fromEntries(ALL.map((id, i) =>
      [id, tile(i % 4 === 0 ? "diya" : i % 4 === 1 ? "sparkler" : i % 4 === 2 ? "deep-purple" : "saffron")]
    )),
    bottomBar: { text: "HAPPY DIWALI", backgroundColor: "#4A148C", textColor: "#FFD700" },
  },
  {
    id: `${S}:rangoli`,
    name: "Rangoli",
    description: "Vibrant flower pattern — welcoming and festive",
    slots: Object.fromEntries(ALL.map((id, i) => {
      const pattern = ["lotus", "marigold", "saffron", "peacock-blue", "hibiscus"];
      return [id, tile(pattern[i % pattern.length])];
    })),
  },
  {
    id: `${S}:golden-night`,
    name: "Golden Night",
    description: "Fireworks over a golden skyline",
    slots: Object.fromEntries(ALL.map((id, i) =>
      [id, tile(i % 3 === 0 ? "fireworks" : i % 3 === 1 ? "gold" : "sparkles")]
    )),
  },
];

export const diwaliSet: TileSet = {
  id: S,
  name: "Diwali",
  icon: "🪔",
  description: "Festival of lights — triumph of good over evil",
  price: 11.99,
  pieces: [
    // ─── Colors ─────────────────────────────────────────────
    { id: `${S}:saffron`, setId: S, name: "Saffron", artworkUrl: "", emoji: "🟧", backgroundColor: "#FF6F00" },
    { id: `${S}:deep-purple`, setId: S, name: "Deep Purple", artworkUrl: "", emoji: "🟪", backgroundColor: "#4A148C" },
    { id: `${S}:gold`, setId: S, name: "Gold", artworkUrl: "", emoji: "🟨", backgroundColor: "#FFD700", textColor: "#333" },
    { id: `${S}:peacock-blue`, setId: S, name: "Peacock Blue", artworkUrl: "", emoji: "🟦", backgroundColor: "#006064" },
    { id: `${S}:magenta`, setId: S, name: "Magenta", artworkUrl: "", emoji: "🟪", backgroundColor: "#AD1457" },
    { id: `${S}:emerald`, setId: S, name: "Emerald", artworkUrl: "", emoji: "🟩", backgroundColor: "#1B5E20" },

    // ─── Icons ──────────────────────────────────────────────
    { id: `${S}:diya`, setId: S, name: "Diya Lamp", artworkUrl: `${T}/1fa94.svg`, emoji: "🪔", backgroundColor: "#4A148C" },
    { id: `${S}:sparkler`, setId: S, name: "Sparkler", artworkUrl: `${T}/1f387.svg`, emoji: "🎇", backgroundColor: "#1a1a1a" },
    { id: `${S}:fireworks`, setId: S, name: "Fireworks", artworkUrl: `${T}/1f386.svg`, emoji: "🎆", backgroundColor: "#1a1a1a" },
    { id: `${S}:sparkles`, setId: S, name: "Sparkles", artworkUrl: `${T}/2728.svg`, emoji: "✨", backgroundColor: "#4A148C" },
    { id: `${S}:lotus`, setId: S, name: "Lotus", artworkUrl: `${T}/1fab7.svg`, emoji: "🪷", backgroundColor: "#AD1457" },
    { id: `${S}:marigold`, setId: S, name: "Marigold", artworkUrl: `${T}/1f33b.svg`, emoji: "🌻", backgroundColor: "#FF6F00" },
    { id: `${S}:hibiscus`, setId: S, name: "Hibiscus", artworkUrl: `${T}/1f33a.svg`, emoji: "🌺", backgroundColor: "#AD1457" },
    { id: `${S}:candle`, setId: S, name: "Candle", artworkUrl: `${T}/1f56f.svg`, emoji: "🕯️", backgroundColor: "#FFD700", textColor: "#333" },
    { id: `${S}:confetti`, setId: S, name: "Confetti", artworkUrl: `${T}/1f38a.svg`, emoji: "🎊", backgroundColor: "#FF6F00" },
    { id: `${S}:star`, setId: S, name: "Star", artworkUrl: `${T}/2b50.svg`, emoji: "⭐", backgroundColor: "#4A148C" },
    { id: `${S}:elephant`, setId: S, name: "Elephant", artworkUrl: `${T}/1f418.svg`, emoji: "🐘", backgroundColor: "#006064" },
    { id: `${S}:peacock`, setId: S, name: "Peacock", artworkUrl: `${T}/1f99a.svg`, emoji: "🦚", backgroundColor: "#006064" },
    { id: `${S}:gift`, setId: S, name: "Gift", artworkUrl: `${T}/1f381.svg`, emoji: "🎁", backgroundColor: "#AD1457" },
    { id: `${S}:bell`, setId: S, name: "Bell", artworkUrl: `${T}/1f514.svg`, emoji: "🔔", backgroundColor: "#FFD700", textColor: "#333" },
    { id: `${S}:prayer`, setId: S, name: "Namaste", artworkUrl: `${T}/1f64f.svg`, emoji: "🙏", backgroundColor: "#FF6F00" },
  ],
  presets,
};
