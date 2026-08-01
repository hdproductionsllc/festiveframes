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
  /** Banner seeds. `bg` is OPTIONAL and defaults to the badge field colour: they
   *  are one background as far as anyone looking at the frame is concerned, and
   *  two independent fields let a kit disagree with itself. It did — SLUH shipped
   *  with banners a shade off its own tiles, which is what the mismatch reported
   *  on desktop turned out to be. Set it only to say something different on
   *  purpose. */
  banners: { top: string; bottom: string; tagline: string; bg?: string; text: string };
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
  /**
   * The school's OWN marks, cut from official artwork the school or the owner
   * supplied. Everything here is KIT-SCOPED: a mark reaches this school's palette
   * and this school's banner, never another school's — which is the whole reason
   * marks live on the kit rather than in a shared tile set.
   *
   * Rights, not decoration: a school's crest is its trademark. Marks may only be
   * added from assets we were actually given, and a kit carrying them cannot go
   * `status: "verified"` (indexable, public) until the school has authorized use
   * of its name and marks in writing.
   */
  marks?: {
    /** Crest for the bottom banner, beside the school's name. Square-ish with a
     *  transparent field — the banner crest box is square and letterboxes wide
     *  marks down to nothing. */
    crest?: string;
    /** Full horizontal lockup, for the welcome band above the builder. */
    lockup?: string;
    /** Badge tiles unique to this school. `key` fixes the piece id
     *  (`mark:<slug>:<key>`), so seedSlots and presets can name them. */
    badges?: {
      key: string;
      name: string;
      artworkUrl: string;
      emoji: string;
      /** Field behind the art, same rule as the high-school set: white for art
       *  that is itself dark or navy line work, navy for full-colour art. */
      field: "navy" | "white";
    }[];
  };
  /**
   * A specific plate photo for the PREVIEW — typically a real vanity plate from
   * the school's own community, which sells the product better than a stock
   * plate reading FESTIVE ever could.
   *
   * Scoped to `state` because that is what the photo IS: switch the picker to
   * Kansas and this stops applying, because a Missouri plate in a Kansas preview
   * is a lie about the product. Preview only — the print path deliberately leaves
   * the plate opening empty, since the customer fits their own plate.
   */
  plate?: { state: string; src: string };
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
    banners: { top: "HOME OF THE", bottom: "PIONEERS", tagline: "KIRKWOOD HIGH SCHOOL", text: "#FFFFFF" },
    status: "demo",
    colorSource: "red/white per MSHSAA + athletics site; shade approx (#C8102E family, deepened for the frame body) — confirm with KHS before print",
  },
  {
    slug: "sluh-jr-bills",
    schoolName: "St. Louis University High School",
    shortName: "SLUH",
    mascot: "Jr. Bills",
    city: "St. Louis, MO",
    // Sampled from the official artwork itself (see colorSource) — not eyeballed.
    colors: { frame: "#183B67", tileField: "#183B67", rim: "#FFFFFF" },
    // Tagline is their wordmark's own spelling — full name, no "SCHOOL",
    // exactly as the official lockup writes it. (Default rule: prefer the full
    // school name on the tagline line when it fits; the intake swaps it for
    // CLASS OF YYYY once the frame becomes the student's.)
    banners: { top: "HOME OF THE", bottom: "JR. BILLS", tagline: "ST. LOUIS UNIVERSITY HIGH", text: "#FFFFFF" },
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
        "SLUH families have worn the blue since 1818. From soccer in November to racquetball season, the Blue Crew shows up loud.",
        "This frame is your student's. Their last name across the bottom banner, their sport or club on the badges, their class year in brass, all in SLUH blue.",
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
        "SLUH families: design your frame and send it in, and we'll follow up with ordering details. A set donation from every frame goes back to SLUH.",
    },
    // The frame a SLUH parent lands on — the verified curated sample layout,
    // fully dressed so the first impression is a finished product, not a grid.
    // The school's own Billiken and crest lead the layout — a SLUH parent should
    // see THEIR mark on the frame before they read a word of the copy.
    seedSlots: {
      "frame:wing-left-0": { pieceId: "mark:sluh-jr-bills:billiken", setId: "mark", span: { cols: 2, rows: 2 } },
      "frame:wing-left-2": { pieceId: "hs:racquetball", setId: "hs", span: { cols: 2, rows: 2 } },
      "frame:wing-left-4": { pieceId: "hs:water-polo", setId: "hs", span: { cols: 2, rows: 2 } },
      "frame:wing-left-6": { pieceId: "hs:band", setId: "hs", span: { cols: 2, rows: 2 } },
      "frame:top-11": { pieceId: "mark:sluh-jr-bills:shield", setId: "mark", span: { cols: 2, rows: 2 } },
      "frame:right-1": { pieceId: "hs:robotics", setId: "hs", span: { cols: 2, rows: 2 } },
      "frame:right-3": { pieceId: "hs:swim-dive", setId: "hs", span: { cols: 2, rows: 2 } },
      "frame:bottom-11": { pieceId: "hs:honor-star", setId: "hs", span: { cols: 2, rows: 2 } },
    },
    // Cut from the official files the owner supplied, both keyed to transparency
    // so they sit on the school's colour rather than on white cards.
    //
    // PRINT RESOLUTION, measured (do not flip this kit to "verified" without
    // re-checking): the Billiken is 679px on a 1.982" 2x2 tile = 343 DPI, over the
    // gate. The CREST is 249px drawn at 1.427" in the bottom banner = 174 DPI,
    // UNDER it. Fine on screen, soft on a printed part, so a pilot print needs a
    // crest of at least 429px (300 DPI) — ideally the vector original from SLUH
    // communications. Owner-grab item, same class as exact hex values.
    // A real Jr. Bills plate, supplied by the owner. Cropped to the exact framing
    // of the stock Missouri photo (924x467 canvas, 903x461 body at 7,1) because
    // plate-images.ts tunes a per-plate `scale` against that framing.
    plate: { state: "MO", src: "/plates/missouri-jrbills-centered.jpg" },
    marks: {
      crest: "/kits/sluh/lockup-crest.png",
      lockup: "/kits/sluh/lockup.png",
      badges: [
        {
          key: "billiken",
          name: "Billiken",
          artworkUrl: "/kits/sluh/billiken.png",
          emoji: "🔵",
          // Keyed to transparency (edge-connected fill only — a global white key
          // would hollow out the Billiken, whose own body is white), so he now
          // sits directly on the school's colour like every other badge.
          field: "navy",
        },
        {
          key: "shield",
          name: "SLUH Crest",
          artworkUrl: "/kits/sluh/lockup-crest.png",
          emoji: "🛡️",
          field: "navy",
        },
      ],
    },
    status: "demo",
    colorSource:
      "MEASURED from the OWNER-SUPPLIED official logo files (Jul 2026), by sampling the decoded pixels — not eyeballed: deep navy #183B67 (wordmark + Billiken line work, 6.9% of the lockup's opaque pixels), columbia #89CCE9 (Billiken diamond, 23.6%), shield royal #254B86/#2A5695. Sources are rasters (659px Billiken JPEG, 800x273 lockup PNG); a vector original would still be worth having before a large print run. Phase-1 pilot school.",
  },
  {
    slug: "micds-rams",
    schoolName: "MICDS",
    shortName: "MICDS",
    mascot: "Rams",
    city: "St. Louis, MO",
    colors: { frame: "#04463D", tileField: "#04463D", rim: "#BCBBB6" },
    banners: { top: "HOME OF THE", bottom: "RAMS", tagline: "MICDS", text: "#FFFFFF" },
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
  racquetball: "hs:racquetball",
  "water polo": "hs:water-polo",
  rugby: "hs:rugby",
  "swim & dive": "hs:swim-dive",
  "swim and dive": "hs:swim-dive",
  swimming: "hs:swim-dive",
  diving: "hs:swim-dive",
  "honor roll": "hs:honor-star",
  "honor society": "hs:honor-star",
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
  // One background colour for the whole frame unless a kit deliberately overrides.
  const bg = kit.banners.bg ?? kit.colors.tileField ?? kit.colors.frame;
  return {
    top: {
      mode: "text",
      text: {
        ...DEFAULT_BOTTOM_BAR,
        text: "HOME OF THE",
        fontFamily: font,
        letterSpacing: 4,
        backgroundColor: bg,
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
        backgroundColor: bg,
        textColor: kit.banners.text,
        // The crest flanking the name is the arrangement every gym wall and
        // letterhead already uses; "both" mirrors it so the name stays centred.
        // Bottom bar only — sectionSupportsLogo enforces that independently.
        ...(kit.marks?.crest
          ? { logo: { url: kit.marks.crest, placement: "both" as const } }
          : null),
      },
    },
  };
}
