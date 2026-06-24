// Themed starting points for the homepage "Build this look" buttons. Each look
// links to /build?look=<id>; the builder seeds a design biased toward that
// look's `featured` tiles and drops a bottom text bar with its `phrase`.
//
// `featured` ids are repeated several times when seeding so the look reads
// clearly, then a few generic july4th tiles are mixed in for variety. All ids
// below are REAL pieces from src/data/sets/fourth-of-july.ts.

export interface LookPreset {
  /** Ordered, real july4th piece ids that define the look (heavily weighted). */
  featured: string[];
  /** How many times each featured id is repeated in the seed pool. Default 4. */
  fillerWeight?: number;
  /** Bottom-bar slogan for this look. Omit for no bar. */
  phrase?: string;
}

export const LOOK_PRESETS: Record<string, LookPreset> = {
  // 250 Years — feature the 250 tile, surrounded by red/white/blue stars + flags.
  years250: {
    featured: [
      "july4th:250",
      "july4th:star-red",
      "july4th:star-blue",
      "july4th:american-flag",
      "july4th:solid-white",
    ],
    phrase: "250 YEARS",
  },

  // Spirit of '76 — feature the 1776-2026 tile plus USA wordmark + flags.
  spirit76: {
    featured: [
      "july4th:1776-2026",
      "july4th:usa",
      "july4th:american-flag",
      "july4th:waving-flag",
      "july4th:star-blue",
    ],
    phrase: "1776",
  },

  // Freedom Burst — fireworks, firecrackers, and bursts.
  burst: {
    featured: [
      "july4th:firework-rwb",
      "july4th:firework-sky",
      "july4th:firecracker",
      "july4th:sunburst",
      "july4th:halftone-star",
    ],
    phrase: "LET FREEDOM RING",
  },

  // Home of the Brave — eagle anchored by stars and flags.
  brave: {
    featured: [
      "july4th:eagle",
      "july4th:star-red",
      "july4th:star-blue",
      "july4th:american-flag",
      "july4th:star-field",
    ],
    phrase: "HOME OF THE BRAVE",
  },

  // Pinwheel Parade — stars heavy (red + blue) with pinwheels.
  pinwheel: {
    featured: [
      "july4th:pinwheel",
      "july4th:star-red",
      "july4th:star-blue",
      "july4th:star-bold",
      "july4th:halftone-star",
    ],
    phrase: "LET FREEDOM RING",
  },

  // The Sampler — a balanced mix of everything.
  sampler: {
    featured: [
      "july4th:american-flag",
      "july4th:eagle",
      "july4th:250",
      "july4th:firework-rwb",
      "july4th:star-red",
      "july4th:star-blue",
      "july4th:pinwheel",
      "july4th:firecracker",
    ],
    phrase: "USA",
  },
};
