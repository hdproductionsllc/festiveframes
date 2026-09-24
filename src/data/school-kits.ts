import type { SectionId, SectionState } from "@/lib/types";
import { getPlateDesign } from "@/data/plates";
import { WITHHELD_ART } from "@/data/sets/high-school";
import { fitBanner } from "@/data/thin-kit";
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
    colors: { frame: "#7A0E1F", tileField: "#7A0E1F", rim: "#FFFFFF" },
    banners: { top: "KIRKWOOD HIGH SCHOOL", bottom: "PIONEERS", text: "#FFFFFF" },
    // "PIONEERS" vanity mockup, generated from the SLUH plate photo via Gemini
    // image editing (scripts/gen-plate.mjs) so every school's plate is the same
    // photograph with new embossing. Conformed to the same 924x467 framing the
    // plate-images.ts scale is tuned against.
    plate: { state: "MO", src: "/plates/missouri-pioneers-centered.jpg" },
    // PARTLY RESEARCHED — needs a second pass. Only football (the Turkey Day game
    // against Webster Groves, and the Frisco Bell) and the Kirkwood Call are
    // sourced. The last two are deliberately NON-CLAIMING: honor roll and service
    // are true of every school, so they assert nothing about Kirkwood we have not
    // checked. Do not "improve" them by guessing at programmes.
    signature: ["hs:football-patch", "hs:journalism", "hs:honor-star", "hs:service"],
    status: "demo",
    colorSource: "red/white per MSHSAA + athletics site; shade approx (#C8102E family, deepened for the frame body) — confirm with KHS before print",
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
    // PARTLY RESEARCHED — needs a second pass. Lacrosse and football are sourced
    // only INDIRECTLY, through other schools' records (the 2025 MSLA Class 2 final
    // against CBC; the 2018 football final against Ladue). The last two are
    // deliberately non-claiming, as with Kirkwood.
    signature: ["hs:lacrosse", "hs:football-patch", "hs:honor-star", "hs:service"],
    status: "demo",
    colorSource: "OFFICIAL — MICDS Color Palette PDF (red #D12229, forest green #04463D, warm gray #BCBBB6). Demo until brand office authorizes use.",
  },
  {
    slug: "cbc-cadets",
    schoolName: "Christian Brothers College High School",
    shortName: "CBC",
    mascot: "Cadets",
    city: "Town and Country, MO",
    colors: { frame: "#5B2B82", tileField: "#5B2B82", rim: "#C5B358" },
    banners: { top: "CBC HIGH SCHOOL", bottom: "CADETS", text: "#FFFFFF" },
    signature: ["hs:football-patch", "hs:basketball-patch", "hs:lacrosse", "hs:wrestling"],
    welcome: {
      headline: "For the families who fill the purple side of the stands.",
      message: [
        "Every Cadet family knows the rhythm — fall Fridays under the lights, a winter that belongs to the gym and the wrestling room, and a spring where half the school is on a field somewhere because nobody gets cut.",
        "This frame is your student's. Their sport or their club on the badges, their class year on the banner, all in purple and gold.",
      ],
      chips: ["Football", "Basketball", "Wrestling", "Lacrosse", "Racquetball", "Rugby", "Robotics", "Cadet Student Network", "The Guidon", "Service"],
      ordering:
        "CBC families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to CBC.",
    },
    status: "demo",
    colorSource: "Purple and Vegas gold are confirmed as the colour NAMES (Wikipedia infobox, MaxPreps); both hex values are our approximations and are NOT from CBC — confirm before print.",
  },
  {
    slug: "de-smet-spartans",
    rosterId: "00751771",
    schoolName: "De Smet Jesuit High School",
    shortName: "De Smet",
    mascot: "Spartans",
    city: "Creve Coeur, MO",
    colors: { frame: "#7A1F2E", tileField: "#7A1F2E", rim: "#FFFFFF" },
    banners: { top: "DE SMET JESUIT", bottom: "SPARTANS", text: "#FFFFFF" },
    signature: ["hs:ice-hockey", "hs:football-patch", "hs:basketball-patch", "hs:volleyball-patch"],
    welcome: {
      headline: "Built for Spartan Country — the rink, the stands and the drive home.",
      message: [
        "You already know which nights are non-negotiable. The rink in February, a Friday in the fall, a gym in March. Same families, same seats, same drive back across New Ballas.",
        "This frame is your student's. Their sport or their club on the badges, their class year on the banner, all in maroon.",
      ],
      chips: ["Hockey", "Football", "Basketball", "Volleyball", "Rugby", "Robotics", "Spartan Spectacular", "Men's Club", "Lacrosse", "Service"],
      ordering:
        "De Smet families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to De Smet.",
    },
    status: "demo",
    colorSource: "Maroon and white are confirmed as the colour NAMES (Wikipedia infobox, spirit store); the maroon hex is our approximation and is NOT from De Smet — confirm before print.",
  },
  {
    slug: "chaminade-red-devils",
    rosterId: "00751716",
    schoolName: "Chaminade College Preparatory School",
    shortName: "Chaminade",
    mascot: "Red Devils",
    city: "Creve Coeur, MO",
    colors: { frame: "#C8102E", tileField: "#C8102E", rim: "#FFFFFF" },
    banners: { top: "CHAMINADE COLLEGE PREP", bottom: "RED DEVILS", text: "#FFFFFF" },
    signature: ["hs:basketball-patch", "hs:ice-hockey", "hs:soccer-patch", "hs:journalism"],
    welcome: {
      headline: "Cardinal and white, for the families who drive to every one of them.",
      message: [
        "Some winters here you plan around a gym, and some you plan around a sheet of ice. Either way the Red Devils section is loud and your car is in the lot.",
        "This frame is your student's. Their sport or their club on the badges, their class year on the banner, all in cardinal and white.",
      ],
      chips: ["Basketball", "Ice Hockey", "Soccer", "Cardinal & White", "Robotics", "Model U.N.", "Drama", "Band", "House System", "Service"],
      ordering:
        "Chaminade families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to Chaminade.",
    },
    status: "demo",
    colorSource: "Cardinal and white are confirmed as the colour NAMES (the school paper is the Cardinal & White; MaxPreps agrees); the red hex is our approximation and is NOT from Chaminade — confirm before print.",
  },
  {
    slug: "vianney-griffins",
    rosterId: "00752287",
    schoolName: "St. John Vianney High School",
    shortName: "Vianney",
    mascot: "Griffins",
    city: "Kirkwood, MO",
    colors: { frame: "#101010", tileField: "#101010", rim: "#FFC72C" },
    banners: { top: "ST. JOHN VIANNEY", bottom: "GRIFFINS", text: "#FFFFFF" },
    signature: ["hs:volleyball-patch", "hs:chess", "hs:soccer-patch", "hs:baseball-patch"],
    welcome: {
      headline: "Black and gold, for the families who go to everything.",
      message: [
        "At Vianney the trophy case argues with itself. Volleyball has owned more springs than anyone wants to count, the soccer banners go back decades, and the chess team has come home from nationals with a title — which is a very Griffin way to win something.",
        "This frame is your student's. Their sport or their club on the badges, their class year on the banner, in the Griffin's own colors.",
      ],
      chips: ["Volleyball", "Soccer", "Baseball", "Ice Hockey", "Wrestling", "Chess", "Football", "Racquetball", "Bowling", "Lacrosse"],
      ordering:
        "Vianney families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to Vianney.",
    },
    status: "demo",
    colorSource: "Black and gold are confirmed (the school's mascot page ties the colours to the Griffin); the gold hex is our approximation and the black is lifted off pure black for print — confirm both before print.",
  },
  {
    slug: "st-josephs-academy-angels",
    rosterId: "00751115",
    schoolName: "St. Joseph's Academy",
    shortName: "SJA",
    mascot: "Angels",
    city: "Frontenac, MO",
    colors: { frame: "#00843D", tileField: "#00843D", rim: "#FFFFFF" },
    banners: { top: "ST. JOSEPH'S ACADEMY", bottom: "ANGELS", text: "#FFFFFF" },
    signature: ["hs:basketball-patch", "hs:field-hockey", "hs:robotics", "hs:tennis"],
    welcome: {
      headline: "Not I, But We — including the carpool line.",
      message: [
        "Green and white, and the same three letters on every carpool sign. Whether your Angel is on the field hockey turf, in the JoeBotics build space, or waiting on a call time, the drive there and back is most of what you will remember about these four years.",
        "This frame is your student's. Her sport or her club on the badges, her class year on the banner, all in Angels green.",
      ],
      chips: ["Basketball", "Field Hockey", "JoeBotics", "Tennis", "Swim & Dive", "Cross Country", "Lacrosse", "Campus Ministry", "Theatre", "Service"],
      ordering:
        "SJA families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to SJA.",
    },
    status: "demo",
    colorSource: "Green and white are confirmed as the colour NAMES (MaxPreps, school profiles); the green hex is our approximation and is NOT from SJA — confirm before print.",
  },
  {
    slug: "nerinx-hall-markers",
    schoolName: "Nerinx Hall High School",
    shortName: "Nerinx",
    mascot: "Markers",
    city: "Webster Groves, MO",
    colors: { frame: "#1E5631", tileField: "#1E5631", rim: "#FFFFFF" },
    banners: { top: "NERINX HALL", bottom: "MARKERS", text: "#FFFFFF" },
    signature: ["hs:soccer-patch", "hs:drama", "hs:field-hockey", "hs:service"],
    welcome: {
      headline: "Green and white, from Hey Day to graduation.",
      message: [
        "From the day the seniors hand over the beanies you are a Marker family — and Marker families drive. To Heagney for the fall play, out to the turf, back down Lockwood again.",
        "This frame is your student's. Her sport or her club on the badges, her class year on the banner, all in Nerinx green.",
      ],
      chips: ["Soccer", "Field Hockey", "Lacrosse", "Heagney Theatre", "Hey Day", "Service Learning", "Cross Country", "Hallways", "The Key", "A Cappella"],
      ordering:
        "Nerinx families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to Nerinx.",
    },
    status: "demo",
    colorSource: "Green and white are confirmed as the colour NAMES (MaxPreps, MascotDB; the Spirit Shop describes its embroidery as forest green); the green hex is our approximation — confirm before print.",
  },
  {
    slug: "cor-jesu-academy-chargers",
    rosterId: "00751738",
    schoolName: "Cor Jesu Academy",
    shortName: "Cor Jesu",
    mascot: "Chargers",
    city: "Affton, MO",
    colors: { frame: "#C8102E", tileField: "#C8102E", rim: "#FFFFFF" },
    banners: { top: "COR JESU ACADEMY", bottom: "CHARGERS", text: "#FFFFFF" },
    signature: ["hs:soccer-patch", "hs:swim-dive", "hs:service", "hs:track"],
    welcome: {
      headline: "Shine bright. Be brilliant. Drive accordingly.",
      message: [
        "Chargers — and anyone who has sat through a Funderwear pep rally waiting on the Pants Trophy knows better than to add a word in front of it. First Fridays, spirit week, and a lot of miles down Gravois.",
        "This frame is your student's. Her sport or her club on the badges, her class year on the banner, all in Charger red.",
      ],
      chips: ["Soccer", "Swim & Dive", "Track & Field", "Dance Team", "Funderwear", "Penny Queen", "Corde Players", "Chamber Choir", "The Corette", "Service"],
      ordering:
        "Cor Jesu families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to Cor Jesu.",
    },
    status: "demo",
    colorSource: "Red and white are confirmed as the colour NAMES (MaxPreps, spiritwear, the Atomicdust rebrand write-up); the red hex is our approximation. Cor Jesu has a professional brand system, so an exact value almost certainly exists — ask for it.",
  },
  {
    slug: "incarnate-word-academy-red-knights",
    rosterId: "00751807",
    schoolName: "Incarnate Word Academy",
    shortName: "Incarnate Word",
    mascot: "Red Knights",
    city: "Bel-Nor, MO",
    colors: { frame: "#C8102E", tileField: "#C8102E", rim: "#FFC72C" },
    banners: { top: "INCARNATE WORD ACADEMY", bottom: "RED KNIGHTS", text: "#FFFFFF" },
    signature: ["hs:basketball-patch", "hs:esports", "hs:robotics", "hs:volleyball-patch"],
    welcome: {
      headline: "For the families who fill the Red Knights' side of the gym.",
      message: [
        "Red and gold, and a gym that has been standing room only for years now. Whether your Red Knight is out on that floor, in the STEM lab, or on a late bus back from a meet, you are the one driving her there.",
        "This frame is your student's. Her sport or her club on the badges, her class year on the banner, in red and gold.",
      ],
      chips: ["Basketball", "Volleyball", "Soccer", "Track & Field", "Cross Country", "Swim & Dive", "Tennis", "Golf", "STEM Lab", "Esports"],
      ordering:
        "Incarnate Word families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to Incarnate Word.",
    },
    status: "demo",
    colorSource: "Red and gold are confirmed as the colour NAMES (MaxPreps, MascotDB); both hex values are our approximations. The gold is the risky one — athletic golds run brassy to near-yellow and the difference shows in print.",
  },
  {
    slug: "webster-groves-statesmen",
    rosterId: "293153002197",
    schoolName: "Webster Groves High School",
    shortName: "Webster",
    mascot: "Statesmen",
    city: "Webster Groves, MO",
    colors: { frame: "#E87722", tileField: "#E87722", rim: "#111111" },
    banners: { top: "WEBSTER GROVES HIGH", bottom: "STATESMEN", text: "#FFFFFF" },
    signature: ["hs:football-patch", "hs:basketball-patch", "hs:journalism", "hs:track"],
    welcome: {
      headline: "Statesmen families — orange and black, on the back of the car.",
      message: [
        "In Webster the season has a finish line everybody already knows the date of. The Bell goes home with somebody on Thanksgiving morning, and the rest of the year — the gym in March, the track in May, a show in the new theater — gets talked about in the same breath.",
        "This frame is your student's. Their sport or their club on the badges, their class year on the banner, all in orange and black.",
      ],
      chips: ["Football", "Basketball", "Track & Field", "Cross Country", "Marching Band", "Orchestra", "Theater", "The Echo", "Wrestling", "Turkey Day"],
      ordering:
        "Webster families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to Webster.",
    },
    status: "demo",
    colorSource: "Orange and black are confirmed as the colour NAMES (district spirit store, MSHSAA); neither hex is published, so both are our approximations — confirm before print.",
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
    colors: { frame: "#00529B", tileField: "#00529B", rim: "#F58220" },
    banners: { top: "CLAYTON HIGH SCHOOL", bottom: "GREYHOUNDS", text: "#FFFFFF" },
    signature: ["hs:journalism", "hs:soccer-patch", "hs:debate", "hs:yearbook"],
    welcome: {
      headline: "Greyhound families — something to put the whole four years on.",
      message: [
        "There is a stone globe out front and a Globe that comes out of the newsroom, and at Clayton it is an even bet which one a graduate talks about first. Lately the soccer fields have given everyone something to shout about too.",
        "This frame is your student's. Their sport or their paper on the badges, their class year on the banner, in Clayton blue and orange.",
      ],
      chips: ["The Globe", "Yearbook", "Speech & Debate", "Mock Trial", "Soccer", "Field Hockey", "Basketball", "Tennis", "Track & Field", "Cross Country"],
      ordering:
        "Clayton families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to Clayton.",
    },
    status: "demo",
    colorSource: "Royal blue and orange are official (MSHSAA, district); no published hex was reachable, so both values are our approximations — confirm before print.",
  },
  {
    slug: "lindbergh-flyers",
    rosterId: "291869001026",
    schoolName: "Lindbergh High School",
    shortName: "Lindbergh",
    mascot: "Flyers",
    city: "St. Louis, MO",
    colors: { frame: "#006341", tileField: "#006341", rim: "#FFC425" },
    banners: { top: "LINDBERGH HIGH SCHOOL", bottom: "FLYERS", text: "#FFFFFF" },
    signature: ["hs:marching-band", "hs:cross-country", "hs:volleyball-patch", "hs:tennis"],
    welcome: {
      headline: "Flyers families — green and gold, right where everyone can see it.",
      message: [
        "At Lindbergh the band is not the warm-up act. The Spirit of St. Louis comes down Concord School Road at Homecoming and up the sideline on Friday nights, and Lindy works the crowd in his goggles.",
        "This frame is your student's. Their sport or their instrument on the badges, their class year on the banner, all in green and gold.",
      ],
      chips: ["Marching Band", "Color Guard", "Cross Country", "Volleyball", "Wrestling", "Tennis", "Swim & Dive", "Golf", "Softball", "Homecoming Parade"],
      ordering:
        "Lindbergh families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to Lindbergh.",
    },
    status: "demo",
    colorSource: "Green and gold are official and dated — adopted in 1952 when Grandview became Lindbergh, per the district history. Neither hex is published; both values are our approximations.",
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
    colors: { frame: "#00205B", tileField: "#00205B", rim: "#C9A227" },
    banners: { top: "JOHN BURROUGHS SCHOOL", bottom: "BOMBERS", text: "#FFFFFF" },
    signature: ["hs:field-hockey", "hs:football-patch", "hs:soccer-patch", "hs:honor-star"],
    welcome: {
      headline: "Blue and gold, all the way out to the parking lot.",
      message: [
        "Every year the grades put on their assigned colors, the Class Cup gets loud, and the week ends with the bonfire out on Field 4. Burroughs is a small school that takes its own traditions seriously, and parents learn the calendar fast.",
        "This frame is your student's. Their sport or their club on the badges, their class year on the banner, in blue and gold.",
      ],
      chips: ["Field Hockey", "Football", "Soccer", "Spirit Week", "Pep Rally & Bonfire", "Class Cup", "Student Government", "Cheerleading", "Theatre", "Service"],
      ordering:
        "Burroughs families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to Burroughs.",
    },
    status: "demo",
    colorSource: "Blue and gold are certain — the school's own Spirit Week is branded Blue & Gold; both hex values are our approximations of a navy and an old gold and are NOT from a brand guide.",
  },
  {
    slug: "saint-louis-priory-ravens",
    rosterId: "00751975",
    schoolName: "Saint Louis Priory School",
    shortName: "Priory",
    mascot: "Ravens",
    city: "Creve Coeur, MO",
    colors: { frame: "#002D62", tileField: "#002D62", rim: "#C8102E" },
    banners: { top: "SAINT LOUIS PRIORY", bottom: "RAVENS", text: "#FFFFFF" },
    signature: ["hs:ice-hockey", "hs:soccer-patch", "hs:robotics", "hs:journalism"],
    welcome: {
      headline: "A Raven for the car that makes every run down to campus.",
      message: [
        "The year starts in August at the Raven Roundup and the club fair, runs through the Junior School's Rusty Bucket, and lands at the Christmas Classic. Priory keeps its own calendar, in its own way, and parents pick it up quickly.",
        "This frame is your student's. His sport or his club on the badges, his class year on the banner.",
      ],
      chips: ["Hockey", "Soccer", "Robotics", "The Record", "Raven Roundup", "Rusty Bucket", "Christmas Classic", "Quiz Bowl", "Ultimate Frisbee", "Service"],
      ordering:
        "Priory families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to Priory.",
    },
    status: "demo",
    colorSource: "Red and blue are the colour NAMES from several secondary listings; both hex values are our approximations and even which is the body colour is unconfirmed — needs the school.",
  },
  {
    slug: "whitfield-warriors",
    rosterId: "00755867",
    schoolName: "Whitfield School",
    shortName: "Whitfield",
    mascot: "Warriors",
    city: "Creve Coeur, MO",
    colors: { frame: "#00703C", tileField: "#00703C", rim: "#FFFFFF" },
    banners: { top: "WHITFIELD SCHOOL", bottom: "WARRIORS", text: "#FFFFFF" },
    signature: ["hs:wrestling", "hs:soccer-patch", "hs:basketball-patch", "hs:esports"],
    welcome: {
      headline: "Green and white, and everybody knows whose car it is.",
      message: [
        "Whitfield is small on purpose, and it shows — advisory, assemblies, Spirit Week, and a gym whose banners are mostly soccer and wrestling. Parents here tend to know everybody's kid, not just their own.",
        "This frame is your student's. The season you actually sit through on the badges, their class year on the banner.",
      ],
      chips: ["Wrestling", "Soccer", "Basketball", "Esports", "Climbing Club", "Field Hockey", "Dance", "Spirit Week", "Advisory", "Service"],
      ordering:
        "Whitfield families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to Whitfield.",
    },
    status: "demo",
    colorSource: "Green and white are confirmed (Wikipedia, the school's own athletics branding); the green hex is our approximation. NOTE: white as a rim is the same-colour-edge case CLAUDE.md warns about if the body ever goes light — it is safe here only because the body is dark green.",
  },
  {
    slug: "fort-zumwalt-west-jaguars",
    rosterId: "290837002624",
    schoolName: "Fort Zumwalt West High School",
    shortName: "FZ West",
    mascot: "Jaguars",
    city: "O'Fallon, MO",
    colors: { frame: "#4B2E83", tileField: "#4B2E83", rim: "#A7A9AC" },
    banners: { top: "FORT ZUMWALT WEST", bottom: "JAGUARS", text: "#FFFFFF" },
    signature: ["hs:dance", "hs:marching-band", "hs:soccer-patch", "hs:football-patch"],
    welcome: {
      headline: "Purple and silver, parked where everybody can see it.",
      message: [
        "Friday nights out here sound like the Silver Jaguar Brigade coming up the track, and the dance team has the hardware to match. West is a big school that still turns out for its own — band, guard, the soccer field, the mat.",
        "This frame is your student's. The programme you actually sit for on the badges, their class year on the banner.",
      ],
      chips: ["Dance Team", "Marching Band", "Color Guard", "Winter Guard", "Soccer", "Football", "Wrestling", "Jazz Bands", "Homecoming Week", "Basketball"],
      ordering:
        "FZ West families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to FZ West.",
    },
    status: "demo",
    colorSource: "Purple, silver and black are confirmed as the colour NAMES (Wikipedia, spirit-wear listings); the purple and silver hex values are our approximations — no brand guide was reachable.",
  },
  {
    slug: "mehlville-panthers",
    rosterId: "292067001115",
    schoolName: "Mehlville High School",
    shortName: "Mehlville",
    mascot: "Panthers",
    city: "Mehlville, MO",
    colors: { frame: "#00703C", tileField: "#00703C", rim: "#FFFFFF" },
    banners: { top: "MEHLVILLE HIGH SCHOOL", bottom: "PANTHERS", text: "#FFFFFF" },
    signature: ["hs:football-patch", "hs:debate", "hs:drama", "hs:service"],
    welcome: {
      headline: "Every senior gets a paw print. This one you get to drive.",
      message: [
        "You know the walk — the painted path up to Jack Jordan Stadium, every paw print done up by somebody's kid, and the Green Pit already going before kickoff. Green and white is not a costume here, it is just what a Friday looks like.",
        "This frame is your student's. Their sport or their club on the badges, their class year on the banner.",
      ],
      chips: ["Football", "Speech & Debate", "Drama Club", "The Green Pit", "Senior Paw Prints", "Art Club", "Service"],
      ordering:
        "Mehlville families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to Mehlville.",
    },
    status: "demo",
    colorSource: "Green, white and black are confirmed as the colour NAMES (the student section is literally the Green Pit); neither hex is published, so both are our approximations. Black is the school's third colour and is the alternative rim if the green ever goes lighter.",
  },
  {
    slug: "oakville-tigers",
    rosterId: "292067001118",
    schoolName: "Oakville High School",
    shortName: "Oakville",
    mascot: "Tigers",
    city: "Oakville, MO",
    colors: { frame: "#101010", tileField: "#101010", rim: "#FFC72C" },
    banners: { top: "OAKVILLE HIGH SCHOOL", bottom: "TIGERS", text: "#FFFFFF" },
    signature: ["hs:water-polo", "hs:field-hockey", "hs:marching-band", "hs:football-patch"],
    welcome: {
      headline: "If you own the shirt, you know what Friday is.",
      message: [
        "The Cage has been doing this a long time now, and it still works the same way — black and gold on Friday, everybody in it, nobody sitting down. Whatever your kid plays, the pool and the turf and the field hockey pitch all get the same treatment.",
        "This frame is your student's. Their sport or their club on the badges, their class year on the banner.",
      ],
      chips: ["Water Polo", "Field Hockey", "Marching Band", "Color Guard", "Football", "The Tiger Cage", "Quiz Bowl", "Drama Troupe", "Robotics"],
      ordering:
        "Oakville families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to Oakville.",
    },
    status: "demo",
    colorSource: "Black and gold are confirmed by the school itself (the Tiger Cage runs Black-n-Gold days); the gold hex is our approximation and the black is lifted off pure black for print.",
  },
  {
    slug: "pattonville-pirates",
    rosterId: "292370001421",
    schoolName: "Pattonville High School",
    shortName: "Pattonville",
    mascot: "Pirates",
    city: "Maryland Heights, MO",
    colors: { frame: "#00693E", tileField: "#00693E", rim: "#FFFFFF" },
    banners: { top: "PATTONVILLE HIGH SCHOOL", bottom: "PIRATES", text: "#FFFFFF" },
    signature: ["hs:journalism", "hs:marching-band", "hs:robotics", "hs:football-patch"],
    welcome: {
      headline: "Pirates of all ages come out for this one.",
      message: [
        "The parade rolls in the morning, the floats match whatever theme they picked this year, and by halftime the drill team and the marching band have the field. Pattonville families tend to show up for all of it, not just the game.",
        "This frame is your student's. Their sport or their club on the badges, their class year on the banner, in green and white.",
      ],
      chips: ["Journalism", "Marching Band", "Robotics", "Drill Team", "Football", "Softball", "Girls Soccer", "Volleyball", "Homecoming Parade"],
      ordering:
        "Pattonville families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to Pattonville.",
    },
    status: "demo",
    colorSource: "Green and white are confirmed as the colour NAMES; no published hex was reachable, so the green is our approximation — and it must not be allowed to collide with the other green-and-white schools in this catalogue by accident.",
  },
  {
    slug: "francis-howell-vikings",
    rosterId: "292895001860",
    schoolName: "Francis Howell High School",
    shortName: "Francis Howell",
    mascot: "Vikings",
    city: "St. Charles, MO",
    colors: { frame: "#0033A0", tileField: "#0033A0", rim: "#FFC72C" },
    banners: { top: "FRANCIS HOWELL", bottom: "VIKINGS", text: "#FFFFFF" },
    signature: ["hs:football-patch", "hs:wrestling", "hs:honor-star", "hs:service"],
    welcome: {
      headline: "The 12th Man never did sit down.",
      message: [
        "Howell families already know what a season can turn into. The wrestling room made this district's first state champion of any kind long before anybody was watching, and the Friday night that ended in blue and gold confetti still comes up in line at the gas station.",
        "This frame is your student's. Their sport or their club on the badges, their class year on the banner, in royal and gold.",
      ],
      chips: ["Football", "Wrestling", "The 12th Man", "Victor the Viking", "Hockey", "Service"],
      ordering:
        "Francis Howell families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to Francis Howell.",
    },
    status: "demo",
    colorSource: "Royal and athletic gold are well corroborated as the colour NAMES (several independent spirit-wear retailers); both hex values are our rendering of those standard names, not published brand values.",
  },
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
