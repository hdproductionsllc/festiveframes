"use client";

interface TileArtworkProps {
  pieceId: string;
  size: number;
}

/**
 * Custom SVG artwork for tiles that don't have a Twemoji CDN URL.
 * Most tiles use Twemoji via <img src={artworkUrl}> — this component
 * only handles the few remaining cases (solid-color stripe tiles).
 */
export function TileArtwork({ pieceId, size }: TileArtworkProps) {
  const id = pieceId.split(":")[1];
  const s = { width: size, height: size, viewBox: "0 0 100 100" };

  switch (id) {
    case "stripe-red":
      return (
        <svg {...s}>
          <defs>
            <linearGradient id={`sr${size}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#EF5350" />
              <stop offset="50%" stopColor="#C62828" />
              <stop offset="100%" stopColor="#B71C1C" />
            </linearGradient>
          </defs>
          <rect x="8" y="8" width="84" height="84" rx="4" fill={`url(#sr${size})`} />
          <rect x="8" y="8" width="84" height="28" rx="4" fill="rgba(255,255,255,0.1)" />
        </svg>
      );

    case "stripe-white":
      return (
        <svg {...s}>
          <defs>
            <linearGradient id={`swh${size}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E0E0E0" />
            </linearGradient>
          </defs>
          <rect x="8" y="8" width="84" height="84" rx="4" fill={`url(#swh${size})`} />
          <rect x="8" y="8" width="84" height="28" rx="4" fill="rgba(255,255,255,0.3)" />
        </svg>
      );

    case "stripe-blue":
      return (
        <svg {...s}>
          <defs>
            <linearGradient id={`sb${size}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#42A5F5" />
              <stop offset="50%" stopColor="#1565C0" />
              <stop offset="100%" stopColor="#0D47A1" />
            </linearGradient>
          </defs>
          <rect x="8" y="8" width="84" height="84" rx="4" fill={`url(#sb${size})`} />
          <rect x="8" y="8" width="84" height="28" rx="4" fill="rgba(255,255,255,0.1)" />
        </svg>
      );

    default:
      return null;
  }
}

/** Tiles with custom SVG artwork (no Twemoji URL). */
export function hasCustomArtwork(pieceId: string): boolean {
  const id = pieceId.split(":")[1];
  return id === "stripe-red" || id === "stripe-white" || id === "stripe-blue";
}

/** Tiles eligible for die-cut rendering (transparent bg + drop shadow). */
const DIE_CUT_ELIGIBLE = new Set([
  "star", "heart", "diamond", "lightning", "fire", "crown", "peace",
  "skull", "music", "paw", "sun", "moon", "flower", "smiley",
  "anchor", "cross", "rainbow", "trophy",
  "soccer", "football", "baseball", "basketball",
  "eagle", "liberty", "sparkler",
  "star-white", "star-gold", "firework-red", "firework-blue",
  "rocket", "medal", "bell", "party", "usa",
  // Easter
  "bunny", "rabbit", "hatching-chick", "baby-chick", "egg",
  "tulip", "blossom", "butterfly", "dove", "lamb",
  "basket", "bouquet", "ribbon", "seedling", "cherry-blossom",
  // Christmas
  "tree", "santa", "snowman", "snowflake", "deer", "gift",
  "candle", "cookie", "candy-cane", "scarf", "gloves",
  "mrs-claus", "sparkles",
  // Halloween
  "jack-o-lantern", "ghost", "bat", "spider", "web",
  "vampire", "candy", "lollipop", "devil", "cat",
  "crystal-ball", "broom", "tombstone", "eye",
  // Thanksgiving
  "turkey", "fallen-leaf", "maple-leaf", "corn", "pie",
  "apple", "sunflower", "pray", "pumpkin", "bread", "carrot", "acorn",
  // Valentine's
  "two-hearts", "heart-arrow", "heart-ribbon", "growing-heart",
  "rose", "chocolate", "love-letter", "ring", "kiss",
  "champagne", "swan",
  // St. Patrick's
  "shamrock", "four-leaf", "beer", "irish-flag", "green-heart",
  "coin", "top-hat",
  // New Year's
  "fireworks", "champagne-glasses", "party-popper", "confetti",
  "clock", "trumpet", "party-face", "champagne-bottle", "balloon",
  // Hanukkah
  "menorah", "star-of-david", "blue-heart",
  // Military & Veteran
  "medal", "gold-medal", "flag", "eagle", "star", "glowing-star",
  "anchor", "shield", "airplane", "helicopter", "ribbon", "salute",
  "swords", "purple-heart", "dove", "flexed",
]);

export function canDieCut(pieceId: string): boolean {
  const id = pieceId.split(":")[1];
  return DIE_CUT_ELIGIBLE.has(id);
}
