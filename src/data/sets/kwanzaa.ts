import type { TileSet, PlacedTile, DesignPreset } from "@/lib/types";

const T = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@v15.1.0/assets/svg";
const S = "kwanzaa";
const tile = (id: string): PlacedTile => ({ pieceId: `${S}:${id}`, setId: S });

const TOP = Array.from({ length: 11 }, (_, i) => `frame:top-${i}`);
const LEFT = Array.from({ length: 5 }, (_, i) => `frame:left-${i}`);
const RIGHT = Array.from({ length: 5 }, (_, i) => `frame:right-${i}`);
const ALL = [...TOP, ...LEFT, ...RIGHT, "frame:bottom-left-0", "frame:bottom-right-0"];

const presets: DesignPreset[] = [
  {
    id: `${S}:kinara`,
    name: "Kinara",
    description: "Seven candles — black, red, and green unity",
    slots: Object.fromEntries(ALL.map((id, i) =>
      [id, tile(i % 3 === 0 ? "candle" : i % 3 === 1 ? "kente-red" : "kente-green")]
    )),
    bottomBar: { text: "HABARI GANI", backgroundColor: "#1a1a1a", textColor: "#FFD700" },
  },
  {
    id: `${S}:unity`,
    name: "Unity",
    description: "Pan-African colors — strength and pride",
    slots: Object.fromEntries(ALL.map((id, i) => {
      const colors = ["black", "kente-red", "kente-green"];
      return [id, tile(colors[i % 3])];
    })),
    bottomBar: { text: "UMOJA", backgroundColor: "#C41E1E", textColor: "#FFFFFF" },
  },
  {
    id: `${S}:harvest`,
    name: "Harvest",
    description: "Fruits of the harvest — abundance and gratitude",
    slots: Object.fromEntries(ALL.map((id, i) =>
      [id, tile(i % 5 === 0 ? "corn" : i % 5 === 1 ? "kente-red" : i % 5 === 2 ? "globe" : i % 5 === 3 ? "kente-green" : "gift")]
    )),
  },
];

export const kwanzaaSet: TileSet = {
  id: S,
  name: "Kwanzaa",
  icon: "✊",
  description: "Seven principles — unity, purpose, creativity, and faith",
  price: 11.99,
  pieces: [
    // ─── Colors (Pan-African + Kente-inspired) ──────────────
    { id: `${S}:black`, setId: S, name: "Black", artworkUrl: "", emoji: "⬛", backgroundColor: "#1a1a1a" },
    { id: `${S}:kente-red`, setId: S, name: "Kente Red", artworkUrl: "", emoji: "🟥", backgroundColor: "#C41E1E" },
    { id: `${S}:kente-green`, setId: S, name: "Kente Green", artworkUrl: "", emoji: "🟩", backgroundColor: "#2D6B2D" },
    { id: `${S}:gold`, setId: S, name: "Gold", artworkUrl: "", emoji: "🟨", backgroundColor: "#FFD700", textColor: "#333" },
    { id: `${S}:earth`, setId: S, name: "Earth Brown", artworkUrl: "", emoji: "🟫", backgroundColor: "#6D4C41" },
    { id: `${S}:kente-orange`, setId: S, name: "Kente Orange", artworkUrl: "", emoji: "🟧", backgroundColor: "#E65100" },

    // ─── Icons ──────────────────────────────────────────────
    { id: `${S}:candle`, setId: S, name: "Mishumaa", artworkUrl: `${T}/1f56f.svg`, emoji: "🕯️", backgroundColor: "#1a1a1a" },
    { id: `${S}:fist`, setId: S, name: "Unity Fist", artworkUrl: `${T}/270a.svg`, emoji: "✊", backgroundColor: "#1a1a1a" },
    { id: `${S}:globe`, setId: S, name: "Globe Africa", artworkUrl: `${T}/1f30d.svg`, emoji: "🌍", backgroundColor: "#2D6B2D" },
    { id: `${S}:corn`, setId: S, name: "Muhindi", artworkUrl: `${T}/1f33d.svg`, emoji: "🌽", backgroundColor: "#FFD700", textColor: "#333" },
    { id: `${S}:gift`, setId: S, name: "Zawadi", artworkUrl: `${T}/1f381.svg`, emoji: "🎁", backgroundColor: "#C41E1E" },
    { id: `${S}:sparkles`, setId: S, name: "Sparkles", artworkUrl: `${T}/2728.svg`, emoji: "✨", backgroundColor: "#1a1a1a" },
    { id: `${S}:drum`, setId: S, name: "Drum", artworkUrl: `${T}/1fa98.svg`, emoji: "🪘", backgroundColor: "#6D4C41" },
    { id: `${S}:heart`, setId: S, name: "Heart", artworkUrl: `${T}/2764.svg`, emoji: "❤️", backgroundColor: "#C41E1E" },
    { id: `${S}:star`, setId: S, name: "Star", artworkUrl: `${T}/2b50.svg`, emoji: "⭐", backgroundColor: "#1a1a1a" },
    { id: `${S}:seedling`, setId: S, name: "Seedling", artworkUrl: `${T}/1f331.svg`, emoji: "🌱", backgroundColor: "#2D6B2D" },
    { id: `${S}:cup`, setId: S, name: "Kikombe", artworkUrl: `${T}/1f375.svg`, emoji: "🍵", backgroundColor: "#6D4C41" },
    { id: `${S}:book`, setId: S, name: "Knowledge", artworkUrl: `${T}/1f4da.svg`, emoji: "📚", backgroundColor: "#E65100" },
    { id: `${S}:music`, setId: S, name: "Music", artworkUrl: `${T}/1f3b6.svg`, emoji: "🎶", backgroundColor: "#2D6B2D" },
  ],
  presets,
};
