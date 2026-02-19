import type { TileSet, PlacedTile, DesignPreset } from "@/lib/types";

const T = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@v15.1.0/assets/svg";
const S = "muertos";
const tile = (id: string): PlacedTile => ({ pieceId: `${S}:${id}`, setId: S });

const TOP = Array.from({ length: 11 }, (_, i) => `frame:top-${i}`);
const LEFT = Array.from({ length: 5 }, (_, i) => `frame:left-${i}`);
const RIGHT = Array.from({ length: 5 }, (_, i) => `frame:right-${i}`);
const ALL = [...TOP, ...LEFT, ...RIGHT, "frame:bottom-left-0", "frame:bottom-right-0"];

const presets: DesignPreset[] = [
  {
    id: `${S}:sugar-skull`,
    name: "Sugar Skull",
    description: "Skulls and marigolds — celebrating the departed",
    slots: Object.fromEntries(ALL.map((id, i) =>
      [id, tile(i % 4 === 0 ? "skull" : i % 4 === 1 ? "marigold" : i % 4 === 2 ? "magenta" : "candle")]
    )),
    bottomBar: { text: "DÍA DE MUERTOS", backgroundColor: "#1a1a1a", textColor: "#FFD700" },
  },
  {
    id: `${S}:mariposa`,
    name: "Mariposa",
    description: "Butterflies and flowers — the souls returning",
    slots: Object.fromEntries(ALL.map((id, i) =>
      [id, tile(i % 3 === 0 ? "butterfly" : i % 3 === 1 ? "rose" : "marigold-gold")]
    )),
  },
  {
    id: `${S}:ofrenda`,
    name: "Ofrenda",
    description: "An altar of candles, flowers, and remembrance",
    slots: Object.fromEntries(ALL.map((id, i) =>
      [id, tile(i % 5 === 0 ? "candle" : i % 5 === 1 ? "bouquet" : i % 5 === 2 ? "skull" : i % 5 === 3 ? "hibiscus" : "purple")]
    )),
  },
];

export const diaDeMuertosSet: TileSet = {
  id: S,
  name: "Día de Muertos",
  icon: "💀",
  description: "Celebrate life and honor the departed with color and joy",
  price: 11.99,
  pieces: [
    // ─── Colors ─────────────────────────────────────────────
    { id: `${S}:magenta`, setId: S, name: "Magenta", artworkUrl: "", emoji: "🟪", backgroundColor: "#C2185B" },
    { id: `${S}:marigold-gold`, setId: S, name: "Marigold Gold", artworkUrl: "", emoji: "🟨", backgroundColor: "#F9A825", textColor: "#333" },
    { id: `${S}:purple`, setId: S, name: "Purple", artworkUrl: "", emoji: "🟪", backgroundColor: "#6A1B9A" },
    { id: `${S}:teal`, setId: S, name: "Turquoise", artworkUrl: "", emoji: "🟩", backgroundColor: "#00897B" },
    { id: `${S}:black`, setId: S, name: "Midnight", artworkUrl: "", emoji: "⬛", backgroundColor: "#1a1a1a" },
    { id: `${S}:orange`, setId: S, name: "Cempasúchil", artworkUrl: "", emoji: "🟧", backgroundColor: "#EF6C00" },

    // ─── Icons ──────────────────────────────────────────────
    { id: `${S}:skull`, setId: S, name: "Calavera", artworkUrl: `${T}/1f480.svg`, emoji: "💀", backgroundColor: "#1a1a1a" },
    { id: `${S}:marigold`, setId: S, name: "Marigold", artworkUrl: `${T}/1f33b.svg`, emoji: "🌻", backgroundColor: "#F9A825", textColor: "#333" },
    { id: `${S}:hibiscus`, setId: S, name: "Hibiscus", artworkUrl: `${T}/1f33a.svg`, emoji: "🌺", backgroundColor: "#C2185B" },
    { id: `${S}:rose`, setId: S, name: "Rose", artworkUrl: `${T}/1f339.svg`, emoji: "🌹", backgroundColor: "#6A1B9A" },
    { id: `${S}:butterfly`, setId: S, name: "Mariposa", artworkUrl: `${T}/1f98b.svg`, emoji: "🦋", backgroundColor: "#EF6C00" },
    { id: `${S}:candle`, setId: S, name: "Candle", artworkUrl: `${T}/1f56f.svg`, emoji: "🕯️", backgroundColor: "#1a1a1a" },
    { id: `${S}:bouquet`, setId: S, name: "Bouquet", artworkUrl: `${T}/1f490.svg`, emoji: "💐", backgroundColor: "#C2185B" },
    { id: `${S}:guitar`, setId: S, name: "Guitar", artworkUrl: `${T}/1f3b8.svg`, emoji: "🎸", backgroundColor: "#6A1B9A" },
    { id: `${S}:music`, setId: S, name: "Música", artworkUrl: `${T}/1f3b6.svg`, emoji: "🎶", backgroundColor: "#00897B" },
    { id: `${S}:masks`, setId: S, name: "Máscaras", artworkUrl: `${T}/1f3ad.svg`, emoji: "🎭", backgroundColor: "#1a1a1a" },
    { id: `${S}:sparkles`, setId: S, name: "Sparkles", artworkUrl: `${T}/2728.svg`, emoji: "✨", backgroundColor: "#6A1B9A" },
    { id: `${S}:heart`, setId: S, name: "Corazón", artworkUrl: `${T}/2764.svg`, emoji: "❤️", backgroundColor: "#C2185B" },
    { id: `${S}:sun`, setId: S, name: "Sol", artworkUrl: `${T}/2600.svg`, emoji: "☀️", backgroundColor: "#F9A825", textColor: "#333" },
    { id: `${S}:moon`, setId: S, name: "Luna", artworkUrl: `${T}/1f319.svg`, emoji: "🌙", backgroundColor: "#1a1a1a" },
    { id: `${S}:cross`, setId: S, name: "Cruz", artworkUrl: `${T}/271d.svg`, emoji: "✝️", backgroundColor: "#FFFFFF", textColor: "#333" },
  ],
  presets,
};
