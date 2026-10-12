import type { SchoolKit } from "@/data/school-kits";

// ─── Chicagoland: the second metro (2026-10-11) ──────────────────────────────
//
// Thirty schools, North Shore first, then the strongest-identity schools across
// the north, northwest and west suburbs and the city's Catholic schools. Every
// kit is `status: "demo"` and NONE is in the pilot list (data/school-pilot.ts),
// so each /s/<slug> shows the "not ready yet" page until the owner opens it.
//
// Same rules as the St. Louis kits (school-kits.ts header):
//   - Welcome lines are FACTS with a source in the comment above the kit. A wrong
//     fact costs more trust than the section earns, so anything a source did not
//     show is left out rather than softened.
//   - Colours are MEASURED from the school's own artwork with
//     scripts/sample-brand-colors.mjs (logo files fetched 2026-10-11) and checked
//     against the school website's theme colours; `colorSource` says which.
//   - A kit carries appearance and identity only. Geometry is the variant's.
//
// Research notes, door ranking and the Illinois plate-law finding:
// tasks/chicagoland-outreach.md.

const ORDERING = (shortName: string) =>
  `When you're happy with your frame, send it to us and we'll follow up with ordering details. A set donation from every frame goes back to ${shortName}.`;

export const CHICAGOLAND_KITS: SchoolKit[] = [
  // ── North Shore ────────────────────────────────────────────────────────────
  {
    slug: "new-trier-trevians",
    // The Winnetka campus (grades 10-12). The Northfield freshman campus is its
    // own federal row; it is the same school, so it joins here too.
    rosterId: "172820002975",
    campusRosterIds: ["172820004263"],
    schoolName: "New Trier Township High School",
    shortName: "New Trier",
    mascot: "Trevians",
    city: "Winnetka, IL",
    colors: { frame: "#002855", tileField: "#002855", rim: "#A7A9AC" },
    banners: { top: "NEW TRIER", bottom: "TREVIANS", text: "#FFFFFF" },
    signature: ["hs:swim-dive", "hs:tennis", "hs:crew", "hs:jazz-band"],
    // Sources: IHSA team records — boys swimming 23 (incl. New Trier East), boys
    // tennis 21 (through 2025-26); Wikipedia — Frank Mantooth Jazz Festival, first
    // Saturday of February, since 1983; boys rowing national titles.
    welcome: {
      headline: "Welcome, Trevian families.",
      message: [
        "New Trier boys swimming and boys tennis have each won more than 20 IHSA state titles, and every February the school hosts the Frank Mantooth Jazz Festival.",
        "You can add the things your student does as badges and their class year to the banner, all in New Trier blue and grey.",
      ],
      chips: ["Swimming", "Tennis", "Rowing", "Jazz Band", "Science", "Golf", "Hockey", "Lacrosse", "Field Hockey", "Chess"],
      ordering: ORDERING("New Trier"),
    },
    status: "demo",
    colorSource:
      "Blue, green and grey are the school's named colours (Wikipedia). Values are the school website's own theme colours (newtrier.k12.il.us, 2026-10-11): navy #002855, grey #C1C6C8; green #2C5234 is too close to the navy to read as a rim, and the light grey cannot outline white lettering (merrowThread), so the rim is a deeper grey #A7A9AC. The district logo file was rate-limited and could not be measured — confirm before print.",
  },
  {
    slug: "evanston-wildkits",
    rosterId: "171449001804",
    schoolName: "Evanston Township High School",
    shortName: "ETHS",
    mascot: "Wildkits",
    city: "Evanston, IL",
    colors: { frame: "#0C2340", tileField: "#0C2340", rim: "#E35205" },
    banners: { top: "EVANSTON TOWNSHIP", bottom: "WILDKITS", text: "#FFFFFF" },
    signature: ["hs:track", "hs:debate", "hs:chess", "hs:swim-dive"],
    // Sources: Wikipedia "Evanston Township High School" — track titles boys 8 + girls 7; policy and
    // Lincoln-Douglas debate titles; chess x6; YAMO student show since 1957.
    welcome: {
      headline: "Welcome, Wildkit families.",
      message: [
        "Evanston's Wildkits have won 15 state titles in track and field, along with state championships in debate and chess, and YAMO, the student-run musical comedy show, has been on stage since 1957.",
        "You can add the things your student does as badges and their class year to the banner, all in ETHS orange and blue.",
      ],
      chips: ["Track & Field", "Speech & Debate", "Chess", "Swimming", "Theater", "Jazz Band", "Gymnastics", "Soccer", "Basketball", "Tennis"],
      ordering: ORDERING("ETHS"),
    },
    status: "demo",
    colorSource:
      "PUBLISHED Pantone: orange PMS 1665 and blue PMS 289 (Wikipedia). Values are Pantone's own sRGB for those inks: #0C2340, and orange #DC4405 nudged to #E35205 so it can outline white lettering on the navy (merrowThread) instead of falling back to brass. The school website's theme uses #1A2741 / #C34614, a near match. The site logo is a white reversed mark, so there was nothing to measure — confirm before print.",
  },
  {
    slug: "glenbrook-north-spartans",
    rosterId: "172901003042",
    schoolName: "Glenbrook North High School",
    shortName: "GBN",
    mascot: "Spartans",
    city: "Northbrook, IL",
    colors: { frame: "#02723E", tileField: "#02723E", rim: "#FFC610" },
    banners: { top: "GLENBROOK NORTH", bottom: "SPARTANS", text: "#FFFFFF" },
    signature: ["hs:debate", "hs:ice-hockey", "hs:golf", "hs:volleyball-patch"],
    // Sources: Wikipedia "Glenbrook North High School" — debate state champion 18
    // times since 1982; IHSA girls golf records — girls golf 2023, 2024, 2025; hockey x5; boys
    // volleyball 1993 and 2021.
    welcome: {
      headline: "Welcome, Spartan families.",
      message: [
        "Glenbrook North's debate team has won 18 state championships since 1982, and the girls golf team won three straight state titles from 2023 to 2025.",
        "You can add the things your student does as badges and their class year to the banner, all in Spartan green and gold.",
      ],
      chips: ["Speech & Debate", "Hockey", "Golf", "Volleyball", "Field Hockey", "Tennis", "Basketball", "Theater", "Band", "Soccer"],
      ordering: ORDERING("GBN"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's logo (Wikipedia file Glenbrook_North_High_School_Logo.webp): green #02723E (27.7%), gold #FFC610 (8.1%). The school website's theme uses #005B38 / #FECD08, a near match. Green and gold are the named colours.",
  },
  {
    slug: "glenbrook-south-titans",
    rosterId: "172901003043",
    schoolName: "Glenbrook South High School",
    shortName: "GBS",
    mascot: "Titans",
    city: "Glenview, IL",
    colors: { frame: "#013E7B", tileField: "#013E7B", rim: "#FFC531" },
    banners: { top: "GLENBROOK SOUTH", bottom: "TITANS", text: "#FFFFFF" },
    signature: ["hs:debate", "hs:field-hockey", "hs:volleyball-patch", "hs:basketball-patch"],
    // Sources: Wikipedia "Glenbrook South High School" — debate state titles 1973,
    // 1989, 2000, 2005, 2006, 2008 (six); boys volleyball 2003. (Field hockey's
    // 2023 title was a joint GBN+GBS team, so neither kit claims it.)
    welcome: {
      headline: "Welcome, Titan families.",
      message: [
        "Glenbrook South debaters have won six state championships, and Titans boys volleyball won the state title in 2003.",
        "You can add the things your student does as badges and their class year to the banner, all in Titan navy and gold.",
      ],
      chips: ["Speech & Debate", "Field Hockey", "Volleyball", "Basketball", "Lacrosse", "Golf", "Theater", "Orchestra", "Soccer", "Swimming"],
      ordering: ORDERING("GBS"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's logo (Wikipedia file Glenbrook_South_Logo.png): navy #013E7B (60.5%), gold #FFC531 (5.3%). The school website's theme navy is darker (#0C234B); confirm which navy the school prints. Navy and gold are the named colours.",
  },
  {
    slug: "highland-park-giants",
    rosterId: "171908002194",
    schoolName: "Highland Park High School",
    shortName: "Highland Park",
    mascot: "Giants",
    city: "Highland Park, IL",
    colors: { frame: "#012169", tileField: "#012169", rim: "#A7A9AC" },
    banners: { top: "HIGHLAND PARK HIGH SCHOOL", bottom: "GIANTS", text: "#FFFFFF" },
    signature: ["hs:golf", "hs:drama", "hs:band", "hs:tennis"],
    // Sources: Wikipedia "Highland Park High School (Illinois)" — student Charity
    // Drive every February since 1994, more than $3M raised as of 2016; boys golf
    // five state titles; state drama champion 1978.
    welcome: {
      headline: "Welcome, Giant families.",
      message: [
        "Every February since 1994, Highland Park students have run Charity Drive, their own fundraiser, and by 2016 it had raised more than $3 million.",
        "You can add the things your student does as badges and their class year to the banner, all in Giants blue and white.",
      ],
      chips: ["Golf", "Theater", "Band", "Speech & Debate", "Tennis", "Cross Country", "Soccer", "Basketball", "Swimming", "Orchestra"],
      ordering: ORDERING("Highland Park"),
    },
    status: "demo",
    colorSource:
      "Blue and white are the named colours (Wikipedia). Blue is the school website's theme primary #012169 (hphs.dist113.org); the district seal measures a darker #232C65. Confirm which blue the school prints. Rim is a neutral silver: white cannot outline white lettering, and the renderer would otherwise fall back to brass, which is not a Giants colour.",
  },
  {
    slug: "deerfield-warriors",
    rosterId: "171908002193",
    schoolName: "Deerfield High School",
    shortName: "Deerfield",
    mascot: "Warriors",
    city: "Deerfield, IL",
    colors: { frame: "#BA2126", tileField: "#BA2126", rim: "#A7A9AC" },
    banners: { top: "DEERFIELD HIGH SCHOOL", bottom: "WARRIORS", text: "#FFFFFF" },
    signature: ["hs:cross-country", "hs:tennis", "hs:gymnastics", "hs:drama"],
    // Sources: IHSA team records — boys cross country 1976 and 1977; boys tennis
    // 1984, 1995, 2005 and 2026 (1A).
    welcome: {
      headline: "Welcome, Warrior families.",
      message: [
        "Deerfield boys cross country won back-to-back state titles in 1976 and 1977, and boys tennis has won four state championships, most recently in 2026.",
        "You can add the things your student does as badges and their class year to the banner, all in Warrior red and grey.",
      ],
      chips: ["Cross Country", "Tennis", "Gymnastics", "Theater", "Football", "Soccer", "Lacrosse", "Band", "Orchestra", "Swimming"],
      ordering: ORDERING("Deerfield"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the district's Deerfield seal (DHSSeal.svg, dhs.dist113.org): red #BA2126 (38.2%), grey #DEDDDD (58.3%). The school website's theme red is #BB0000. Red and grey are the named colours; the rim is a deeper grey #A7A9AC because the seal's light grey cannot outline white lettering (merrowThread).",
  },
  {
    slug: "lake-forest-scouts",
    rosterId: "172178002452",
    schoolName: "Lake Forest High School",
    shortName: "Lake Forest",
    mascot: "Scouts",
    city: "Lake Forest, IL",
    colors: { frame: "#20409A", tileField: "#20409A", rim: "#FCD015" },
    banners: { top: "LAKE FOREST HIGH SCHOOL", bottom: "SCOUTS", text: "#FFFFFF" },
    signature: ["hs:dance", "hs:lacrosse", "hs:field-hockey", "hs:ice-hockey"],
    // Sources: The Forest Scout — dance 2A titles 2023 and 2024; IHSA boys lacrosse
    // records — 2024 and 2025. Route 176 rivalry with Libertyville (The Forest Scout).
    welcome: {
      headline: "Welcome, Scout families.",
      message: [
        "Lake Forest dance won back-to-back IHSA state championships in 2023 and 2024, and boys lacrosse did the same in 2024 and 2025.",
        "You can add the things your student does as badges and their class year to the banner, all in Scout blue and gold.",
      ],
      chips: ["Dance", "Lacrosse", "Field Hockey", "Hockey", "Soccer", "Football", "Tennis", "Theater", "Band", "Orchestra"],
      ordering: ORDERING("Lake Forest"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's own logo (lfhs.lakeforestschools.org, lfhsLogo7404-661.png): blue #20409A (50.9%), gold #FCD015 (47.3%). The school website's theme uses #003594 / #F4DA40. Royal blue and gold are the named colours.",
  },
  {
    slug: "stevenson-patriots",
    rosterId: "173258003385",
    schoolName: "Adlai E. Stevenson High School",
    shortName: "Stevenson",
    mascot: "Patriots",
    city: "Lincolnshire, IL",
    colors: { frame: "#1F5D39", tileField: "#1F5D39", rim: "#C99A2C" },
    banners: { top: "STEVENSON HIGH SCHOOL", bottom: "PATRIOTS", text: "#FFFFFF" },
    signature: ["hs:water-polo", "hs:chess", "hs:science", "hs:dance"],
    // Sources: Wikipedia "Stevenson High School (Lincolnshire, Illinois)" — girls
    // water polo 2015/17/18/19/23/24/25/26 (eight); Science Olympiad national
    // champions 2023; chess titles; Patriettes dance titles.
    welcome: {
      headline: "Welcome, Patriot families.",
      message: [
        "Stevenson girls water polo has won eight state titles since 2015, and in 2023 the Science Olympiad team was national champion.",
        "You can add the things your student does as badges and their class year to the banner, all in Patriot green and gold.",
      ],
      chips: ["Water Polo", "Chess", "Science", "Dance", "Speech & Debate", "Math Team", "Gymnastics", "Swimming", "Basketball", "Bowling"],
      ordering: ORDERING("Stevenson"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's logo (Wikipedia file Stevenson_High_School_logo_(as_of_2023).png): green #1F5D39 (78.0%), gold #C99A2C (17.9%). The district stylesheet's most-used colours are #275D38 and #F2C02A. Green and gold are the named colours.",
  },
  {
    slug: "libertyville-wildcats",
    rosterId: "172283002531",
    schoolName: "Libertyville High School",
    shortName: "Libertyville",
    mascot: "Wildcats",
    city: "Libertyville, IL",
    colors: { frame: "#101010", tileField: "#101010", rim: "#F96808" },
    banners: { top: "LIBERTYVILLE HIGH SCHOOL", bottom: "WILDCATS", text: "#FFFFFF" },
    signature: ["hs:band", "hs:soccer-patch", "hs:football-patch", "hs:cross-country"],
    // Sources: d128.org LHS band page — University of Illinois Superstate winner ten
    // times; Wikipedia "Libertyville High School" — football state title 2004.
    welcome: {
      headline: "Welcome, Wildcat families.",
      message: [
        "Libertyville's band has earned top honors at the University of Illinois SuperState festival ten times, and Wildcat football won the state championship in 2004.",
        "You can add the things your student does as badges and their class year to the banner, all in Wildcat orange and black.",
      ],
      chips: ["Band", "Soccer", "Football", "Cross Country", "Orchestra", "Choir", "Theater", "Basketball", "Volleyball", "Swimming"],
      ordering: ORDERING("Libertyville"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's Wildcat logo (lhswildcats.org, Wildcatlogo.png): orange #F96808 (10.1%), black (21.8%, set as the house black #101010 so the bevel reads). The site's orange is #F68E20. Orange and black are the named colours.",
  },
  {
    slug: "loyola-academy-ramblers",
    // Not in the federal private-school extract (like CBC): no roster row to join.
    schoolName: "Loyola Academy",
    shortName: "Loyola",
    mascot: "Ramblers",
    city: "Wilmette, IL",
    colors: { frame: "#7B0131", tileField: "#7B0131", rim: "#FBBB55" },
    banners: { top: "LOYOLA ACADEMY", bottom: "RAMBLERS", text: "#FFFFFF" },
    signature: ["hs:football-patch", "hs:lacrosse", "hs:water-polo", "hs:crew"],
    // Sources: goramblers.org news (2024 Class 8A, third straight title, 35-14 over
    // York); goramblers.org news (girls lacrosse 2026 IHSA title); Wikipedia
    // "Loyola Academy" — students from more than 80 zip codes; "Men and Women for
    // Others"; boys water polo 2014; rowing national champions 2017.
    welcome: {
      headline: "Welcome, Rambler families.",
      message: [
        "Loyola football won three straight state championships from 2022 to 2024, and in 2026 the girls lacrosse team won the IHSA title. Families come from more than 80 zip codes to be part of it.",
        "You can add the things your student does as badges and their class year to the banner, all in Loyola maroon and gold.",
      ],
      chips: ["Football", "Lacrosse", "Water Polo", "Rowing", "Swimming", "Basketball", "Campus Ministry", "Theater", "Orchestra", "Hockey"],
      ordering: ORDERING("Loyola"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's own header logo (loyolaacademy.static.amais.com/logo-541.png): maroon #7B0131 (75.9%), gold #FBBB55 (17.9%). These match the site's PUBLISHED theme variables almost exactly (goramblers.org style.css: --primary-color #7a003c, --secondary-color #fdbe57).",
  },
  {
    slug: "carmel-catholic-corsairs",
    // Not in the federal private-school extract: no roster row to join.
    schoolName: "Carmel Catholic High School",
    shortName: "Carmel",
    mascot: "Corsairs",
    city: "Mundelein, IL",
    colors: { frame: "#3C2415", tileField: "#3C2415", rim: "#EAA900" },
    banners: { top: "CARMEL CATHOLIC", bottom: "CORSAIRS", text: "#FFFFFF" },
    signature: ["hs:gymnastics", "hs:drama", "hs:soccer-patch", "hs:marching-band"],
    // Sources: Wikipedia "Carmel High School (Mundelein, Illinois)" — girls
    // gymnastics 1992, 1993, 2010, 2011, 2012 (five); carmelhs.org — Corsairs Care,
    // the all-school 5K walk at Mundelein Seminary (47th in 2026).
    welcome: {
      headline: "Welcome, Corsair families.",
      message: [
        "Carmel girls gymnastics has won five state titles, and every spring the whole school walks the Corsairs Care 5K at Mundelein Seminary.",
        "You can add the things your student does as badges and their class year to the banner, all in Carmel brown and gold.",
      ],
      chips: ["Gymnastics", "Theater", "Soccer", "Marching Band", "Football", "Basketball", "Campus Ministry", "Volleyball", "Choir", "Service"],
      ordering: ORDERING("Carmel"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's own logo (carmelhs.org/pics/school_logo.svg): brown #3C2415 (54.0%), gold #EAA900 (17.8%). The same two values are the most-used colours in the site's main.css. Brown, gold and white are the named colours.",
  },
  {
    slug: "notre-dame-dons",
    rosterId: "00341787",
    schoolName: "Notre Dame College Prep",
    shortName: "Notre Dame",
    mascot: "Dons",
    city: "Niles, IL",
    colors: { frame: "#032E73", tileField: "#032E73", rim: "#009946" },
    banners: { top: "NOTRE DAME COLLEGE PREP", bottom: "DONS", text: "#FFFFFF" },
    signature: ["hs:baseball-patch", "hs:ice-hockey", "hs:football-patch", "hs:bass-fishing"],
    // Sources: Wikipedia "Notre Dame College Prep" — founded 1955 by the
    // Congregation of Holy Cross. IHSA archive — Class AA baseball, June 12, 2004,
    // the school's first state title in any sport. IHSA bass fishing
    // 3rd place 2012-13 (Wikipedia), hence the badge.
    welcome: {
      headline: "Welcome, Notre Dame families.",
      message: [
        "Notre Dame has been forming young men in the Holy Cross tradition since 1955, and in 2004 Dons baseball won the school's first state championship in any sport.",
        "You can add the things your student does as badges and their class year to the banner, all in Notre Dame blue and green.",
      ],
      chips: ["Baseball", "Hockey", "Football", "Bass Fishing", "Cross Country", "Campus Ministry", "Wrestling", "Band", "Basketball", "Soccer"],
      ordering: ORDERING("Notre Dame"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's own footer logo (nddons.org logo_footer.png): navy #032E73 (36.3%), green #009946 (20.7%), white (39.4%). The site's custom.css uses #002D72 and #009A44. Green, white and blue are the named colours.",
  },
  {
    slug: "saint-ignatius-wolfpack",
    rosterId: "01601838",
    schoolName: "Saint Ignatius College Prep",
    shortName: "Saint Ignatius",
    mascot: "Wolfpack",
    city: "Chicago, IL",
    colors: { frame: "#8B2233", tileField: "#8B2233", rim: "#D4C89F" },
    banners: { top: "SAINT IGNATIUS", bottom: "WOLFPACK", text: "#FFFFFF" },
    signature: ["hs:cross-country", "hs:water-polo", "hs:golf", "hs:service"],
    // Sources: Wikipedia "Saint Ignatius College Prep" — founded 1869; the 1870
    // building is one of the few Chicago buildings that predate the 1871 Great
    // Fire. ABC7 Chicago — girls cross country 2A, 2024, the first Chicago school
    // to win the IHSA girls title.
    welcome: {
      headline: "Welcome, Wolfpack families.",
      message: [
        "Founded in 1869, Saint Ignatius still teaches in its 1870 building, one of the few in Chicago older than the Great Fire. In 2024 the girls cross country team became the first from a Chicago school to win the IHSA state title.",
        "You can add the things your student does as badges and their class year to the banner, all in Ignatius maroon and gold.",
      ],
      chips: ["Cross Country", "Water Polo", "Golf", "Service", "Campus Ministry", "Rowing", "Theater", "Orchestra", "Lacrosse", "Basketball"],
      ordering: ORDERING("Saint Ignatius"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's own crest (ignatius.org, Saint Ignatius - Logo Crest.png): maroon #8B2233 (55.5%), gold #D4C89F (11.3%). The site's PUBLISHED theme variables are --color-1 #822433 and --color-2 #d1c99d. Maroon and gold are the named colours.",
  },

  // ── West suburbs ──────────────────────────────────────────────────────────
  {
    slug: "hinsdale-central-red-devils",
    rosterId: "171932002222",
    schoolName: "Hinsdale Central High School",
    shortName: "Hinsdale Central",
    mascot: "Red Devils",
    city: "Hinsdale, IL",
    colors: { frame: "#B32216", tileField: "#B32216", rim: "#A7A9AC" },
    banners: { top: "HINSDALE CENTRAL", bottom: "RED DEVILS", text: "#FFFFFF" },
    signature: ["hs:debate", "hs:tennis", "hs:swim-dive", "hs:journalism"],
    // Sources: IHSA news ("Hinsdale Central wins 8th state championship of
    // 2014-15, sets new bar") — eight titles in one school year; Wikipedia — mock trial 11 state titles (ISBA); speech state champions
    // 2014-15, 2018-19, 2025-26 (The Hinsdalean 2026-03-05); Devils' Advocate NSPA Pacemaker 2012-13.
    welcome: {
      headline: "Welcome, Red Devil families.",
      message: [
        "Hinsdale Central won a record eight IHSA state titles in the 2014–15 school year, and its mock trial team has been state champion 11 times. Speech won the state title again in 2025–26.",
        "You can add the things your student does as badges and their class year to the banner, all in Red Devil red and white.",
      ],
      chips: ["Speech & Debate", "Tennis", "Swimming", "Journalism", "Golf", "Wrestling", "Cross Country", "Soccer", "Orchestra", "Theater"],
      ordering: ORDERING("Hinsdale Central"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's crest logo (central.hinsdale86.org, hinsdaleCentral_logo.png): red #B32216 (21.9%), white (13.9%). The school site theme's dominant red is #AD0000. Red and white are the named colours; the rim is a neutral silver because white cannot outline white lettering and brass is not a Red Devil colour.",
  },
  {
    slug: "lyons-township-lions",
    rosterId: "172388002601",
    schoolName: "Lyons Township High School",
    shortName: "LT",
    mascot: "Lions",
    city: "La Grange, IL",
    colors: { frame: "#0B5292", tileField: "#0B5292", rim: "#EDC31E" },
    banners: { top: "LYONS TOWNSHIP", bottom: "LIONS", text: "#FFFFFF" },
    signature: ["hs:track", "hs:swim-dive", "hs:gymnastics", "hs:film"],
    // Sources: lths.net/athletics12/state-champions — 37 state titles on LT's own
    // list; boys track nine; boys swimming 2016 and 2017.
    welcome: {
      headline: "Welcome, Lion families.",
      message: [
        "Lyons Township has won at least 35 IHSA state titles, from nine in boys track to back-to-back boys swimming titles in 2016 and 2017.",
        "You can add the things your student does as badges and their class year to the banner, all in LT blue and gold.",
      ],
      chips: ["Track & Field", "Swimming", "Gymnastics", "Film", "Volleyball", "Baseball", "Tennis", "Water Polo", "Band", "Theater"],
      ordering: ORDERING("LT"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's primary logo (lths.net, logo-primary-lth.png): blue #0B5292, gold #EDC31E. The site's PUBLISHED theme variable is a darker --primary-color #123469 with gold #E8BF44 in the stylesheet; confirm which blue the school prints. Royal blue and gold are the named colours.",
  },
  {
    slug: "york-dukes",
    rosterId: "171397001755",
    schoolName: "York Community High School",
    shortName: "York",
    mascot: "Dukes",
    city: "Elmhurst, IL",
    colors: { frame: "#00833E", tileField: "#00833E", rim: "#FFFFFF" },
    banners: { top: "YORK HIGH SCHOOL", bottom: "DUKES", text: "#FFFFFF" },
    signature: ["hs:cross-country", "hs:football-patch", "hs:drama", "hs:baseball-patch"],
    // Sources: Wikipedia "York Community High School" — boys cross country, "the
    // Long Green Line", 28 state titles under coach Joe Newton; fight song "Hail to
    // York High". Shaw Local 2024-12-01 — first state title game, Class 8A.
    welcome: {
      headline: "Welcome, Duke families.",
      message: [
        "York boys cross country, the Long Green Line, won 28 state titles under coach Joe Newton. In 2024 Dukes football played in its first state championship game.",
        "You can add the things your student does as badges and their class year to the banner, all in York green and white.",
      ],
      chips: ["Cross Country", "Football", "Theater", "Baseball", "Track & Field", "Band", "Choir", "Soccer", "Swimming", "Basketball"],
      ordering: ORDERING("York"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's logo (cmsv2-assets.apptegy.net York_Community_HS_Logo.png): green #00833E (8.9%). It matches the district site's York page colour #00833F exactly. Green and white are the named colours.",
  },
  {
    slug: "glenbard-west-hilltoppers",
    rosterId: "171683001991",
    schoolName: "Glenbard West High School",
    shortName: "Glenbard West",
    mascot: "Hilltoppers",
    city: "Glen Ellyn, IL",
    colors: { frame: "#04563C", tileField: "#04563C", rim: "#A7A9AC" },
    banners: { top: "GLENBARD WEST", bottom: "HILLTOPPERS", text: "#FFFFFF" },
    signature: ["hs:volleyball-patch", "hs:football-patch", "hs:gymnastics", "hs:basketball-patch"],
    // Sources: Wikipedia "Glenbard West High School" — castle-style building on
    // Honeysuckle Hill above Lake Ellyn; Bill Duchon Field. Daily Herald 2026-06-06 —
    // boys volleyball's 6th title in 11 years (2015, 2016, 2017, 2022, 2023, 2026); colours "Glenbard Green (Pantone 626) and White".
    welcome: {
      headline: "Welcome, Hilltopper families.",
      message: [
        "Glenbard West plays its football at Duchon Field, below the castle-style school on Honeysuckle Hill. Boys volleyball has won six state titles since 2015, most recently in 2026.",
        "You can add the things your student does as badges and their class year to the banner, all in Glenbard green and white.",
      ],
      chips: ["Volleyball", "Football", "Gymnastics", "Basketball", "Track & Field", "Cross Country", "Speech & Debate", "Theater", "Band", "Orchestra"],
      ordering: ORDERING("Glenbard West"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's own logo (glenbardwesths.org, West-Logo_no-background.webp): green #04563C (56.9%). The school names its green as PUBLISHED Pantone 626 (Wikipedia); the site theme's dominant green is #00583C. Green and white are the named colours; the rim is a neutral silver because white cannot outline white lettering and brass is not a Hilltopper colour.",
  },
  {
    slug: "wheaton-warrenville-south-tigers",
    rosterId: "174218004222",
    schoolName: "Wheaton Warrenville South High School",
    shortName: "WW South",
    mascot: "Tigers",
    city: "Wheaton, IL",
    colors: { frame: "#101010", tileField: "#101010", rim: "#FE7F00" },
    banners: { top: "WHEATON WARRENVILLE SOUTH", bottom: "TIGERS", text: "#FFFFFF" },
    signature: ["hs:volleyball-patch", "hs:gymnastics", "hs:choir", "hs:marching-band"],
    // Sources: Wikipedia "Wheaton Warrenville South High School" — motto "Semper
    // Tigris" (Always a Tiger); boys volleyball seven titles 2001-2012; the
    // Classics show choir; Daily Herald 2011-05-05 — national title (2011).
    welcome: {
      headline: "Welcome, Tiger families.",
      message: [
        "Semper Tigris: always a Tiger. WW South boys volleyball has won seven state titles, and in 2011 the Classics show choir won a national championship.",
        "You can add the things your student does as badges and their class year to the banner, all in Tiger orange and black.",
      ],
      chips: ["Volleyball", "Gymnastics", "Show Choir", "Marching Band", "Football", "Speech & Debate", "Cross Country", "Golf", "Theater", "Basketball"],
      ordering: ORDERING("WW South"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's logo (cmsv2-assets.apptegy.net wws.png): orange #FE7F00 (63.6%), black (20.8%, set as the house black #101010 so the bevel reads). The district site's orange is #FF7E00. Orange and black are the named colours.",
  },
  {
    slug: "naperville-central-redhawks",
    rosterId: "172771002939",
    schoolName: "Naperville Central High School",
    shortName: "Naperville Central",
    mascot: "Redhawks",
    city: "Naperville, IL",
    colors: { frame: "#D62921", tileField: "#D62921", rim: "#FFFFFF" },
    banners: { top: "NAPERVILLE CENTRAL", bottom: "REDHAWKS", text: "#FFFFFF" },
    signature: ["hs:water-polo", "hs:swim-dive", "hs:journalism", "hs:football-patch"],
    // Sources: Wikipedia "Naperville Central High School" — boys water polo 2016,
    // 2018, 2019; The Central Times, multiple National Pacemakers. Crosstown
    // Classic v Naperville North (Positively Naperville; NCTV17).
    welcome: {
      headline: "Welcome, Redhawk families.",
      message: [
        "Naperville Central boys water polo won state titles in 2016, 2018 and 2019, and The Central Times has won National Pacemaker awards. Every fall the Redhawks meet Naperville North in the Crosstown Classic.",
        "You can add the things your student does as badges and their class year to the banner, all in Redhawk red and white.",
      ],
      chips: ["Water Polo", "Swimming", "Journalism", "Football", "Baseball", "Volleyball", "Basketball", "Band", "Science", "Theater"],
      ordering: ORDERING("Naperville Central"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's logo (Naperville_Central_Logo.png on nchsboosters.com): red #D62921 (77.8%). It matches the school site's PUBLISHED --primary-color #d62921 exactly. Red and white are the named colours.",
  },
  {
    slug: "naperville-north-huskies",
    rosterId: "172771002940",
    schoolName: "Naperville North High School",
    shortName: "Naperville North",
    mascot: "Huskies",
    city: "Naperville, IL",
    // Orange leads: it is the site's primary AND secondary colour. It also keeps
    // the other navy-and-orange Huskies (OPRF, navy-led) from looking like a copy.
    colors: { frame: "#FE6602", tileField: "#FE6602", rim: "#06305B" },
    banners: { top: "NAPERVILLE NORTH", bottom: "HUSKIES", text: "#FFFFFF" },
    signature: ["hs:soccer-patch", "hs:water-polo", "hs:cross-country", "hs:robotics"],
    // Sources: NCTV17 — 2025 boys soccer 3A state title, the program's fifth, on
    // penalty kicks over St. Laurence; NCTV17 — first IHSA boys water polo title,
    // 2025, 7-6 over New Trier. Crosstown game v Naperville Central since the 1970
    // split (Positively Naperville).
    welcome: {
      headline: "Welcome, Huskie families.",
      message: [
        "In 2025 Naperville North won its fifth boys soccer state title and its first boys water polo title, a 7–6 comeback over New Trier. Every fall the Huskies meet Naperville Central in the Crosstown game.",
        "You can add the things your student does as badges and their class year to the banner, all in Huskie orange and navy.",
      ],
      chips: ["Soccer", "Water Polo", "Cross Country", "Robotics", "Math Team", "Dance", "Color Guard", "Marching Band", "Football", "Swimming"],
      ordering: ORDERING("Naperville North"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's own logo (nnhs.naperville203.org, LogoFile-3.png): orange #FE6602 (24.3%), navy #06305B (24.3%). The site's PUBLISHED theme variables are --primary-color #ff6500 and --tertiary-color #092F5B. Blue and orange are the named colours.",
  },
  {
    slug: "neuqua-valley-wildcats",
    rosterId: "174169002092",
    schoolName: "Neuqua Valley High School",
    shortName: "Neuqua Valley",
    mascot: "Wildcats",
    city: "Naperville, IL",
    colors: { frame: "#0C244A", tileField: "#0C244A", rim: "#FFCE00" },
    banners: { top: "NEUQUA VALLEY", bottom: "WILDCATS", text: "#FFFFFF" },
    signature: ["hs:orchestra", "hs:band", "hs:cross-country", "hs:swim-dive"],
    // Sources: Daily Herald 2013-04-02 and grammy.com (2005) — National GRAMMY
    // Signature School, the top award, in 2005 and 2013; NCTV17 — badminton state
    // champions 2025.
    welcome: {
      headline: "Welcome, Wildcat families.",
      message: [
        "Neuqua Valley was named the top GRAMMY Signature School in the nation in 2005 and again in 2013, and in 2025 the badminton team won the state title.",
        "You can add the things your student does as badges and their class year to the banner, all in Wildcat navy and gold.",
      ],
      chips: ["Orchestra", "Band", "Choir", "Jazz Band", "Cross Country", "Swimming", "Track & Field", "Dance", "Soccer", "Hockey"],
      ordering: ORDERING("Neuqua Valley"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's own logo (nvhs.ipsd.org, nvhs.png): navy #0C244A (29.9%), gold #FFCE00 (50.6%). The site's PUBLISHED theme variables are --primary-color #0c2340 and --secondary-color #ffc713. Navy blue and gold are the named colours.",
  },
  {
    slug: "benet-redwings",
    rosterId: "A2101559",
    schoolName: "Benet Academy",
    shortName: "Benet",
    mascot: "Redwings",
    city: "Lisle, IL",
    colors: { frame: "#C41230", tileField: "#C41230", rim: "#A7A9AC" },
    banners: { top: "BENET ACADEMY", bottom: "REDWINGS", text: "#FFFFFF" },
    signature: ["hs:volleyball-patch", "hs:basketball-patch", "hs:soccer-patch", "hs:math"],
    // Sources: NCTV17 — 2025 4A boys basketball, the school's first, 55-54 over
    // Warren; Benet Herald ("4th state championship in 8 years":
    // 2011, 2012, 2014, 2019) — girls volleyball 4A titles; benet.org history — first students registered March 2, 1887, at
    // St. Procopius, under the Benedictine monks.
    welcome: {
      headline: "Welcome, Redwing families.",
      message: [
        "Benet boys basketball won its first state championship in 2025, 55–54 over Warren, and Redwing girls volleyball has won the Class 4A title in 2011, 2012, 2014 and 2019. Benet has taught in the Benedictine tradition since 1887.",
        "You can add the things your student does as badges and their class year to the banner, all in Benet red and white.",
      ],
      chips: ["Volleyball", "Basketball", "Soccer", "Math Team", "Science", "Chess", "Campus Ministry", "Theater", "Football", "Cross Country"],
      ordering: ORDERING("Benet"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's crest icon (benet.org, Benet White Crest Logo.png): red #C41230 (13.1%). The school's reds disagree: the site stylesheet's most-used red is #A21024 and the Wikipedia logo measures #E01935. Confirm the crest red before print. Red and white are the named colours; the rim is a neutral silver because white cannot outline white lettering and brass is not a Benet colour.",
  },
  {
    slug: "barrington-broncos",
    rosterId: "170505000188",
    schoolName: "Barrington High School",
    shortName: "Barrington",
    mascot: "Broncos",
    city: "Barrington, IL",
    colors: { frame: "#C22329", tileField: "#C22329", rim: "#A7A9AC" },
    banners: { top: "BARRINGTON HIGH SCHOOL", bottom: "BRONCOS", text: "#FFFFFF" },
    signature: ["hs:cross-country", "hs:choir", "hs:soccer-patch", "hs:film"],
    // Sources: Wikipedia "Barrington High School (Illinois)" — girls cross country
    // 2024; girls soccer 2016-17 and 2017-18 (spring seasons). Daily Herald
    // 2026-06-22 — girls cross country 3A champions again in 2025.
    welcome: {
      headline: "Welcome, Bronco families.",
      message: [
        "Barrington girls cross country won the state title in 2024 and again in 2025, and girls soccer won back-to-back state titles in 2017 and 2018.",
        "You can add the things your student does as badges and their class year to the banner, all in Bronco scarlet.",
      ],
      chips: ["Cross Country", "Choir", "Soccer", "Film", "Band", "Orchestra", "Theater", "Golf", "Gymnastics", "Track & Field"],
      ordering: ORDERING("Barrington"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's own logo (bhs.barrington220.org, BHS-contact-logo.png): scarlet #C22329 (11.1%), black (67.4%). It matches the site's accent red #C22329 exactly. Scarlet, black and white are the named colours; black cannot outline white lettering on scarlet, so the rim is a neutral silver rather than brass.",
  },
  {
    slug: "prospect-knights",
    rosterId: "170417000114",
    schoolName: "Prospect High School",
    shortName: "Prospect",
    mascot: "Knights",
    city: "Mount Prospect, IL",
    colors: { frame: "#121F48", tileField: "#121F48", rim: "#78ADD5" },
    banners: { top: "PROSPECT HIGH SCHOOL", bottom: "KNIGHTS", text: "#FFFFFF" },
    signature: ["hs:marching-band", "hs:debate", "hs:football-patch", "hs:golf"],
    // Sources: NBC Chicago / ILGA HR1019 — the Marching Knights were the only
    // Illinois band in the 2016 Macy's Thanksgiving Day Parade; NFHS — first IHSA
    // speech team state title, 2016; Daily Herald / ABC7 — Class 7A football state
    // champions 2001, 2002 and 2005.
    welcome: {
      headline: "Welcome, Knight families.",
      message: [
        "In 2016 the Marching Knights were the only Illinois band in the Macy's Thanksgiving Day Parade, the same year Prospect won its first state speech title. Knights football won state championships in 2001, 2002 and 2005.",
        "You can add the things your student does as badges and their class year to the banner, all in Prospect navy and Columbia blue.",
      ],
      chips: ["Marching Band", "Speech & Debate", "Football", "Golf", "Track & Field", "Choir", "Theater", "Soccer", "Basketball", "Orchestra"],
      ordering: ORDERING("Prospect"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's own logo (d214.org, Prospect_LOGO_2022REV.png): navy #121F48 (20.4%), Columbia blue #78ADD5 (47.7%). The site's theme primary is #192A56; its light blue #87CEEB is the CSS named colour 'skyblue', not a measured one. Navy blue and Columbia blue are the named colours.",
  },
  {
    slug: "saint-viator-lions",
    rosterId: "00344799",
    schoolName: "Saint Viator High School",
    shortName: "Saint Viator",
    mascot: "Lions",
    city: "Arlington Heights, IL",
    colors: { frame: "#081D3E", tileField: "#081D3E", rim: "#A7A9AC" },
    banners: { top: "SAINT VIATOR", bottom: "LIONS", text: "#FFFFFF" },
    signature: ["hs:ice-hockey", "hs:golf", "hs:soccer-patch", "hs:service"],
    // Sources: AHAI / USA Hockey — first state championship, March 6, 2026, 6-3
    // over New Trier Green at Allstate Arena; Wikipedia "St. Viator High School" —
    // boys golf 2007-08, 2008-09, 2009-10; 25 service hours a year.
    welcome: {
      headline: "Welcome, Lion families.",
      message: [
        "In March 2026 Saint Viator hockey won its first state championship, beating New Trier Green 6–3 at Allstate Arena. Lions golf won three straight state titles, from 2007–08 to 2009–10.",
        "You can add the things your student does as badges and their class year to the banner, all in Viator navy and white.",
      ],
      chips: ["Hockey", "Golf", "Soccer", "Service", "Lacrosse", "Basketball", "Theater", "Campus Ministry", "Baseball", "Cheer"],
      ordering: ORDERING("Saint Viator"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's own crest (saintviator.com, Color-Crest.png): navy #081D3E (26.1%). The site's heading navy is #0F1D41; its red #D31145 is a web accent, not a school colour. Navy blue and white are the named colours; the rim is a neutral silver because white cannot outline white lettering.",
  },
  {
    slug: "maine-south-hawks",
    rosterId: "172409005031",
    schoolName: "Maine South High School",
    shortName: "Maine South",
    mascot: "Hawks",
    city: "Park Ridge, IL",
    colors: { frame: "#D0101C", tileField: "#D0101C", rim: "#A7A9AC" },
    banners: { top: "MAINE SOUTH", bottom: "HAWKS", text: "#FFFFFF" },
    signature: ["hs:football-patch", "hs:flag-football", "hs:dance", "hs:chess"],
    // Sources: ILGA HR1502 — the 2016 Class 8A title was the school's sixth;
    // Daily Herald 2025-10-18 — girls flag football IHSA state champions 2025;
    // Patch / ILGA HR0171 — the Hawkettes won the first IHSA dance state title, 2013.
    welcome: {
      headline: "Welcome, Hawk families.",
      message: [
        "Maine South football has won six state championships, and in 2025 the girls flag football team won the IHSA state title. In 2013 the Hawkettes won the Class 3A title at the first IHSA dance state finals.",
        "You can add the things your student does as badges and their class year to the banner, all in Hawk red and black.",
      ],
      chips: ["Football", "Flag Football", "Dance", "Chess", "Marching Band", "Volleyball", "Swimming", "Basketball", "Theater", "Soccer"],
      ordering: ORDERING("Maine South"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's own red M logo (south.maine207.org, redMlogo.webp): red #D0101C (53.6%), black (17.1%), white (22.2%). The site theme's brand red is #B00C17. Red, black and white are the named colours; neither black nor white can outline white lettering on this red, so the rim is a neutral silver rather than brass.",
  },
  {
    slug: "fenwick-friars",
    rosterId: "00341958",
    schoolName: "Fenwick High School",
    shortName: "Fenwick",
    mascot: "Friars",
    city: "Oak Park, IL",
    colors: { frame: "#101010", tileField: "#101010", rim: "#A7A9AC" },
    banners: { top: "FENWICK HIGH SCHOOL", bottom: "FRIARS", text: "#FFFFFF" },
    signature: ["hs:football-patch", "hs:water-polo", "hs:swim-dive", "hs:journalism"],
    // Sources: Wikipedia "Fenwick High School (Oak Park, Illinois)" and the
    // school's history page — opened 1929, the only US school run directly by the
    // Dominican friars. Daily Herald 2025-12-03 — Class 6A state champions, 38-28
    // over East St. Louis.
    welcome: {
      headline: "Welcome, Friar families.",
      message: [
        "Founded in 1929, Fenwick is the only high school in the country run directly by the Dominican friars. In 2025 Friars football won the Class 6A state title, 38–28 over East St. Louis.",
        "You can add the things your student does as badges and their class year to the banner, all in Fenwick black and white.",
      ],
      chips: ["Football", "Water Polo", "Swimming", "Journalism", "Softball", "Basketball", "Campus Ministry", "Theater", "Soccer", "Hockey"],
      ordering: ORDERING("Fenwick"),
    },
    status: "demo",
    colorSource:
      "Black and white are the named colours (Wikipedia), and the school website's theme is #222222 on #FFFFFF. The site logo is a white reversed mark, so there was nothing to measure; black is the house black #101010. Its red web accents are not a school colour. Rim is a neutral silver, between the two school colours, because white cannot outline white lettering.",
  },
  {
    slug: "oprf-huskies",
    rosterId: "172928003070",
    schoolName: "Oak Park and River Forest High School",
    shortName: "OPRF",
    mascot: "Huskies",
    city: "Oak Park, IL",
    colors: { frame: "#1C2759", tileField: "#1C2759", rim: "#F36A22" },
    banners: { top: "OAK PARK AND RIVER FOREST", bottom: "HUSKIES", text: "#FFFFFF" },
    signature: ["hs:track", "hs:wrestling", "hs:orchestra", "hs:tennis"],
    // Sources: Wikipedia "Oak Park and River Forest High School" — boys track 18
    // state titles; orchestra; IHSA records — 18 boys track
    // titles. oprfhs.org news — the orchestra, "more than a century". Wednesday
    // Journal (2010, 2013) — Newscene began in 1980.
    welcome: {
      headline: "Welcome, Huskie families.",
      message: [
        "OPRF boys track and field has won 18 state titles, and the orchestra has been playing for more than a century. Newscene, the student TV news show, has been on the air since 1980.",
        "You can add the things your student does as badges and their class year to the banner, all in Huskie orange and navy.",
      ],
      chips: ["Track & Field", "Wrestling", "Orchestra", "Tennis", "Theater", "Film", "Speech & Debate", "Swimming", "Softball", "Baseball"],
      ordering: ORDERING("OPRF"),
    },
    status: "demo",
    colorSource:
      "MEASURED from the school's own full-colour crest (oprfhs.org, CrestOnly_FullColor.png): navy #1C2759 (47.4%), orange #F36A22 (44.2%). The site's navy is #1D2758 and its burnt orange #C34300. Burnt orange and navy are the named colours.",
  },
  {
    slug: "mount-carmel-caravan",
    rosterId: "00343048",
    schoolName: "Mount Carmel High School",
    shortName: "Mount Carmel",
    mascot: "Caravan",
    city: "Chicago, IL",
    colors: { frame: "#4E3629", tileField: "#4E3629", rim: "#D3B56B" },
    banners: { top: "MOUNT CARMEL", bottom: "CARAVAN", text: "#FFFFFF" },
    signature: ["hs:football-patch", "hs:wrestling", "hs:ice-hockey", "hs:baseball-patch"],
    // Sources: Hyde Park Herald and WGN — 2025 Class 8A, the 17th state title and
    // the fourth straight, the first school in IHSA history to win four straight
    // twice; The Caravan (student paper, 2022) — Fight Night, run by the Fathers'
    // Club.
    welcome: {
      headline: "Welcome, Caravan families.",
      message: [
        "The Caravan has won 17 state football championships, and with its fourth straight in 2025 Mount Carmel became the first school in IHSA history to win four in a row twice. Every spring the Fathers' Club puts on Fight Night.",
        "You can add the things your student does as badges and their class year to the banner, all in Caravan brown and white.",
      ],
      chips: ["Football", "Wrestling", "Hockey", "Baseball", "Basketball", "Theater", "Campus Ministry", "Journalism", "Track & Field", "Bowling"],
      ordering: ORDERING("Mount Carmel"),
    },
    status: "demo",
    colorSource:
      "Brown and white are the named colours (Wikipedia). Brown is the school website's dominant colour #4E3629 (mchs.org stylesheet, 152 uses); its 150 px homescreen icon measures a lighter #7B4507, too small to trust. Confirm which brown the school prints. Rim is the site's own tan accent #D3B56B: white cannot outline white lettering.",
  },
  {
    slug: "marist-redhawks",
    rosterId: "00343467",
    schoolName: "Marist High School",
    shortName: "Marist",
    mascot: "RedHawks",
    city: "Chicago, IL",
    colors: { frame: "#E4002B", tileField: "#E4002B", rim: "#A7A9AC" },
    banners: { top: "MARIST HIGH SCHOOL", bottom: "REDHAWKS", text: "#FFFFFF" },
    signature: ["hs:volleyball-patch", "hs:basketball-patch", "hs:softball-patch", "hs:marching-band"],
    // Sources: marist.net — 2026 4A boys basketball state champions, 44-28 over
    // Benet, the school's first; NCTV17 — 4A girls volleyball over Benet, "second
    // straight year" (2024, 2025). Battle of Pulaski v Brother Rice since 1975 (MHS
    // Media).
    welcome: {
      headline: "Welcome, RedHawk families.",
      message: [
        "Marist won its first boys basketball state title in 2026, 44–28 over Benet, and RedHawk girls volleyball won back-to-back state titles in 2024 and 2025. Every football season brings the Battle of Pulaski against Brother Rice.",
        "You can add the things your student does as badges and their class year to the banner, all in Marist red and white.",
      ],
      chips: ["Volleyball", "Basketball", "Softball", "Marching Band", "Cheer", "Wrestling", "Hockey", "Campus Ministry", "Football", "Theater"],
      ordering: ORDERING("Marist"),
    },
    status: "demo",
    colorSource:
      "Red is the school website's PUBLISHED accent variable (--tec-color-link-accent #e4002b, marist.net). The footer logo SVG is single-colour black, so nothing to measure; the 2024 logo.webp measured a pinker #ED174F by the research pass. Red and white are the IHSA colours (Wikipedia adds black) — confirm the red before print. Rim is a neutral silver because neither black nor white can outline white lettering on this red.",
  },
];
