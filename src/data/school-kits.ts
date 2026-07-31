import type { SectionId, SectionState } from "@/lib/types";
import { DEFAULT_BOTTOM_BAR } from "@/lib/constants/defaults";
import { SCHOOL_HEADLINE_FONT, SCHOOL_TAGLINE_FONT } from "@/lib/constants/defaults";

// ─── Per-school builder kits ─────────────────────────────────────────────────
//
// "Each school has its own builder" is DATA, not code. There is exactly one
// builder engine; a kit is the seed that makes /s/<slug> open already wearing a
// school's identity — its colors on the frame, its name on the banners, its face
// in the font picker. Three layers, three update rules:
//
//   ENGINE (code)   — shared by every school. Fix the bevel once, every school's
//                     page gets it in the same deploy. No forks, ever.
//   KIT (this file) — isolated per school. Editing one entry cannot touch another
//                     school: entries share no fields and nothing derives across
//                     them at runtime.
//   DESIGNS (localStorage, per visitor) — frozen documents. A kit is INITIAL
//                     STATE ONLY: every kit-derived value flows through store
//                     options that persisted state wins over, so updating a kit
//                     restyles the next visitor, never a returning customer's
//                     saved design. (If a kit fix must reach existing sessions,
//                     the store's `merge` hook is the sanctioned repair path.)
//
// Kits also isolate STORAGE: each slug gets its own persist key, so a family
// with kids at two schools designs two frames without them overwriting each
// other, and /lab/school (kitless) keeps its original key untouched.
//
// STATUS. `"demo"` kits exist for sales conversations ("we already built your
// school's page") and render noindexed: colors are our best research guess and
// the school has not blessed the use of its name. Flip to `"verified"` only when
// BOTH are true — the school confirmed its colors AND gave written permission.
// The flip is deliberately manual.

export interface SchoolKit {
  /** URL identity: /s/<slug>. Also scopes the persist key and tags submissions. */
  slug: string;
  schoolName: string;
  /** What banners and copy call it — "Kirkwood", not the full legal name. */
  shortName: string;
  mascot: string;
  city: string;
  /** Frame body / behind-badge field / rim-override colors, #RRGGBB. */
  colors: { frame: string; tileField: string | null; rim: string | null };
  /** Banner seeds. Background is usually the darker school color. */
  banners: { top: string; bottom: string; tagline: string; bg: string; text: string };
  /** Builder font family string for the banner faces. Absent = house default. */
  fontFamily?: string;
  /** Parent-facing welcome above the builder: the "they did their homework"
   *  layer. Every line is school-specific and research-sourced — a wrong fact
   *  here costs more trust than the section earns, so facts only. */
  welcome?: {
    headline: string;
    message: string[];
    /** Activity/tradition chips — what the school is actually known for. */
    chips: string[];
    ordering: string;
  };
  /** Badges the frame opens wearing (slotId -> placement). Initial state only —
   *  a kit page lands on a finished-looking frame; persisted designs win. */
  seedSlots?: Record<string, { pieceId: string; setId: string; span: { cols: number; rows: number } }>;
  /** demo = research-guessed, noindexed, for sales demos. verified = school
   *  confirmed colors AND authorized use of its name — indexable. */
  status: "demo" | "verified";
  /** Where the colors came from — kept honest per the outreach catalog. */
  colorSource: string;
}

