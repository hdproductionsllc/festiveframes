import type { TileSet } from "@/lib/types";

const T = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@v15.1.0/assets/svg";

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
  presets: [],
};
