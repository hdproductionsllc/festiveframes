import type { SectionId, SectionState } from "@/lib/types";
import { getPlateDesign } from "@/data/plates";
import { WITHHELD_ART } from "@/data/sets/high-school";
import { fitBanner } from "@/data/thin-kit";
import { DEFAULT_BOTTOM_BAR } from "@/lib/constants/defaults";
import { SCHOOL_HEADLINE_FONT, SCHOOL_TAGLINE_FONT } from "@/lib/constants/defaults";
import { CHICAGOLAND_KITS } from "@/data/kits/chicagoland";

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
  /**
   * The school's row in the national roster (`data/roster`), by NCES/PSS id.
   *
   * IDENTITY, not appearance: it says WHICH school this kit is, in the one
   * vocabulary the other 29,466 schools share. It exists so the national finder
   * can hide the roster row for a school that already has an authored kit, and so
   * `/s/<roster-slug>` redirects to the authored slug instead of serving a second,
   * thinner page for the same school. Absent on a kit whose roster row could not
   * be matched by hand; the kit still works, it is just reachable under two URLs.
   */
  rosterId?: string;
  /**
   * Further roster rows that are the SAME school — a campus the federal data lists
   * separately (New Trier's Northfield freshman campus). They join exactly like
   * `rosterId`: their roster slugs redirect here and the finder hides them, so a
   * parent never lands on a second, thinner page for one school.
   */
  campusRosterIds?: readonly string[];
  schoolName: string;
  /** What banners and copy call it — "Kirkwood", not the full legal name. */
  shortName: string;
  mascot: string;
  city: string;
  /** Frame body / behind-badge field / rim-override colors, #RRGGBB. */
  colors: { frame: string; tileField: string | null; rim: string | null };
  /**
   * Banner seeds. The frame reads, top to bottom (owner, 2026-09-23 — the old
   * "HOME OF THE" top runner over a crowded bottom banner "looks squished"):
   *
   *     top runner     the SCHOOL — `top`, e.g. "EUREKA HIGH SCHOOL"
   *     bottom banner  "HOME OF THE" — `tagline`, default `KIT_BOTTOM_TAGLINE`
   *                    the MASCOT — `bottom`, e.g. "WILDCATS"
   *
   * `tagline` is optional because it is the same three words on every kit; set
   * it only to say something different on purpose. On the shipping frame the
   * tagline sits in the keystone tab, ABOVE the bar's headline, so the bottom
   * reads as one phrase.
   *
   * `bg` is OPTIONAL and defaults to the badge field colour: they are one
   * background as far as anyone looking at the frame is concerned, and two
   * independent fields let a kit disagree with itself. It did — SLUH shipped
   * with banners a shade off its own tiles, which is what the mismatch reported
   * on desktop turned out to be. Set it only to say something different on
   * purpose.
   */
  banners: { top: string; bottom: string; tagline?: string; bg?: string; text: string };
  /** Builder font family string for the banner faces. Absent = house default. */
  fontFamily?: string;
  /** Parent-facing welcome above the builder: the "they did their homework"
   *  layer. Every line is school-specific and research-sourced — a wrong fact
   *  here costs more trust than the section earns, so facts only. */
  welcome?: {
    headline: string;
    message: string[];
    /** Activity chips — what the school is actually known for, each one a
     *  one-tap control that builds that activity's frame. ACTIVITIES only: a
     *  tradition ("Battle of 109", "Mayor's Bowl") has no badge and goes in
     *  `message`. See `chipPiece`. */
    chips: string[];
    ordering: string;
  };
  /**
   * FOUR badges that are true of this school, most distinctive first.
   *
   * This is what makes a kit's frame that school's rather than a generic one, and
   * it is the whole per-school layout input: `data/kit-seed.ts` walks the active
   * geometry's own side column and lands these badges on it, alternating with the
   * school's marks. A kit therefore names no slot ids at all — it used to, and
   * those ids were tied to one geometry, so the flush fork silently dropped them
   * (see kit-seed.ts). Add a school, get a finished frame on every variant.
   *
   * The SELECTION is the homework, per the copy rule below: a school known for
   * racquetball gets racquetball, not football. Ids come from `data/activities`.
   */
  signature?: string[];
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
    rosterId: "291677000926",
    schoolName: "Kirkwood High School",
    shortName: "Kirkwood",
    mascot: "Pioneers",
    city: "Kirkwood, MO",
    colors: { frame: "#BF1D3B", tileField: "#BF1D3B", rim: "#FFFFFF" },
    banners: { top: "KIRKWOOD HIGH SCHOOL", bottom: "PIONEERS", text: "#FFFFFF" },
    // "PIONEERS" vanity mockup, generated from the SLUH plate photo via Gemini
    // image editing (scripts/gen-plate.mjs) so every school's plate is the same
    // photograph with new embossing. Conformed to the same 924x467 framing the
    // plate-images.ts scale is tuned against.
    plate: { state: "MO", src: "/plates/missouri-pioneers-centered.jpg" },
    // Second pass 2026-10-11: football (Turkey Day, the Frisco Bell), the Kirkwood
    // Call and the yearbook are sourced; service stays as the one non-claiming badge.
    signature: ["hs:football-patch", "hs:journalism", "hs:yearbook", "hs:service"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/kirkwood-pioneers/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Pioneer families.",
      message: [
        "On Thanksgiving the Pioneers play Webster Groves for the Frisco Bell, a rivalry that began in 1907, and The Kirkwood Call has won national Pacemaker awards.",
        "You can add the things your student does as badges and their class year to the banner, all in red and white.",
      ],
      chips: ["Football", "Journalism", "Yearbook"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Kirkwood.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/kirkwood-pioneers/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/kirkwood-pioneers/mascot.png",
      badges: [{ key: "mascot", name: "Pioneers", artworkUrl: "/kits/kirkwood-pioneers/mascot.png", emoji: "🧭", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's own seal and athletics K (khs.kirkwoodschools.org, KirkwoodHighSchoolPrimaryLogoImage.png + KHSPioneerAthleticsfavicon.png): red #BF1D3B (51.3% of the seal; the K reads #C62737), with white. The website's #C8102E is the Kirkwood district default and agrees in hue. Raster sources under 300 px; get the vector before a print run.",
  },
  {
    slug: "sluh-jr-bills",
    rosterId: "00751104",
    schoolName: "St. Louis University High School",
    shortName: "SLUH",
    mascot: "Jr. Bills",
    city: "St. Louis, MO",
    // Sampled from the official artwork itself (see colorSource) — not eyeballed.
    colors: { frame: "#183B67", tileField: "#183B67", rim: "#FFFFFF" },
    // The top runner is their wordmark's own spelling — full name, no "SCHOOL",
    // exactly as the official lockup writes it. (Default rule: prefer the full
    // school name on the top runner when it fits.)
    banners: { top: "ST. LOUIS UNIVERSITY HIGH", bottom: "JR. BILLS", text: "#FFFFFF" },
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
        "This frame is your student's. Their sport or club on the badges, their class year on the banner, all in SLUH blue.",
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
    // The four that make a frame read as SLUH's rather than any school's. Was a
    // hand-written map of live-grid slot ids; the flush fork does not have those
    // rows, so the layout is derived now (kit-seed.ts) and this is the input.
    // Racquetball and water polo lead on purpose — they are the ones a SLUH
    // parent notices we knew about.
    signature: ["hs:racquetball", "hs:water-polo", "hs:soccer-patch", "hs:robotics"],
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
    rosterId: "A9300536",
    schoolName: "MICDS",
    shortName: "MICDS",
    mascot: "Rams",
    city: "St. Louis, MO",
    colors: { frame: "#04463D", tileField: "#04463D", rim: "#BCBBB6" },
    banners: { top: "MICDS", bottom: "RAMS", text: "#FFFFFF" },
    // "RAMS" vanity mockup from the per-school plate pipeline (scripts/gen-plate.mjs).
    plate: { state: "MO", src: "/plates/missouri-rams-centered.jpg" },
    // Second pass 2026-10-11: all four sourced (sources.md) — lacrosse's state
    // titles, the 2026 Class 5 basketball title, field hockey and football.
    signature: ["hs:lacrosse", "hs:basketball-patch", "hs:field-hockey", "hs:football-patch"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/micds-rams/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Ram families.",
      message: [
        "MICDS boys lacrosse has won 14 state championships, and in 2026 the boys basketball team won the Class 5 state title.",
        "You can add the things your student does as badges and their class year to the banner, all in MICDS green.",
      ],
      chips: ["Lacrosse", "Basketball", "Field Hockey", "Football", "Track", "Robotics"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to MICDS.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/micds-rams/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/micds-rams/mascot.png",
      badges: [{ key: "mascot", name: "Rams", artworkUrl: "/kits/micds-rams/mascot.png", emoji: "🐏", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's own ram (micds.org, micds-ram.png): maroon #580F20 (63.1%), warm gray #BCBBB7 (17.2%); the school's site stylesheet carries red #D22229, forest green #04463D, maroon #581021 and warm gray #BCBBB6, matching the MICDS colour palette. Cardinal red and forest green are the school colours (Wikipedia). Get the vector ram from the brand kit before a print run.",
  },
  {
    slug: "cbc-cadets",
    schoolName: "Christian Brothers College High School",
    shortName: "CBC",
    mascot: "Cadets",
    city: "Town and Country, MO",
    colors: { frame: "#4E2683", tileField: "#4E2683", rim: "#C6B683" },
    banners: { top: "CBC HIGH SCHOOL", bottom: "CADETS", text: "#FFFFFF" },
    signature: ["hs:soccer-patch", "hs:football-patch", "hs:lacrosse", "hs:basketball-patch"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/cbc-cadets/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Cadet families.",
      message: [
        "CBC soccer is in the Missouri Sports Hall of Fame, and Cadet football has won Class 6 state titles.",
        "You can add the things your student does as badges and their class year to the banner, all in purple and Vegas gold.",
      ],
      chips: ["Soccer", "Football", "Lacrosse", "Basketball", "Theater"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to CBC.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/cbc-cadets/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/cbc-cadets/mascot.png",
      badges: [{ key: "mascot", name: "CBC", artworkUrl: "/kits/cbc-cadets/mascot.png", emoji: "🎖️", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's athletic CBC letters (Wikimedia Commons, Christian_brothers_hs_logo.png) and seal (cbchs.org): purple #4E2683 (65.4%), Vegas gold #C6B683 (31.2%). The school website's own theme carries purple #431777 and gold #867346, the same hues darker. Purple and Vegas gold are the school colours (Wikipedia). Raster source; get the vector before a print run.",
  },
  {
    slug: "de-smet-spartans",
    rosterId: "00751771",
    schoolName: "De Smet Jesuit High School",
    shortName: "De Smet",
    mascot: "Spartans",
    city: "Creve Coeur, MO",
    colors: { frame: "#751726", tileField: "#751726", rim: "#C5932E" },
    banners: { top: "DE SMET JESUIT", bottom: "SPARTANS", text: "#FFFFFF" },
    signature: ["hs:ice-hockey", "hs:basketball-patch", "hs:volleyball-patch", "hs:football-patch"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/de-smet-spartans/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Spartan families.",
      message: [
        "De Smet won the Class 6 basketball state title in 2026, and Spartan hockey has won the Mid-States Challenge Cup.",
        "You can add the things your student does as badges and their class year to the banner, all in maroon.",
      ],
      chips: ["Hockey", "Basketball", "Volleyball", "Football", "Journalism"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to De Smet.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/de-smet-spartans/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/de-smet-spartans/mascot.png",
      badges: [{ key: "mascot", name: "De Smet", artworkUrl: "/kits/de-smet-spartans/mascot.png", emoji: "🛡️", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's own shield (desmet.org header-logo-seal.svg, vector) and athletics helmet: maroon #751726 (43.5% of the shield), gold #C5932E (shield rim; the helmet reads #D29B00). The school website's theme is maroon #661321 / gold #E0A831. The named colours are maroon and white (Wikipedia); gold is the trim on every De Smet mark.",
  },
  {
    slug: "chaminade-red-devils",
    rosterId: "00751716",
    schoolName: "Chaminade College Preparatory School",
    shortName: "Chaminade",
    mascot: "Red Devils",
    city: "Creve Coeur, MO",
    colors: { frame: "#D62A1F", tileField: "#D62A1F", rim: "#FFFFFF" },
    banners: { top: "CHAMINADE COLLEGE PREP", bottom: "RED DEVILS", text: "#FFFFFF" },
    signature: ["hs:basketball-patch", "hs:lacrosse", "hs:ice-hockey", "hs:journalism"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/chaminade-red-devils/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Red Devil families.",
      message: [
        "Chaminade won its first state basketball title in 2009, and the Red Devils also field a club hockey team in the Mid-States league.",
        "You can add the things your student does as badges and their class year to the banner, all in cardinal and white.",
      ],
      chips: ["Basketball", "Lacrosse", "Hockey", "Journalism"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Chaminade.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/chaminade-red-devils/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/chaminade-red-devils/mascot.png",
      badges: [{ key: "mascot", name: "Chaminade", artworkUrl: "/kits/chaminade-red-devils/mascot.png", emoji: "😈", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's own seal (chaminade-stl.org school_seal.png, and the identical 1024 px copy on MaxPreps): red #EE3225 (35.3%), white (55.0%); the header logo agrees (#EE2D20). The frame takes that hue one step deeper, #D62A1F: at #EE3225 white lettering is under 4.5:1 and the badge enamel sits exactly between ivory and navy, so any colour correction would flip every badge. The school names its colour cardinal (Wikipedia; the paper is the Cardinal and White), which is deeper still, so confirm the print red with the school.",
  },
  {
    slug: "vianney-griffins",
    rosterId: "00752287",
    schoolName: "St. John Vianney High School",
    shortName: "Vianney",
    mascot: "Griffins",
    city: "Kirkwood, MO",
    colors: { frame: "#181818", tileField: "#181818", rim: "#FFC425" },
    banners: { top: "ST. JOHN VIANNEY", bottom: "GRIFFINS", text: "#FFFFFF" },
    signature: ["hs:volleyball-patch", "hs:chess", "hs:soccer-patch", "hs:baseball-patch"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/vianney-griffins/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Griffin families.",
      message: [
        "Vianney's Griffin was inspired by the griffin statues at the entrance to Tower Grove Park, and in 2026 the volleyball team brought home the program's 18th state title.",
        "You can add the things your student does as badges and their class year to the banner, all in black and gold.",
      ],
      chips: ["Volleyball", "Soccer", "Chess", "Baseball", "Hockey", "Football", "Esports"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Vianney.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/vianney-griffins/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/vianney-griffins/mascot.png",
      badges: [{ key: "mascot", name: "Griffins", artworkUrl: "/kits/vianney-griffins/mascot.png", emoji: "🦅", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's own Griffin V mark (StJohnVianneyHS_GriffinV_PMS123C_2ColorOptionA.gif, vianney.com) and header wordmark: gold #FFC324/#FFC424 and black. The gold is corroborated by the school website's theme colour #ffc425 and the file is named for PANTONE 123 C; the frame is the website's near-black #181818. Raster source; get the vector before a print run.",
  },
  {
    slug: "st-josephs-academy-angels",
    rosterId: "00751115",
    schoolName: "St. Joseph's Academy",
    shortName: "SJA",
    mascot: "Angels",
    city: "Frontenac, MO",
    colors: { frame: "#367730", tileField: "#367730", rim: "#FFFFFF" },
    banners: { top: "ST. JOSEPH'S ACADEMY", bottom: "ANGELS", text: "#FFFFFF" },
    signature: ["hs:tennis", "hs:robotics", "hs:field-hockey", "hs:basketball-patch"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/st-josephs-academy-angels/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Angel families.",
      message: [
        "SJA tennis has won 19 state titles, and JoeBotics was the first all-girls school team in Missouri to compete in FIRST robotics.",
        "You can add the things your student does as badges and their class year to the banner, all in green and white.",
      ],
      chips: ["Tennis", "Golf", "Soccer", "Volleyball", "Field Hockey", "Robotics", "Basketball", "Racquetball", "Dance", "Swim & Dive"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to SJA.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/st-josephs-academy-angels/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/st-josephs-academy-angels/mascot.png",
      badges: [{ key: "mascot", name: "SJA", artworkUrl: "/kits/st-josephs-academy-angels/mascot.png", emoji: "😇", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's own seal artwork: the vector seal on sja1840.org is filled #367730, which is also the website theme's main colour; the Wikimedia copy of the seal samples #3D8840. Green and white are the school's colours (MaxPreps, Wikipedia). Get the brand-guide value before a print run.",
  },
  {
    slug: "nerinx-hall-markers",
    schoolName: "Nerinx Hall High School",
    shortName: "Nerinx",
    mascot: "Markers",
    city: "Webster Groves, MO",
    colors: { frame: "#008274", tileField: "#008274", rim: "#FFFFFF" },
    banners: { top: "NERINX HALL", bottom: "MARKERS", text: "#FFFFFF" },
    signature: ["hs:drama", "hs:cross-country", "hs:soccer-patch", "hs:field-hockey"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/nerinx-hall-markers/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Marker families.",
      message: [
        "Nerinx has taught young women in Webster Groves since 1924, and the Markers won the Class 4 cross country state title in 2014.",
        "You can add the things your student does as badges and their class year to the banner, all in green and white.",
      ],
      chips: ["Theatre", "Cross Country", "Soccer", "Field Hockey", "Lacrosse", "Racquetball"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Nerinx.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/nerinx-hall-markers/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/nerinx-hall-markers/mascot.png",
      badges: [{ key: "mascot", name: "Nerinx", artworkUrl: "/kits/nerinx-hall-markers/mascot.png", emoji: "✝️", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's NH monogram (Wikipedia's copy of the logo): teal-green #008274 (99.3%). The school website's theme green is #058943, a truer green; the two do not agree, so confirm which green Nerinx treats as primary. Green and white are the school's colours (Wikipedia, MaxPreps).",
  },
  {
    slug: "cor-jesu-academy-chargers",
    rosterId: "00751738",
    schoolName: "Cor Jesu Academy",
    shortName: "Cor Jesu",
    mascot: "Chargers",
    city: "Affton, MO",
    colors: { frame: "#E10719", tileField: "#E10719", rim: "#710D28" },
    banners: { top: "COR JESU ACADEMY", bottom: "CHARGERS", text: "#FFFFFF" },
    signature: ["hs:racquetball", "hs:field-hockey", "hs:swim-dive", "hs:soccer-patch"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/cor-jesu-academy-chargers/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Charger families.",
      message: [
        "Cor Jesu racquetball has won four national championships, and every January the Chargers and SJA hold Funderwear, collecting undergarments for St. Patrick Center.",
        "You can add the things your student does as badges and their class year to the banner, all in red and white.",
      ],
      chips: ["Racquetball", "Field Hockey", "Swim & Dive", "Soccer", "Volleyball", "Lacrosse", "Basketball", "Choir"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Cor Jesu.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/cor-jesu-academy-chargers/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/cor-jesu-academy-chargers/mascot.png",
      badges: [{ key: "mascot", name: "Cor Jesu", artworkUrl: "/kits/cor-jesu-academy-chargers/mascot.png", emoji: "⚡", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's own vector artwork on corjesu.org: red #E10719 (heart mark, exact SVG fill) and maroon #710D28 (wordmark, exact SVG fill); the website theme uses #e10719 and #710327. Red and white are the school's named colours (Wikipedia, MaxPreps). Cor Jesu has a professional brand system, so ask for the guide before a print run.",
  },
  {
    slug: "incarnate-word-academy-red-knights",
    rosterId: "00751807",
    schoolName: "Incarnate Word Academy",
    shortName: "Incarnate Word",
    mascot: "Red Knights",
    city: "Bel-Nor, MO",
    colors: { frame: "#CA2530", tileField: "#CA2530", rim: "#EDBC22" },
    banners: { top: "INCARNATE WORD ACADEMY", bottom: "RED KNIGHTS", text: "#FFFFFF" },
    signature: ["hs:basketball-patch", "hs:esports", "hs:robotics", "hs:volleyball-patch"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/incarnate-word-academy-red-knights/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Red Knight families.",
      message: [
        "IWA basketball set the national record for girls high school basketball with 141 straight wins from 2020 to 2025, and won the Class 6 state title again in 2026.",
        "You can add the things your student does as badges and their class year to the banner, all in red and gold.",
      ],
      chips: ["Basketball", "Volleyball", "Soccer", "Track & Field", "Cross Country", "Swim & Dive", "Tennis", "Golf", "Robotics", "Esports"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Incarnate Word.",
    },
    // NO `marks` ON PURPOSE (2026-10-11): no usable Red Knight art exists online (the
    // only copy is a 319 px MaxPreps file). GENERIC_MARKS until the school sends one.
    status: "demo",
    colorSource: "MEASURED from the school's own header logo (Main_Logo.png, iwacademy.org): red #CA2530 and gold #EDBC22. The website theme variables are #9e1c20 / #e7cc23, darker and yellower, so the two do not match exactly; the logo ink is used. Wikipedia names the colours red and yellow. Raster source; get the vector before a print run.",
  },
  {
    slug: "webster-groves-statesmen",
    rosterId: "293153002197",
    schoolName: "Webster Groves High School",
    shortName: "Webster",
    mascot: "Statesmen",
    city: "Webster Groves, MO",
    colors: { frame: "#111111", tileField: "#111111", rim: "#E66C24" },
    banners: { top: "WEBSTER GROVES HIGH", bottom: "STATESMEN", text: "#FFFFFF" },
    signature: ["hs:football-patch", "hs:soccer-patch", "hs:basketball-patch", "hs:journalism"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/webster-groves-statesmen/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Statesmen families.",
      message: [
        "Every Thanksgiving the Statesmen play Kirkwood in the Turkey Day Game, and the winner takes home the Frisco Bell. The boys soccer team won state titles in 2014, 2015 and 2022.",
        "You can add the things your student does as badges and their class year to the banner, all in orange and black.",
      ],
      chips: ["Football", "Soccer", "Basketball", "Track & Field", "Golf", "Softball", "Marching Band", "Journalism"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Webster.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/webster-groves-statesmen/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/webster-groves-statesmen/mascot.png",
      badges: [{ key: "mascot", name: "Webster", artworkUrl: "/kits/webster-groves-statesmen/mascot.png", emoji: "🟧", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's WG athletic mark (Wikipedia/Commons Webster_Groves_WG.png): orange #E66C24 (56.0%), black (18.1%). The district website's --secondary-color #E36304 corroborates the orange; orange and black are the colour names (Wikipedia). Raster source; get the vector before a print run.",
  },
  {
    slug: "ladue-rams",
    rosterId: "291782000946",
    schoolName: "Ladue Horton Watkins High School",
    shortName: "Ladue",
    mascot: "Rams",
    city: "St. Louis, MO",
    colors: { frame: "#00599C", tileField: "#00599C", rim: "#FFFFFF" },
    banners: { top: "LADUE HORTON WATKINS", bottom: "RAMS", text: "#FFFFFF" },
    // The same "RAMS" vanity mockup MICDS wears (scripts/gen-plate.mjs) — a plate
    // that says the mascot instead of the other brand's FESTIVE.
    plate: { state: "MO", src: "/plates/missouri-rams-centered.jpg" },
    // Scholar Bowl leads Ladue's story (the welcome copy keeps it), but its badge
    // art is withheld until redrawn (WITHHELD_ART), so it is not on the frame.
    signature: ["hs:track", "hs:soccer-patch", "hs:football-patch", "hs:tennis"],
    // Welcome facts (voice pass 2026-09-23), each sourced: Scholar Bowl state titles
    // 2006-2021 (QBWiki "Ladue"; MSHSAA school championships page) and 2023
    // (ladueactivities.com, 2023-05-08); boys AND girls track Class 4 titles in May
    // 2024 (ladueactivities.com 2024-05-28; MileSplit); blue and white since 1952
    // (school history page, per colorSource).
    welcome: {
      headline: "Welcome, Ram families.",
      message: [
        "Ladue's Scholar Bowl team has been winning state championships since 2006, most recently in 2023, and in 2024 the boys and girls track teams both won Class 4 state titles. Blue and white have been the school's colors since 1952.",
        "You can add the things your student does as badges and their class year to the banner, all in Ladue blue.",
      ],
      chips: ["Scholar Bowl", "Band", "Soccer", "Track & Field", "Football", "Field Hockey", "Swim & Dive", "Tennis", "Basketball"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Ladue.",
    },
    // Official mark from the school's own website (sources: MySchoolFrame Pilot
    // Kit/school-brand/ladue-rams/sources.md). Owner's call, 2026-09-24: live on the
    // pilot builder for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/ladue-rams/mascot.png",
      badges: [{ key: "mascot", name: "Rams", artworkUrl: "/kits/ladue-rams/mascot.png", emoji: "🐏", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's own ram logo (lhwhs.ladueschools.net): blue #00599C (56.1%), white (42.6%). Blue and white have been the school's colours since 1952 (school history page). The school website's theme navy #003087 is darker than the logo blue, so confirm which blue the school treats as primary. No Ladue colour clears merrowThread's gap against white type as-is; the renderer now falls back to a deeper shade of the banner blue (a near-black navy keyline) before brass.",
  },
  {
    slug: "clayton-greyhounds",
    rosterId: "290972000275",
    schoolName: "Clayton High School",
    shortName: "Clayton",
    mascot: "Greyhounds",
    city: "Clayton, MO",
    colors: { frame: "#004A80", tileField: "#004A80", rim: "#F36C21" },
    banners: { top: "CLAYTON HIGH SCHOOL", bottom: "GREYHOUNDS", text: "#FFFFFF" },
    signature: ["hs:soccer-patch", "hs:journalism", "hs:debate", "hs:yearbook"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/clayton-greyhounds/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Greyhound families.",
      message: [
        "Clayton soccer won three state titles in three years: the girls in 2023 and 2025, and the boys in 2024. The Globe, the student newsmagazine, has won two national Brasler Prizes.",
        "You can add the things your student does as badges and their class year to the banner, all in blue and orange.",
      ],
      chips: ["Soccer", "Journalism", "Yearbook", "Speech & Debate", "Basketball", "Football", "Hockey", "Tennis", "Track & Field", "Orchestra"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Clayton.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/clayton-greyhounds/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/clayton-greyhounds/mascot.png",
      badges: [{ key: "mascot", name: "Greyhounds", artworkUrl: "/kits/clayton-greyhounds/mascot.png", emoji: "🐕", field: "navy" }],
    },
    status: "demo",
    colorSource: "From the school website's theme (chs.claytonschools.net, shared with the district site): blue #004A80, orange #F36C21. The greyhound mark measures the same hues (blue #336699, orange #FF9933) but is a web-palette GIF, so it confirms hue only; blue and orange are the colour names (Wikipedia). Get the athletic mark's vector before a print run.",
  },
  {
    slug: "lindbergh-flyers",
    rosterId: "291869001026",
    schoolName: "Lindbergh High School",
    shortName: "Lindbergh",
    mascot: "Flyers",
    city: "St. Louis, MO",
    colors: { frame: "#026637", tileField: "#026637", rim: "#FFD004" },
    banners: { top: "LINDBERGH HIGH SCHOOL", bottom: "FLYERS", text: "#FFFFFF" },
    signature: ["hs:marching-band", "hs:cross-country", "hs:tennis", "hs:golf"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/lindbergh-flyers/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Flyer families.",
      message: [
        "Lindbergh took its name from Charles Lindbergh in 1952, and that is when its students became the Flyers. The Spirit of St. Louis Marching Band has marched in the Rose Parade three times.",
        "You can add the things your student does as badges and their class year to the banner, all in green and gold.",
      ],
      chips: ["Marching Band", "Cross Country", "Tennis", "Golf", "Soccer", "Swim & Dive", "Journalism"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Lindbergh.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/lindbergh-flyers/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/lindbergh-flyers/mascot.png",
      badges: [{ key: "mascot", name: "Flyers", artworkUrl: "/kits/lindbergh-flyers/mascot.png", emoji: "✈️", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's own athletic mark (golhsflyers.net site logo, L + plane): green #026637 (39.0%), gold #FFD004 (22.2%). The school website's theme (#046A38 / #FBCD00) corroborates both within 4/255; green and gold date to the 1952 renaming (Wikipedia). Raster source; get the vector before a print run.",
  },
  {
    slug: "parkway-west-longhorns",
    rosterId: "292358001404",
    schoolName: "Parkway West High School",
    shortName: "Parkway West",
    mascot: "Longhorns",
    city: "Ballwin, MO",
    colors: { frame: "#5199CD", tileField: "#5199CD", rim: "#A40925" },
    // The top runner is the school's name run through the thin kit's banner fitter
    // (drop HIGH SCHOOL only when it does not fit), not a hand-trimmed "... HIGH".
    banners: { top: fitBanner("PARKWAY WEST HIGH SCHOOL"), bottom: "LONGHORNS", text: "#FFFFFF" },
    // "HORNS" vanity mockup from the per-school plate pipeline (scripts/gen-plate.mjs,
    // conformed to 924x467). Read letter by letter; letter PITCH measured even.
    plate: { state: "MO", src: "/plates/missouri-horns-centered.jpg" },
    // Scholar Bowl badge withheld until its art is redrawn (WITHHELD_ART).
    // WATER POLO is a real West program (MaxPreps, MSHSAA rosters) and the welcome
    // copy says so, but it is NOT a chip or a signature: its light-blue wave enamel
    // is nearly this #5199CD field, so the badge a chip would build read as a bare
    // gold outline. Put the chip back when the art has waves that hold on light blue.
    signature: ["hs:journalism", "hs:field-hockey", "hs:drama", "hs:band"],
    // Welcome facts (voice pass 2026-09-23), each sourced: the Pathfinder is West's
    // student news site (pwestpathfinder.com); field hockey and water polo are West
    // programs (MaxPreps team pages); red and Columbia blue are the named colours
    // (Wikipedia, MaxPreps; see colorSource).
    welcome: {
      headline: "Welcome, Longhorn families.",
      message: [
        "Parkway West students run their own news site, the Pathfinder, and the Longhorns field teams in everything from field hockey to water polo.",
        "You can add the things your student does as badges and their class year to the banner, all in West blue and red.",
      ],
      chips: ["Scholar Bowl", "Journalism", "Theatre", "Band", "Field Hockey", "Cross Country"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Parkway West.",
    },
    // Official mark from the school's own website (sources: MySchoolFrame Pilot
    // Kit/school-brand/parkway-west-longhorns/sources.md). Owner's call, 2026-09-24: live on the
    // pilot builder for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/parkway-west-longhorns/mascot.png",
      badges: [{ key: "mascot", name: "Longhorns", artworkUrl: "/kits/parkway-west-longhorns/mascot.png", emoji: "🐂", field: "navy" }],
    },
    status: "demo",
    colorSource: "Body is Parkway West's district-standard colour (Parkway Brand Standards: West = PANTONE 278 C; the school site's CSS carries its web value #8BB8E8), taken at the deeper blue the school's athletic W is actually filled with, #5199CD — the official 278 C is too pale for white type (2.1:1). That blue was MEASURED alongside the W's red outline #A40925 from the school's own marks (westhigh.parkwayschools.net wordmark; Bound athletic logo). White type on #5199CD is 3.2:1 — large-text only. Raster sources; get vectors before a print run.",
  },
  {
    slug: "parkway-central-colts",
    rosterId: "292358001379",
    schoolName: "Parkway Central High School",
    shortName: "Parkway Central",
    mascot: "Colts",
    city: "Chesterfield, MO",
    colors: { frame: "#AB1E38", tileField: "#AB1E38", rim: "#FFFFFF" },
    banners: { top: fitBanner("PARKWAY CENTRAL HIGH SCHOOL"), bottom: "COLTS", text: "#FFFFFF" },
    // "COLTS" vanity mockup from the per-school plate pipeline (scripts/gen-plate.mjs,
    // conformed to 924x467). Read letter by letter; letter PITCH measured even.
    plate: { state: "MO", src: "/plates/missouri-colts-centered.jpg" },
    signature: ["hs:swim-dive", "hs:debate", "hs:soccer-patch", "hs:journalism"],
    // Welcome facts (voice pass 2026-09-23), each sourced: established 1954, the
    // first high school built in the new Parkway district (Wikipedia "Parkway Central
    // High School"; alumni.parkwayschools.net History of Parkway); red, black and
    // white are the named colours (Wikipedia, MaxPreps; see colorSource).
    welcome: {
      headline: "Welcome, Colt families.",
      message: [
        "Parkway Central was founded in 1954 as the first high school built in the Parkway district, and its colors are red, black and white.",
        "You can add the things your student does as badges and their class year to the banner, all in Colt red.",
      ],
      chips: ["Swim & Dive", "Speech & Debate", "Scholar Bowl", "Soccer", "Water Polo", "Basketball", "Service"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Parkway Central.",
    },
    // Official mark from the school's own website (sources: MySchoolFrame Pilot
    // Kit/school-brand/parkway-central-colts/sources.md). Owner's call, 2026-09-24: live on the
    // pilot builder for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/parkway-central-colts/mascot.png",
      badges: [{ key: "mascot", name: "Colts", artworkUrl: "/kits/parkway-central-colts/mascot.png", emoji: "🐎", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's own COLTS wordmark (centralhigh.parkwayschools.net primary logo): red #AB1E38 (58.2%), grey #99A1A5 (37.8%). The district's standard colour for Central is PANTONE 485 C (web #DA291C, on the school site), a brighter red than the athletic mark. Black is a named school colour but is not on the current mark. 256px raster only; get the vector before print. Trim is WHITE by owner call (2026-09-23): the measured grey read as no border on red.",
  },
  {
    slug: "lafayette-lancers",
    rosterId: "292685001624",
    schoolName: "Lafayette High School",
    shortName: "Lafayette",
    mascot: "Lancers",
    city: "Wildwood, MO",
    colors: { frame: "#231F20", tileField: "#231F20", rim: "#FFCC00" },
    banners: { top: "LAFAYETTE HIGH SCHOOL", bottom: "LANCERS", text: "#FFFFFF" },
    // "LANCER" vanity mockup from the per-school plate pipeline (scripts/gen-plate.mjs,
    // conformed to 924x467). Read letter by letter; letter PITCH measured even.
    plate: { state: "MO", src: "/plates/missouri-lancer-centered.jpg" },
    signature: ["hs:volleyball-patch", "hs:marching-band", "hs:softball-patch", "hs:cross-country"],
    // Welcome facts (voice pass 2026-09-23), each sourced: the Lancer Regiment is the
    // marching band (lhs.band; Wikipedia); volleyball won six straight state titles
    // 2011-2016 and its ninth in 2024 (St. Louis American; stltoday 2024 Class 5
    // final); the 2024 Class 5 softball title on a walk-off home run (SI high
    // school; stltoday 2024-11-01; West Newsmagazine);
    // the Mayor's Bowl with Marquette every fall (lancerfeed.press 2024; MSHSAA
    // 8/25/2023 — its week varies, so no "finale" claim); the Battle of 109 with Eureka (SI; Wikipedia Suburban Conference).
    // No colour words: whether Lafayette says "black and gold" is still open (see
    // colorSource), and the welcome should not assert it before the school does.
    welcome: {
      headline: "Welcome, Lancer families.",
      message: [
        "The Lancer Regiment is Lafayette's marching band. The volleyball team won six straight state titles from 2011 to 2016 and its ninth in 2024, the softball team won the 2024 Class 5 state title on a walk-off home run, and every fall the Lancers meet Marquette in the Mayor's Bowl and Eureka in the Battle of 109.",
        "You can add the things your student does as badges and their class year to the banner.",
      ],
      chips: ["Volleyball", "Marching Band", "Softball", "Cross Country", "Wrestling", "Field Hockey", "Water Polo", "Service"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Lafayette.",
    },
    // Official mark from the school's own website (sources: MySchoolFrame Pilot
    // Kit/school-brand/lafayette-lancers/sources.md). Owner's call, 2026-09-24: live on the
    // pilot builder for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/lafayette-lancers/mascot.png",
      badges: [{ key: "mascot", name: "Lancers", artworkUrl: "/kits/lafayette-lancers/mascot.png", emoji: "🛡️", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED black #231F20 from the school's own logo (Rockwood SD, High_Lafayette_BW_Outline.png, lafayette.rsdmo.org), which is black and white only. Gold #FFCC00 is the school website's --secondary-color. It is not on the mark and matches Eureka's value exactly (possibly a shared district template), so confirm Lafayette's gold with the school. One source describes the palette as black and white, often accented with gold — check whether the school says 'black and gold' before print (the welcome copy deliberately names no colours until it does).",
  },
  {
    // Pilot school (2026-09-23). Researched the same way as the rest: Wikipedia,
    // MaxPreps, West Newsmagazine, the Post-Dispatch and the Wildcat Bands' own
    // site. Unsourced and deliberately left out: a 2000 basketball title (could not
    // confirm which team), the student-section name, publication names.
    slug: "eureka-wildcats",
    rosterId: "292685001621",
    schoolName: "Eureka High School",
    shortName: "Eureka",
    mascot: "Wildcats",
    city: "Eureka, MO",
    colors: { frame: "#462E8D", tileField: "#462E8D", rim: "#FFCC00" },
    banners: { top: "EUREKA HIGH SCHOOL", bottom: "WILDCATS", text: "#FFFFFF" },
    // "WLDCTS" vanity mockup from the per-school plate pipeline (scripts/gen-plate.mjs,
    // conformed to 924x467). Read letter by letter; letter PITCH measured even.
    plate: { state: "MO", src: "/plates/missouri-wldcts-centered.jpg" },
    signature: ["hs:volleyball-patch", "hs:marching-band", "hs:cross-country", "hs:lacrosse"],
    // Welcome facts (voice pass 2026-09-23), each sourced: opened 1908, the first
    // high school in what became Rockwood (Wikipedia "Eureka High School (Missouri)");
    // the Battle of 109 with Lafayette (SI; Wikipedia Suburban Conference); first
    // volleyball state title 2018 (West Newsmagazine 2018-11-13); first girls cross
    // country title 2024 (MileSplit / SI 2024 Class 5); girls lacrosse state titles
    // 2024 and 2026 (Metro Sports STL 2024-05-28; stltoday 2026). The "more than 500
    // music students" line was dropped: no source could be found for it.
    welcome: {
      headline: "Welcome, Wildcat families.",
      message: [
        "Eureka opened in 1908 as the first high school in what became the Rockwood School District, and its game with Lafayette is known as the Battle of 109. The volleyball team won its first state title in 2018, the girls cross country team won its first in 2024, and girls lacrosse won state titles in 2024 and 2026.",
        "You can add the things your student does as badges and their class year to the banner, all in purple and gold.",
      ],
      chips: ["Volleyball", "Marching Band", "Orchestra", "Choir", "Jazz Band", "Color Guard", "Cross Country", "Lacrosse", "Football"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Eureka.",
    },
    // Official mark from the school's own website (sources: MySchoolFrame Pilot
    // Kit/school-brand/eureka-wildcats/sources.md). Owner's call, 2026-09-24: live on the
    // pilot builder for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/eureka-wildcats/mascot.png",
      badges: [{ key: "mascot", name: "Wildcats", artworkUrl: "/kits/eureka-wildcats/mascot.png", emoji: "🐾", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's own logo (Rockwood SD, High_Eureka_Color_Outline.png, eurekahs.rsdmo.org): purple #462E8D (83.7%), gold #FFCC00 (15.3%). The gold is corroborated exactly by the school website's --secondary-color #FFCC00. The site's primary #4B09A1 is a web-theme purple; we use the ink on the mark. Raster source; get the vector before a print run.",
  },
  {
    slug: "marquette-mustangs",
    rosterId: "292685000657",
    schoolName: "Marquette High School",
    shortName: "Marquette",
    mascot: "Mustangs",
    city: "Chesterfield, MO",
    colors: { frame: "#0D293F", tileField: "#0D293F", rim: "#068950" },
    banners: { top: "MARQUETTE HIGH SCHOOL", bottom: "MUSTANGS", text: "#FFFFFF" },
    // "STANGS" vanity mockup from the per-school plate pipeline (scripts/gen-plate.mjs,
    // conformed to 924x467). Read letter by letter; letter PITCH measured even.
    plate: { state: "MO", src: "/plates/missouri-stangs-centered.jpg" },
    signature: ["hs:ice-hockey", "hs:journalism", "hs:softball-patch", "hs:field-hockey"],
    // Welcome facts (voice pass 2026-09-23), each sourced: Marquette fields an ice
    // hockey team (MaxPreps: boys club hockey); the Mayor's Bowl with Lafayette is
    // played every fall (lancerfeed.press 2024, where it was both teams' finale;
    // MSHSAA lists it on 8/25/2023, week one, so "closes the season" is NOT claimed). The "Homecoming
    // carnival" line was dropped: no source could be found for it.
    welcome: {
      headline: "Welcome, Mustang families.",
      message: [
        "Marquette fields its own ice hockey team, and every fall the Mustangs meet Lafayette in the Mayor's Bowl.",
        "You can add the things your student does as badges and their class year to the banner, all in navy and green.",
      ],
      // "Model UN" withdrawn 2026-09-23: its badge art (a gridded globe in an
      // olive wreath) reads as the United Nations emblem, whose commercial use is
      // restricted. Put it back when the art is redrawn without the wreath.
      chips: ["Hockey", "Journalism", "Band", "Robotics", "Softball", "Field Hockey", "Dance"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Marquette.",
    },
    // Official mark from the school's own website (sources: MySchoolFrame Pilot
    // Kit/school-brand/marquette-mustangs/sources.md). Owner's call, 2026-09-24: live on the
    // pilot builder for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/marquette-mustangs/mascot.png",
      badges: [{ key: "mascot", name: "Mustangs", artworkUrl: "/kits/marquette-mustangs/mascot.png", emoji: "🐎", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's own logo (Rockwood SD, High_Marquette_Color.png, marquette.rsdmo.org) by sampling decoded pixels: navy #0D293F (51.6%), green #068950 (18.5%). The school website's theme colours are the Rockwood district default, so no published hex corroborates them. Raster source; get the vector before a print run.",
  },
  {
    slug: "john-burroughs-bombers",
    schoolName: "John Burroughs School",
    shortName: "Burroughs",
    mascot: "Bombers",
    city: "Ladue, MO",
    colors: { frame: "#005B8F", tileField: "#005B8F", rim: "#FFC240" },
    banners: { top: "JOHN BURROUGHS SCHOOL", bottom: "BOMBERS", text: "#FFFFFF" },
    signature: ["hs:football-patch", "hs:field-hockey", "hs:baseball-patch", "hs:drama"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/john-burroughs-bombers/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Bomber families.",
      message: [
        "Every fall Blue & Gold Weekend brings a pep rally, a bonfire and the Bombers against MICDS, a rivalry that goes back to the 1920s. Bomber football has won nine state titles and is in the Missouri Sports Hall of Fame.",
        "You can add the things your student does as badges and their class year to the banner, all in blue and gold.",
      ],
      chips: ["Football", "Field Hockey", "Baseball", "Theatre", "Dance"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Burroughs.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/john-burroughs-bombers/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/john-burroughs-bombers/mascot.png",
      badges: [{ key: "mascot", name: "Burroughs", artworkUrl: "/kits/john-burroughs-bombers/mascot.png", emoji: "💙", field: "navy" }],
    },
    status: "demo",
    colorSource: "From the school's own website theme (jburroughs.org main.css): blue #005B8F, gold #FFC240. The JBS athletic letters (MaxPreps GIF) show the same blue-and-gold hues but in web-palette values, so they confirm hue only; blue and gold are the colour names (Wikipedia, Blue & Gold Weekend). Ask the school for its athletic mark and PMS values.",
  },
  {
    slug: "saint-louis-priory-ravens",
    rosterId: "00751975",
    schoolName: "Saint Louis Priory School",
    shortName: "Priory",
    mascot: "Ravens",
    city: "Creve Coeur, MO",
    colors: { frame: "#0D2345", tileField: "#0D2345", rim: "#F8C815" },
    banners: { top: "SAINT LOUIS PRIORY", bottom: "RAVENS", text: "#FFFFFF" },
    signature: ["hs:soccer-patch", "hs:ice-hockey", "hs:robotics", "hs:journalism"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/saint-louis-priory-ravens/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Raven families.",
      message: [
        "Priory opened in 1956, started by Benedictine monks from Ampleforth Abbey in England. Its soccer teams won state titles in 2005 and 2011 without losing a game, and the hockey team has won the Wickenheiser Cup four times.",
        "You can add the things your student does as badges and their class year to the banner, all in the colors of the Priory crest.",
      ],
      chips: ["Soccer", "Hockey", "Golf", "Lacrosse", "Robotics", "Journalism", "Yearbook"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Priory.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/saint-louis-priory-ravens/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/saint-louis-priory-ravens/mascot.png",
      badges: [{ key: "mascot", name: "Priory", artworkUrl: "/kits/saint-louis-priory-ravens/mascot.png", emoji: "🛡️", field: "navy" }],
    },
    status: "demo",
    colorSource: "Taken from the fills of the school's own vector logo (priory.org stl-logo.svg): navy #0D2345, red #BA1F32, gold #F8C815; the website's theme navy #0B2245 corroborates the navy. Red and blue are the school's named colours (Wikipedia); the gold rim comes from the crest.",
  },
  {
    slug: "whitfield-warriors",
    rosterId: "00755867",
    schoolName: "Whitfield School",
    shortName: "Whitfield",
    mascot: "Warriors",
    city: "Creve Coeur, MO",
    colors: { frame: "#286142", tileField: "#286142", rim: "#FFFFFF" },
    banners: { top: "WHITFIELD SCHOOL", bottom: "WARRIORS", text: "#FFFFFF" },
    signature: ["hs:soccer-patch", "hs:wrestling", "hs:dance", "hs:basketball-patch"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/whitfield-warriors/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Warrior families.",
      message: [
        "Whitfield soccer has won state titles for both its teams, the boys most recently in 2021 and the girls in 2022, and the wrestling team won its 11th state title in 2022.",
        "You can add the things your student does as badges and their class year to the banner, all in green and white.",
      ],
      chips: ["Soccer", "Wrestling", "Dance", "Basketball", "Golf", "Yearbook"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Whitfield.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/whitfield-warriors/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/whitfield-warriors/mascot.png",
      badges: [{ key: "mascot", name: "Warriors", artworkUrl: "/kits/whitfield-warriors/mascot.png", emoji: "⚔️", field: "navy" }],
    },
    status: "demo",
    colorSource: "Taken from the fills of the school's own vector wordmark (whitfieldschool.org, TheWhitfieldSchool_logo.svg): green #286142; the header variant is #266041. Green and white are the school's colours (Wikipedia). The athletic shield (MaxPreps GIF) matches the hue but is web-palette, so it confirms hue only.",
  },
  {
    slug: "fort-zumwalt-west-jaguars",
    rosterId: "290837002624",
    schoolName: "Fort Zumwalt West High School",
    shortName: "FZ West",
    mascot: "Jaguars",
    city: "O'Fallon, MO",
    colors: { frame: "#6A2A78", tileField: "#6A2A78", rim: "#A7A9AC" },
    banners: { top: "FORT ZUMWALT WEST", bottom: "JAGUARS", text: "#FFFFFF" },
    signature: ["hs:dance", "hs:soccer-patch", "hs:marching-band", "hs:football-patch"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/fort-zumwalt-west-jaguars/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Jaguar families.",
      message: [
        "Fort Zumwalt West's girls soccer team won the school's first state title in 2007, and the dance team, first at the UDA national championship in 2009, took silver in hip hop in 2016.",
        "You can add the things your student does as badges and their class year to the banner, all in purple, silver and black.",
      ],
      chips: ["Dance", "Soccer", "Marching Band", "Football", "Wrestling", "Basketball", "Baseball"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to FZ West.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/fort-zumwalt-west-jaguars/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/fort-zumwalt-west-jaguars/mascot.png",
      badges: [{ key: "mascot", name: "FZ West", artworkUrl: "/kits/fort-zumwalt-west-jaguars/mascot.png", emoji: "🐆", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's own athletic W (Fort Zumwalt SD, West_High1.png, www.fz.k12.mo.us/o/whs): purple #6A2A78 (61.7%), black (25.7%). The purple is corroborated by the school website's --secondary-color #6A2B78. Silver is a named school colour (MSHSAA) but is not on the mark; the rim #A7A9AC is our approximation of it. Raster source; get the vector before a print run.",
  },
  {
    slug: "mehlville-panthers",
    rosterId: "292067001115",
    schoolName: "Mehlville High School",
    shortName: "Mehlville",
    mascot: "Panthers",
    city: "Mehlville, MO",
    colors: { frame: "#00703C", tileField: "#00703C", rim: "#040707" },
    banners: { top: "MEHLVILLE HIGH SCHOOL", bottom: "PANTHERS", text: "#FFFFFF" },
    signature: ["hs:football-patch", "hs:journalism", "hs:wrestling", "hs:drama"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/mehlville-panthers/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Panther families.",
      message: [
        "Every Mehlville senior gets a paw print to paint on the path to Jack Jordan Stadium, and the Green Pit student section is there to cheer the Panthers on.",
        "You can add the things your student does as badges and their class year to the banner, all in green, white and black.",
      ],
      chips: ["Football", "Journalism", "Wrestling", "Theatre", "Basketball", "Soccer", "Track"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Mehlville.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/mehlville-panthers/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/mehlville-panthers/mascot.png",
      badges: [{ key: "mascot", name: "Panthers", artworkUrl: "/kits/mehlville-panthers/mascot.png", emoji: "🐾", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's own panther medallion (Mehlville SD, MHS_new.png, mhs.mehlvilleschooldistrict.com): green #00703C (20.5%), black #040707 (56.0%). The green is corroborated exactly by the school website's --secondary-color #00703C. Black is the school's third colour (green, white and black). Raster source, and the medallion is small (460 px); get the vector before a print run.",
  },
  {
    slug: "oakville-tigers",
    rosterId: "292067001118",
    schoolName: "Oakville High School",
    shortName: "Oakville",
    mascot: "Tigers",
    city: "Oakville, MO",
    colors: { frame: "#231F20", tileField: "#231F20", rim: "#DEB406" },
    banners: { top: "OAKVILLE HIGH SCHOOL", bottom: "TIGERS", text: "#FFFFFF" },
    signature: ["hs:water-polo", "hs:soccer-patch", "hs:field-hockey", "hs:volleyball-patch"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/oakville-tigers/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Tiger families.",
      message: [
        "Oakville's girls water polo team won the state championship in 2022, in only its second season.",
        "You can add the things your student does as badges and their class year to the banner, all in black and gold.",
      ],
      chips: ["Water Polo", "Soccer", "Field Hockey", "Volleyball", "Softball", "Wrestling", "Swim & Dive", "Football", "Speech & Debate"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Oakville.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/oakville-tigers/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/oakville-tigers/mascot.png",
      badges: [{ key: "mascot", name: "Tigers", artworkUrl: "/kits/oakville-tigers/mascot.png", emoji: "🐯", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's own tiger medallion (Mehlville SD, OHS_new.png, ohs.mehlvilleschooldistrict.com): black (49.6%), gold #DEB406 (26.5%). The gold is corroborated by the school website's --secondary-color #DEB407; the frame black #231F20 is the site's --primary-color (shared with Mehlville). Raster source, and the medallion is small (457 px); get the vector before a print run.",
  },
  {
    slug: "pattonville-pirates",
    rosterId: "292370001421",
    schoolName: "Pattonville High School",
    shortName: "Pattonville",
    mascot: "Pirates",
    city: "Maryland Heights, MO",
    colors: { frame: "#035E2C", tileField: "#035E2C", rim: "#020202" },
    banners: { top: "PATTONVILLE HIGH SCHOOL", bottom: "PIRATES", text: "#FFFFFF" },
    signature: ["hs:robotics", "hs:dance", "hs:marching-band", "hs:jazz-band"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/pattonville-pirates/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Pirate families.",
      message: [
        "Homecoming at Pattonville brings the annual parade of themed floats, and at halftime the drill team gives its traditional homecoming performance.",
        "You can add the things your student does as badges and their class year to the banner, all in green and white.",
      ],
      chips: ["Robotics", "Marching Band", "Dance", "Color Guard", "Jazz Band", "Journalism", "Cheer", "Football", "Baseball", "Softball"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Pattonville.",
    },
    // Official mark from the school's own artwork (sources: MySchoolFrame Pilot
    // Kit/school-brand/pattonville-pirates/sources.md). Owner's call, 2026-10-11: live on the
    // St. Louis builders for Bill's demos; taken down the day the school objects.
    marks: {
      crest: "/kits/pattonville-pirates/mascot.png",
      badges: [{ key: "mascot", name: "Pirates", artworkUrl: "/kits/pattonville-pirates/mascot.png", emoji: "🏴‍☠️", field: "navy" }],
    },
    status: "demo",
    colorSource: "MEASURED from the school's own Pirate Pete (Pattonville SD, PiratePete2015FullColor.png, phs.psdr3.org): green #035E2C (9.6%, the bandana), black #020202 (62.9%). The website's --primary-color #007336 is the Pattonville district default and is brighter; confirm which green the school treats as primary. Black is the mark's outline, used as the thread because white cannot read against white lettering.",
  },
  {
    slug: "francis-howell-vikings",
    rosterId: "292895001860",
    schoolName: "Francis Howell High School",
    shortName: "Francis Howell",
    mascot: "Vikings",
    city: "St. Charles, MO",
    colors: { frame: "#003777", tileField: "#003777", rim: "#F0BF01" },
    banners: { top: "FRANCIS HOWELL", bottom: "VIKINGS", text: "#FFFFFF" },
    signature: ["hs:wrestling", "hs:football-patch", "hs:ice-hockey", "hs:marching-band"],
    // Welcome facts (2026-10-11), each sourced in MySchoolFrame Pilot Kit/
    // school-brand/francis-howell-vikings/sources.md; anything unsourced was dropped.
    welcome: {
      headline: "Welcome, Viking families.",
      message: [
        "Francis Howell's wrestling team won the school's first state championship of any kind in 1982, and the football team went 14-0 to win its first state title in 2022.",
        "You can add the things your student does as badges and their class year to the banner, all in blue and gold.",
      ],
      chips: ["Football", "Wrestling", "Hockey", "Marching Band"],
      ordering:
        "When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to Francis Howell.",
    },
    // NO `marks` ON PURPOSE (2026-10-11): the school's Viking head is visually the
    // Minnesota Vikings "Norseman" logo, recoloured. We do not print an NFL mark on a
    // product we sell; the frame uses GENERIC_MARKS until the school supplies its own.
    status: "demo",
    colorSource: "MEASURED gold #F0BF01 (38.1%) from the school's own Viking logo (FHSD, FrancisHowellHighSchool.gif, fhhs.fhsdschools.org); blue #003777 is the school website's own theme colour (francisHowellHighSchool.css), since the mark's navy is only a 5.6% helmet band. Blue and gold are the colours named in the FHHS student handbook. Raster GIF source; get the vector before a print run.",
  },
  // The second metro, in its own file (data/kits/chicagoland.ts).
  ...CHICAGOLAND_KITS,
];

const BY_SLUG = new Map(KITS.map((k) => [k.slug, k]));

/** Welcome-chip label -> badge piece for the preset engine. Read it through
 *  `chipPiece`; a label with no entry here is not rendered as a chip. */
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
  lacrosse: "hs:lacrosse",
  wrestling: "hs:wrestling",
  "ice hockey": "hs:ice-hockey",
  hockey: "hs:ice-hockey",
  "field hockey": "hs:field-hockey",
  "cross country": "hs:cross-country",
  gymnastics: "hs:gymnastics",
  bowling: "hs:bowling",
  dance: "hs:dance",
  esports: "hs:esports",
  orchestra: "hs:orchestra",
  choir: "hs:choir",
  journalism: "hs:journalism",
  newspaper: "hs:journalism",
  "quiz bowl": "hs:quiz-bowl",
  rotc: "hs:rotc",
  service: "hs:service",
  "student council": "hs:gavel",
  "student government": "hs:gavel",
  "water polo": "hs:water-polo",
  rugby: "hs:rugby",
  "swim & dive": "hs:swim-dive",
  "swim and dive": "hs:swim-dive",
  swimming: "hs:swim-dive",
  diving: "hs:swim-dive",
  "honor roll": "hs:honor-star",
  "honor society": "hs:honor-star",
  // What schools call quiz bowl in St. Louis; the same buzzer and the same badge.
  "scholar bowl": "hs:quiz-bowl",
  "track & field": "hs:track",
  "track and field": "hs:track",
  theatre: "hs:drama",
  science: "hs:science",
  // What Illinois families call it. Search and research may say it; a chip never
  // does — it is Science Olympiad, Inc.'s name (chicagoland.test.ts).
  "science olympiad": "hs:science",
  // IHSA's name for quiz bowl. Its art is withheld, so these chips stay hidden
  // until the redraw — the mapping is ready for that day.
  "scholastic bowl": "hs:quiz-bowl",
  yearbook: "hs:yearbook",
  photography: "hs:photography",
  chess: "hs:chess",
  "art club": "hs:art-club",
  art: "hs:art-club",
  // Speech has no badge of its own: the debate pin is a lectern and a microphone,
  // which is what a speech event actually looks like.
  speech: "hs:debate",
  "speech and debate": "hs:debate",
  "speech & debate": "hs:debate",
  debate: "hs:debate",
  crew: "hs:crew",
  rowing: "hs:crew",
  sailing: "hs:sailing",
  ski: "hs:ski",
  skiing: "hs:ski",
  snowboarding: "hs:ski",
  weightlifting: "hs:weightlifting",
  powerlifting: "hs:weightlifting",
  "jazz band": "hs:jazz-band",
  jazz: "hs:jazz-band",
  "color guard": "hs:color-guard",
  "colour guard": "hs:color-guard",
  "winter guard": "hs:color-guard",
  film: "hs:film",
  video: "hs:film",
  "film club": "hs:film",
  ceramics: "hs:ceramics",
  pottery: "hs:ceramics",
  culinary: "hs:culinary",
  cooking: "hs:culinary",
  "model un": "hs:model-un",
  "model united nations": "hs:model-un",
  "campus ministry": "hs:campus-ministry",
  "youth ministry": "hs:campus-ministry",
  // GENERIC STAND-INS, deliberately. FFA and the Scouts' fleur-de-lis are other
  // organisations' registered marks — the same reason DECA, FBLA, NHS and Mu Alpha
  // Theta were withdrawn from the library. A school still finds its activity by
  // name; what it gets is a sheaf of wheat and a compass rose, which are nobody's.
  ffa: "hs:agriculture",
  agriculture: "hs:agriculture",
  "future farmers": "hs:agriculture",
  scouts: "hs:scouts",
  scouting: "hs:scouts",
  // Same rule, 2026-09-27: HOSA and DECA/FBLA find generic badges, never their marks.
  hosa: "hs:health",
  "health sciences": "hs:health",
  "health occupations": "hs:health",
  deca: "hs:business",
  fbla: "hs:business",
  business: "hs:business",
  "flag football": "hs:flag-football",
  "girls flag football": "hs:flag-football",
  pom: "hs:pom",
  "pom squad": "hs:pom",
  "pom team": "hs:pom",
  "stage crew": "hs:stage-crew",
  "theatre tech": "hs:stage-crew",
  "theater tech": "hs:stage-crew",
  "math team": "hs:math",
  mathletes: "hs:math",
  "mu alpha theta": "hs:math",
  coding: "hs:coding",
  "computer science": "hs:coding",
  "bass fishing": "hs:bass-fishing",
  fishing: "hs:bass-fishing",
  "unified sports": "hs:inclusive",
  unified: "hs:inclusive",
  "key club": "hs:service",
  "show choir": "hs:choir",
};

/**
 * The badge a welcome chip builds, or null when the label names no activity we
 * have a badge for.
 *
 * A chip is a CONTROL ("Tap an activity and we'll build the frame around it"), so
 * a chip that builds nothing of its own is a broken promise: "Battle of 109" used to fall back to the generic
 * crest, and a parent who tapped it saw no sign of what they tapped. Such labels
 * are traditions, not activities, and belong in the welcome copy. The kit page
 * renders only chips this resolves; school-kits.chips.test.ts holds every pilot
 * kit to having no others.
 */
export function chipPiece(label: string): string | null {
  const id = CHIP_PRESET_PIECE[label.trim().toLowerCase()] ?? null;
  // A chip whose badge art is withheld builds nothing we will show, so it is not
  // a chip until the art is redrawn: the kit page hides it, the research stays.
  return id && !WITHHELD_ART.has(id) ? id : null;
}

export function getSchoolKit(slug: string): SchoolKit | undefined {
  return BY_SLUG.get(slug);
}

export function allSchoolKits(): readonly SchoolKit[] {
  return KITS;
}

/** The kit's section seeds — SCHOOL_DEFAULT_SECTIONS wearing this school. */
/**
 * The STATE whose plate this school's frame should open showing.
 *
 * The builder's plate was hard-coded to Missouri, so a school in Texas opened on
 * a Missouri plate — a mockup of a car that could not be in its parking lot. Read
 * off the kit's own `city` ("St. Louis, MO"), so it costs a school nothing: there
 * is no new field to fill in and no per-school step, which is the standing rule
 * for anything national.
 *
 * Returns null when the city carries no usable state, and the caller keeps its
 * own default rather than guessing.
 */
export function kitPlateState(kit: SchoolKit | undefined | null): string | null {
  const abbr = /,\s*([A-Za-z]{2})\s*$/.exec(kit?.city ?? "")?.[1]?.toUpperCase();
  if (!abbr) return null;
  return getPlateDesign(abbr) ? abbr : null;
}

/**
 * The school builder's own stock plate per state, for a kit with no vanity plate.
 *
 * The shared stock Missouri photo (plate-images.ts) reads FESTIVE — Festive
 * Frames' name — and a school with no plate of its own fell through to it, so
 * five of six pilot builders showed the other brand's word as the biggest thing
 * on screen. A MySchoolFrame preview must never do that. Missouri's is a real
 * photographed plate with its number privacy-blurred (scripts/stock-plate.mjs),
 * in the same 924x467 framing, so plate-images' MO display fits it unchanged.
 * Other states' stock photos are standard-issue plates and need no override.
 */
export const SCHOOL_STOCK_PLATES: Readonly<Record<string, string>> = {
  MO: "/plates/missouri-stock-centered.jpg",
};

/**
 * The plate photo a school frame's PREVIEW shows for `state`: the kit's own
 * vanity plate while the picker is on the state that photo is (Ladue's RAMS),
 * else the school stock plate for that state, else undefined — the caller's
 * generic stock photo. The builder and the sample sheets both ask this, so they
 * cannot disagree about which plate a school gets.
 */
export function schoolPlatePhoto(kit: SchoolKit | undefined | null, state: string): string | undefined {
  if (kit?.plate && kit.plate.state === state) return kit.plate.src;
  return SCHOOL_STOCK_PLATES[state];
}

/**
 * The words over the mascot on the bottom banner, for every kit that does not say
 * otherwise. One constant rather than 27 copies: it is not a fact about a school,
 * it is the frame's own phrase ("HOME OF THE / WILDCATS").
 */
export const KIT_BOTTOM_TAGLINE = "HOME OF THE";

export function kitSections(kit: SchoolKit): Partial<Record<SectionId, SectionState>> {
  const font = kit.fontFamily ?? SCHOOL_HEADLINE_FONT;
  // One background colour for the whole frame unless a kit deliberately overrides.
  const bg = kit.banners.bg ?? kit.colors.tileField ?? kit.colors.frame;
  return {
    top: {
      mode: "text",
      text: {
        ...DEFAULT_BOTTOM_BAR,
        // The school, as the kit spells it. Set in the TAGLINE face on purpose:
        // the school's name is also what the keystone line says on a design
        // whose top was promoted, and one name in two typefaces on one sheet
        // read as two different schools. The condensed face is also what lets
        // "LADUE HORTON WATKINS" sit on a 0.75" runner at a size you can read.
        text: kit.banners.top,
        fontFamily: SCHOOL_TAGLINE_FONT,
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
        tagline: kit.banners.tagline ?? KIT_BOTTOM_TAGLINE,
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