// Seeds from the outreach research. Colors marked approx are exactly that — the
// pitch includes asking the school to correct them, and a correction is a
// one-line edit here.
const KITS: SchoolKit[] = [
  {
    slug: "kirkwood-pioneers",
    schoolName: "Kirkwood High School",
    shortName: "Kirkwood",
    mascot: "Pioneers",
    city: "Kirkwood, MO",
    colors: { frame: "#7A0E1F", tileField: "#7A0E1F", rim: "#FFFFFF" },
    banners: { top: "HOME OF THE", bottom: "PIONEERS", tagline: "KIRKWOOD HIGH SCHOOL", bg: "#7A0E1F", text: "#FFFFFF" },
    status: "demo",
    colorSource: "red/white per MSHSAA + athletics site; shade approx (#C8102E family, deepened for the frame body) — confirm with KHS before print",
  },
  {
    slug: "sluh-jr-bills",
    schoolName: "St. Louis University High School",
    shortName: "SLUH",
    mascot: "Jr. Bills",
    city: "St. Louis, MO",
    colors: { frame: "#1B3F6E", tileField: "#1B3F6E", rim: "#FFFFFF" },
    // Tagline is their wordmark's own spelling — full name, no "SCHOOL",
    // exactly as the official lockup writes it. (Default rule: prefer the full
    // school name on the tagline line when it fits; the intake swaps it for
    // CLASS OF YYYY once the frame becomes the student's.)
    banners: { top: "HOME OF THE", bottom: "JR. BILLS", tagline: "ST. LOUIS UNIVERSITY HIGH", bg: "#1B3F6E", text: "#FFFFFF" },
    // Every welcome fact is research-verified w/ sources (scratchpad sluh-profile):
    // 1818/oldest-west (Wikipedia, stlmag), racquetball 16 national titles thru
    // 2023 (Prep News, USA Racquetball), soccer 2024+2025 back-to-back (Post-
    // Dispatch), water polo 23 / volleyball 13 (sluh.org achievements), Blue
    // Crew + Cashbah + Clavius + Sisyphus (sluh.org). "Jr. Bills" is the
    // community register (their store/social); "Jr. Billikens" is the formal
    // mark — parents get the community voice.
    // Copy rule (owner): subtle. The homework shows in the SELECTION — that
    // racquetball and water polo are listed at all, that it says Jr. Bills and
    // Blue Crew — never in recited stats. Facts stay verified in the research
    // file; the page just sounds like someone who goes to the games.
    welcome: {
      headline: "Jr. Bills, this one's for the back of the car.",
      message: [
        "SLUH families have worn the blue since 1818 — and from soccer in November to racquetball season, the Blue Crew shows up loud.",
        "This frame is your student's: their last name across the bottom banner, their sport or club on the badges, their class year in brass — all in SLUH blue.",
      ],
      chips: [
        "Soccer",
        "Racquetball",
        "Water polo",
        "Rugby",
        "Swim & dive",
        "Volleyball",
        "Band",
        "Robotics",
        "Theater",
        "Honor roll",
      ],
      ordering:
        "SLUH families: design your frame and send it in — we'll follow up with ordering details. A set donation from every frame goes back to SLUH.",
    },
    // The frame a SLUH parent lands on — the verified curated sample layout,
    // fully dressed so the first impression is a finished product, not a grid.
    seedSlots: {
      "frame:wing-left-0": { pieceId: "hs:soccer-patch", setId: "hs", span: { cols: 2, rows: 2 } },
      "frame:wing-left-2": { pieceId: "hs:football-patch", setId: "hs", span: { cols: 2, rows: 2 } },
      "frame:wing-left-4": { pieceId: "hs:basketball-patch", setId: "hs", span: { cols: 2, rows: 2 } },
      "frame:wing-left-6": { pieceId: "hs:band", setId: "hs", span: { cols: 2, rows: 2 } },
      "frame:top-11": { pieceId: "hs:crest", setId: "hs", span: { cols: 2, rows: 2 } },
      "frame:right-1": { pieceId: "hs:robotics", setId: "hs", span: { cols: 2, rows: 2 } },
      "frame:right-3": { pieceId: "hs:drama", setId: "hs", span: { cols: 2, rows: 2 } },
      "frame:bottom-11": { pieceId: "hs:honor-society", setId: "hs", span: { cols: 2, rows: 2 } },
    },
    status: "demo",
    colorSource:
      "read from OWNER-SUPPLIED official logo assets (Jul 2026): deep navy ~#1B3F6E (wordmark/Billiken linework), columbia ~#8CC7E9 (Billiken diamond), shield royal ~#2050A0. Vision-read from raster images — verify against a vector original before print. Phase-1 pilot school.",
  },
  {
    slug: "micds-rams",
    schoolName: "MICDS",
    shortName: "MICDS",
    mascot: "Rams",
    city: "St. Louis, MO",
    colors: { frame: "#04463D", tileField: "#04463D", rim: "#BCBBB6" },
    banners: { top: "HOME OF THE", bottom: "RAMS", tagline: "MICDS", bg: "#04463D", text: "#FFFFFF" },
    status: "demo",
    colorSource: "OFFICIAL — MICDS Color Palette PDF (red #D12229, forest green #04463D, warm gray #BCBBB6). Demo until brand office authorizes use.",
  },
];

const BY_SLUG = new Map(KITS.map((k) => [k.slug, k]));

/** Welcome-chip label -> badge piece for the preset engine. Labels without a
 *  matching badge (racquetball, water polo...) fall back to the generic crest
 *  preset — the chip still composes a frame rather than doing nothing. */
export const CHIP_PRESET_PIECE: Record<string, string> = {
  soccer: "hs:soccer-patch",
  football: "hs:football-patch",
  basketball: "hs:basketball-patch",
  volleyball: "hs:volleyball-patch",
  baseball: "hs:baseball-patch",
  softball: "hs:softball-patch",
  track: "hs:track",
  tennis: "hs:tennis",
  golf: "hs:golf",
  cheer: "hs:cheer",
  band: "hs:band",
  "marching band": "hs:marching-band",
  theater: "hs:drama",
  drama: "hs:drama",
  robotics: "hs:robotics",
  "honor roll": "hs:honor-society",
  "honor society": "hs:honor-society",
};

export function getSchoolKit(slug: string): SchoolKit | undefined {
  return BY_SLUG.get(slug);
}

export function allSchoolKits(): readonly SchoolKit[] {
  return KITS;
}

/** The kit's section seeds — SCHOOL_DEFAULT_SECTIONS wearing this school. */
export function kitSections(kit: SchoolKit): Partial<Record<SectionId, SectionState>> {
  const font = kit.fontFamily ?? SCHOOL_HEADLINE_FONT;
  return {
    top: {
      mode: "text",
      text: {
        ...DEFAULT_BOTTOM_BAR,
        text: "HOME OF THE",
        fontFamily: font,
        letterSpacing: 4,
        backgroundColor: kit.banners.bg,
        textColor: kit.banners.text,
      },
    },
    bottom: {
      mode: "text",
      text: {
        ...DEFAULT_BOTTOM_BAR,
        text: kit.banners.bottom,
        tagline: kit.banners.tagline,
        fontFamily: font,
        taglineFontFamily: SCHOOL_TAGLINE_FONT,
        letterSpacing: 2,
        backgroundColor: kit.banners.bg,
        textColor: kit.banners.text,
      },
    },
  };
}
