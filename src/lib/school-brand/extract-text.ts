// ─── Name, motto, mascot, colours — as RANKED GUESSES ────────────────────────
//
// Nothing here returns "the answer". Every extractor returns an ordered list,
// because the failure this feature is most likely to produce is not "found
// nothing", it is "found the wrong thing and stated it plainly". A parent who sees
// "Home - Lincoln High School" in the name field knows to fix it. A parent who sees
// "Lincoln Elementary" when they typed the URL for Lincoln HIGH gets a frame with
// the wrong school on it, and finds out when it arrives.
//
// So: three ordered guesses, the top one pre-filled, the rest one tap away. The
// confidence numbers are only meaningful RELATIVE to each other within a list, and
// they are chosen so that sources compare sensibly ACROSS types — that is why they
// are constants with reasons rather than literals sprinkled through the code.

import type { ColorCandidate, TextCandidate } from "./types";
import {
  colorLuminance,
  colorSaturation,
  elementInner,
  innerText,
  normalizeColor,
  type PageScan,
} from "./html-scan";

// ─── shared helpers ──────────────────────────────────────────────────────────

/**
 * Words that make a string look like the name of a school rather than the name of
 * a page. Used as a BOOST, never as a filter: "Sacred Heart" and "Mater Dei" are
 * both real school names with none of these words in them, and filtering on this
 * list would lose them entirely.
 */
const SCHOOL_WORDS =
  /\b(school|schools|academy|elementary|middle|high|junior|senior|prep|preparatory|charter|college|university|institute|district|isd|usd|csd|montessori|magnet|k-?8|k-?12|primary|secondary|grammar|seminary|conservatory)\b/i;

/** Page furniture that is never a school name, however confidently a tag says it. */
const PAGE_FURNITURE =
  /^(home|homepage|welcome|welcome to|main|index|untitled|new page|our school|about|about us|menu|skip to (main )?content)$/i;

/**
 * CMS vendors, which are never the school's name.
 *
 * Needed because the footer credit is an <img alt="Edlio">, and the logo-alt rule
 * reads exactly that kind of alt text — the first run of the Edlio fixture offered
 * "Edlio" as the school's second-best name, at 0.40, one tap from being printed on
 * a frame. The vendor drop in rank-candidates.ts protects the LOGO list; the name
 * list needs its own, because a name candidate has no URL to blocklist.
 */
const VENDOR_NAME =
  /^(edlio|finalsite|apptegy|thrillshare|blackboard|powerschool|schoolmessenger|parentsquare|peachjar|wordpress|squarespace|wix|weebly|google|facebook)\b/i;

const collapse = (s: string): string => s.replace(/\s+/g, " ").trim();

const normalizeKey = (s: string): string =>
  collapse(s.toLowerCase())
    .replace(/[.,;:!?'"“”‘’]+$/g, "")
    .replace(/^[.,;:!?'"“”‘’]+/g, "");

/** Title-case a lexicon hit so "EAGLES" and "eagles" merge into one candidate. */
function titleCase(s: string): string {
  return collapse(s)
    .split(" ")
    .map((w) => (w.length <= 2 && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

/**
 * Merge candidates that are the same string from different places.
 *
 * Keeps the HIGHEST confidence rather than summing. Three weak sources agreeing is
 * genuinely reassuring, but summing would let four 0.3 mentions in the footer beat
 * a 0.95 JSON-LD `name`, and the footer is where the district's name lives, not the
 * school's. Agreement gets a small documented bump instead.
 */
function mergeCandidates(list: TextCandidate[], limit = 5): TextCandidate[] {
  const byKey = new Map<string, TextCandidate & { agreements: number }>();
  for (const c of list) {
    const key = normalizeKey(c.value);
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...c, agreements: 1 });
      continue;
    }
    prev.agreements++;
    if (c.confidence > prev.confidence) {
      prev.confidence = c.confidence;
      prev.value = c.value;
      prev.source = c.source;
      prev.why = c.why;
    }
  }
  return [...byKey.values()]
    .map((c) => ({
      value: c.value,
      // +0.03 per extra independent mention, capped at +0.06. Enough to break a tie
      // between two equally-scored sources; never enough to reorder a real gap.
      confidence: Math.min(0.99, c.confidence + Math.min(0.06, (c.agreements - 1) * 0.03)),
      source: c.source,
      why: c.agreements > 1 ? `${c.why ?? c.source} (seen in ${c.agreements} places)` : c.why,
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

/** JSON-LD `name`/`slogan`/etc, but only from nodes that describe an organisation. */
const ORG_TYPES =
  /(school|educationalorganization|collegeoruniversity|highschool|elementaryschool|middleschool|preschool|organization|localbusiness)/i;

function jsonLdStrings(scan: PageScan, field: string): string[] {
  const out: string[] = [];
  for (const node of scan.jsonLd) {
    const type = node["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (!types.some((t) => typeof t === "string" && ORG_TYPES.test(t))) continue;
    const value = node[field];
    if (typeof value === "string" && value.trim()) out.push(collapse(value));
  }
  return out;
}

// ─── school name ─────────────────────────────────────────────────────────────

/**
 * Split a <title> on its separators and keep the part that reads like a school.
 *
 * Titles are overwhelmingly "Page - Site" or "Site | Section", and which half is
 * which is not fixed: Edlio writes "Lincoln High School - Home", WordPress writes
 * "Home - Lincoln High School". Rather than guess an order, score every segment and
 * take the best; both layouts then land on the same answer.
 */
function titleSegments(title: string): string[] {
  return title
    .split(/\s+[|–—·:>»]+\s+|\s+-\s+/)
    .map(collapse)
    .filter(Boolean);
}

function scoreNameText(text: string): number {
  const t = collapse(text);
  if (!t) return 0;
  if (PAGE_FURNITURE.test(t)) return 0;
  let score = 0.5;
  if (SCHOOL_WORDS.test(t)) score += 0.25;
  // A name is a few words. Anything past ~8 is a sentence, and sentences in the
  // <title> are marketing copy ("A community where every child is known").
  const words = t.split(" ").length;
  if (words > 8) score -= 0.25;
  if (words === 1 && !SCHOOL_WORDS.test(t)) score -= 0.15;
  if (t.length > 70) score -= 0.2;
  // ALL CAPS survives, but loses to the same string in mixed case if both appear.
  if (t === t.toUpperCase() && t.length > 6) score -= 0.05;
  return Math.max(0, Math.min(1, score));
}

/** A last-resort name built from the hostname. Always produces something. */
function nameFromHost(host: string): string | null {
  if (!host) return null;
  const parts = host.replace(/^www\./, "").split(".");
  const label = parts[0];
  if (!label || label.length < 3) return null;
  // "lincolnhigh" → "Lincolnhigh"; hyphens and underscores become spaces. No attempt
  // at word-splitting: "westoak" could be West Oak or Weston Oak, and a wrong split
  // presented as a name is exactly the confident-wrong-answer we are avoiding.
  return titleCase(label.replace(/[-_]+/g, " "));
}

export function extractSchoolNames(scan: PageScan): TextCandidate[] {
  const out: TextCandidate[] = [];
  const push = (value: string, confidence: number, source: string, why?: string) => {
    const v = collapse(value);
    if (!v || v.length > 120) return;
    if (PAGE_FURNITURE.test(v)) return;
    if (VENDOR_NAME.test(v)) return;
    out.push({ value: v, confidence: Math.max(0, Math.min(0.99, confidence)), source, why });
  };

  // 1. JSON-LD on an organisation node. The school TYPED this into their CMS; it is
  //    the only source on the page that is meant to be machine-read, and the only
  //    one that is not also a page title.
  for (const name of jsonLdStrings(scan, "name")) {
    push(name, 0.95, "json-ld", "Declared on a School/Organization node");
  }
  for (const name of jsonLdStrings(scan, "alternateName")) {
    push(name, 0.6, "json-ld:alternateName");
  }

  // 2. og:site_name. Site-level by definition, so it does not carry the page name.
  if (scan.meta["og:site_name"]) {
    push(scan.meta["og:site_name"], 0.82, "og:site_name");
  }
  for (const key of ["application-name", "apple-mobile-web-app-title"]) {
    if (scan.meta[key]) push(scan.meta[key], 0.62, `meta:${key}`);
  }

  // 3. <title>, split and scored. Confidence is capped below og:site_name because a
  //    title always contains the page as well as the site.
  for (const seg of titleSegments(scan.title)) {
    const s = scoreNameText(seg);
    if (s <= 0) continue;
    push(seg, 0.45 + s * 0.3, "title", `Segment of <title>, scored ${s.toFixed(2)}`);
  }

  // 4. <h1>. Usually the school name on a home page, usually the article title
  //    everywhere else — and we may well be parsing a "Staff Directory" page,
  //    so it sits below <title>.
  const h1s = scan.tags.filter((t) => t.name === "h1");
  for (const h1 of h1s.slice(0, 3)) {
    const text = innerText(elementInner(scan.html, h1));
    const s = scoreNameText(text);
    if (s > 0) push(text, 0.35 + s * 0.3, "h1", `<h1>, scored ${s.toFixed(2)}`);
  }

  // 5. The alt text of the header logo. Frequently the fullest form of the name
  //    ("Lincoln High School home page"), and frequently the ONLY place the name is
  //    spelled out on a page that is otherwise all images.
  for (const img of scan.tags.filter((t) => t.name === "img")) {
    const alt = collapse(img.attrs.alt ?? "");
    if (!alt) continue;
    const looksLogo =
      /logo|crest|seal|mark/i.test(alt) ||
      /logo|crest|brand/i.test(img.attrs.class ?? "") ||
      /logo|crest|brand/i.test(img.attrs.src ?? "");
    if (!looksLogo) continue;
    const cleaned = collapse(alt.replace(/\b(logo|crest|seal|home ?page|homepage|link)\b/gi, ""));
    const s = scoreNameText(cleaned);
    if (s > 0) push(cleaned, 0.3 + s * 0.3, "logo-alt", "Alt text of a logo image");
  }

  // 6. The hostname. A bad guess, offered at a confidence that says so — but the
  //    list must never be empty, because an empty name field with no fallback is
  //    where the user has to go and find their own school's name to retype it.
  const hostName = nameFromHost(scan.host);
  if (hostName) push(hostName, 0.15, "hostname", "Derived from the domain — a guess of last resort");

  return mergeCandidates(out);
}

// ─── motto / tagline ─────────────────────────────────────────────────────────

const MOTTO_CONTAINER = /(tagline|motto|slogan|site-description|site-desc|subtitle|strapline|byline)/i;

/** Junk that lands in <meta description> on CMS pages that never set one. */
const MOTTO_JUNK =
  /(javascript|cookie|browser|©|copyright|all rights reserved|\bhttps?:|\bwww\.|@|\bphone\b|\bfax\b|\d{3}[-.]\d{3}[-.]\d{4}|skip to|read more|click here)/i;

/**
 * A motto is short, is a phrase, and is not a paragraph.
 *
 * 3–16 words: under 3 is a heading fragment ("Our Mission"), over 16 is a mission
 * STATEMENT — real, but far too long for a 1-row banner on a 16.5" frame, which is
 * the only place this string is going.
 */
function mottoScore(text: string): number {
  const t = collapse(text);
  if (!t) return 0;
  if (MOTTO_JUNK.test(t)) return 0;
  const words = t.split(" ").length;
  if (words < 3 || words > 16) return 0;
  if (t.length < 10 || t.length > 120) return 0;
  let score = 0.5;
  // Fits a banner comfortably.
  if (t.length <= 48) score += 0.15;
  // Mottos are phrases, not sentences with three clauses.
  if ((t.match(/[.;]/g) ?? []).length > 1) score -= 0.2;
  if (/[A-Z]/.test(t[0])) score += 0.05;
  return Math.max(0, Math.min(1, score));
}

export function extractMottos(scan: PageScan): TextCandidate[] {
  const out: TextCandidate[] = [];
  const push = (value: string, base: number, source: string, why?: string) => {
    const s = mottoScore(value);
    if (s <= 0) return;
    out.push({
      value: collapse(value),
      confidence: Math.max(0, Math.min(0.99, base * 0.6 + s * 0.4)),
      source,
      why,
    });
  };

  // 1. An element that literally calls itself the tagline. Nothing beats being told.
  for (const tag of scan.tags) {
    const marker = `${tag.attrs.class ?? ""} ${tag.attrs.id ?? ""}`;
    if (!MOTTO_CONTAINER.test(marker)) continue;
    if (tag.selfClosing) continue;
    push(
      innerText(elementInner(scan.html, tag)),
      0.9,
      `element:${collapse(marker).slice(0, 40)}`,
      "Element named tagline/motto/slogan",
    );
  }

  // 2. JSON-LD slogan — as deliberate as it gets, but rarer than the class name.
  for (const slogan of jsonLdStrings(scan, "slogan")) push(slogan, 0.9, "json-ld:slogan");

  // 3. og:description / meta description. Often the motto verbatim; often the
  //    first 160 characters of the news feed. `mottoScore` is what separates them,
  //    so the base is middling and the shape does the work.
  for (const key of ["og:description", "description", "twitter:description"]) {
    const value = scan.meta[key];
    if (!value) continue;
    // First sentence only: descriptions that start with the motto continue into
    // enrolment details, and the tail is what fails the length test.
    const first = value.split(/(?<=[.!?])\s+/)[0] ?? value;
    push(first, 0.5, `meta:${key}`);
  }

  // 4. A quoted phrase near the top of the page. Schools put the motto in quotes
  //    under the crest more often than they give it a class name.
  const head = scan.text.slice(0, 1200);
  for (const m of head.matchAll(/[“"]([^”"]{10,120})[”"]/g)) {
    push(m[1], 0.45, "quoted-phrase", "Quoted phrase near the top of the page");
  }

  return mergeCandidates(out, 4);
}

// ─── mascot ──────────────────────────────────────────────────────────────────

/**
 * The mascots that actually turn up on American school sites, as plurals.
 *
 * Singulars are derived, not listed (see `mascotForms`) — "Wildcat Way" and
 * "Wildcats" have to reach the same candidate.
 *
 * Deliberately omitted: the Native-imagery mascots (Braves, Chiefs, Indians,
 * Redskins, Squaws). They are being retired district by district, we would be
 * putting one on a physical object that a family keeps, and a lexicon is the wrong
 * place to make that call automatically. If a school's page says one, the
 * "Home of the …" phrase rule below still picks it up — a human typed it, and a
 * human is choosing it. What we do not do is go looking.
 */
export const MASCOT_LEXICON: readonly string[] = [
  // cats
  "Wildcats", "Bobcats", "Cougars", "Panthers", "Tigers", "Lions", "Jaguars",
  "Leopards", "Lynx", "Pumas", "Cheetahs",
  // dogs & wolves
  "Bulldogs", "Huskies", "Wolves", "Timberwolves", "Coyotes", "Foxes", "Greyhounds",
  "Terriers", "Retrievers",
  // bears & big mammals
  "Bears", "Grizzlies", "Kodiaks", "Bison", "Buffaloes", "Longhorns", "Rams",
  "Bighorns", "Badgers", "Wolverines", "Otters", "Beavers", "Elk", "Moose",
  // horses
  "Mustangs", "Broncos", "Stallions", "Colts", "Chargers", "Bronchos",
  // birds
  "Eagles", "Golden Eagles", "Hawks", "Falcons", "Cardinals", "Ravens", "Owls",
  "Bluejays", "Jays", "Roadrunners", "Penguins", "Pelicans", "Ospreys", "Kestrels",
  "Thunderbirds", "Firebirds", "Phoenix", "Cranes", "Herons",
  // water
  "Dolphins", "Sharks", "Marlins", "Barracudas", "Gators", "Alligators", "Sea Lions",
  "Mariners", "Sailors", "Admirals", "Commodores", "Buccaneers", "Pirates",
  // reptiles & insects
  "Cobras", "Vipers", "Rattlers", "Diamondbacks", "Scorpions", "Hornets",
  "Yellowjackets", "Bees", "Wasps", "Dragons", "Griffins", "Unicorns",
  // people & professions
  "Knights", "Vikings", "Spartans", "Trojans", "Titans", "Warriors", "Patriots",
  "Pioneers", "Pilots", "Miners", "Lumberjacks", "Saints", "Crusaders", "Cavaliers",
  "Generals", "Minutemen", "Colonials", "Rebels", "Raiders", "Monarchs", "Royals",
  "Kings", "Queens", "Governors", "Senators", "Mountaineers", "Explorers",
  "Voyagers", "Navigators", "Astronauts", "Cowboys", "Ranchers", "Scots",
  "Highlanders", "Gaels", "Celtics", "Aztecs", "Mavericks",
  // weather & sky
  "Rockets", "Comets", "Jets", "Stars", "Meteors", "Tornadoes", "Cyclones",
  "Hurricanes", "Storm", "Lightning", "Thunder", "Blaze", "Flames", "Suns",
  "Eclipse", "Galaxy",
  // plants & other
  "Oaks", "Redwoods", "Pines", "Cardinals", "Chargers", "Chieftains",
];

/**
 * Words that are part of a mascot's name rather than the next word in the sentence.
 *
 * "Home of the Golden Eagles" is two words; "Home of the Nanooks since 1932" is one,
 * and an unconditional two-word capture returns "Nanooks Since" — which it did, on
 * the first run of this test. Requiring the SECOND word to be capitalised is not
 * enough either: "Home of the Eagles Marching Band" is two capitals and one mascot.
 * So the second word is only taken when the first is a known modifier.
 */
const MASCOT_MODIFIERS = new Set([
  "golden", "fighting", "sea", "red", "blue", "green", "black", "white", "silver",
  "mighty", "little", "flying", "thunder", "war", "big", "wild", "rough", "iron",
  "purple", "orange", "scarlet", "crimson", "royal", "night",
]);

function joinMascotWords(first: string, second: string | undefined): string {
  const a = collapse(first);
  const b = collapse(second ?? "");
  if (!b) return a;
  return MASCOT_MODIFIERS.has(a.toLowerCase()) ? `${a} ${b}` : a;
}

/** "Wildcats" → ["wildcats", "wildcat"]. Plural-only lexicon, both forms matched. */
function mascotForms(canonical: string): string[] {
  const lower = canonical.toLowerCase();
  const forms = new Set<string>([lower]);
  if (lower.endsWith("ies")) forms.add(`${lower.slice(0, -3)}y`);
  else if (lower.endsWith("es") && /(ch|sh|s|x|z)es$/.test(lower)) forms.add(lower.slice(0, -2));
  else if (lower.endsWith("s") && !lower.endsWith("ss")) forms.add(lower.slice(0, -1));
  return [...forms];
}

const LEXICON_INDEX: { canonical: string; re: RegExp }[] = MASCOT_LEXICON.map((canonical) => ({
  canonical,
  re: new RegExp(`\\b(?:${mascotForms(canonical).join("|")})\\b`, "gi"),
}));

export function extractMascots(scan: PageScan): TextCandidate[] {
  const out: TextCandidate[] = [];
  const push = (value: string, confidence: number, source: string, why?: string) => {
    const v = titleCase(value);
    if (!v || v.length > 40) return;
    out.push({ value: v, confidence: Math.max(0, Math.min(0.99, confidence)), source, why });
  };

  const text = scan.text;
  const headline = `${scan.title} ${scan.meta["og:site_name"] ?? ""} ${scan.meta["og:description"] ?? ""}`;

  // 1. The phrase. "Home of the Eagles" is a school TELLING you its mascot, and it
  //    is the one source that works for mascots no lexicon will ever contain — the
  //    Nanooks, the Pretzels, the Fighting Artichokes are all real.
  for (const m of text.matchAll(
    /\bhome (?:of|to) the\s+(?:fighting\s+)?([A-Za-z][A-Za-z'’-]*)(\s+[A-Za-z][A-Za-z'’-]*)?/gi,
  )) {
    push(joinMascotWords(m[1], m[2]), 0.92, "phrase:home-of-the", `Matched "${collapse(m[0])}"`);
  }
  // `[Gg]o` rather than the /i flag: the capture has to stay case-SENSITIVE so it
  // only takes a capitalised word. With /i on the whole pattern this matched
  // "go home." and offered "Home" as a mascot. Found by running it on the WordPress
  // fixture, where a case-sensitive `\bgo` had silently missed "Go Wildcats!"
  // entirely and let the weaker lexicon rule answer instead.
  for (const m of text.matchAll(/\b[Gg]o\s+([A-Z][A-Za-z'’-]{2,20})[!,.]/g)) {
    push(m[1], 0.7, "phrase:go-x", `Matched "${collapse(m[0])}"`);
  }
  // "#EaglePride", "#GoEagles" — the hashtag is a deliberate brand statement.
  for (const m of text.matchAll(/#([A-Z][a-z]+)(?:Pride|Nation|Strong|Family)\b/g)) {
    push(`${m[1]}s`, 0.6, "hashtag", `Matched "${collapse(m[0])}"`);
  }

  // 2. The lexicon, weighted by WHERE it appears. A mascot in the <title> is part of
  //    the school's identity; the same word once in a news item is a coincidence
  //    ("the eagles have returned to the wetlands").
  for (const { canonical, re } of LEXICON_INDEX) {
    re.lastIndex = 0;
    const inHeadline = re.test(headline);
    re.lastIndex = 0;
    const bodyHits = (text.match(re) ?? []).length;
    if (!inHeadline && bodyHits === 0) continue;
    if (inHeadline) {
      push(canonical, 0.68, "lexicon:headline", "In the page title or site name");
    }
    if (bodyHits >= 3) {
      // Three separate mentions is the point where it stops looking accidental.
      push(canonical, 0.55, "lexicon:repeated", `Mentioned ${bodyHits} times in the page text`);
    } else if (bodyHits > 0) {
      push(canonical, 0.3, "lexicon:mentioned", "Mentioned once or twice in the page text");
    }
  }

  // 3. Class and id names. `.mascot-eagles`, `#eaglesLogo` — markup that was named
  //    by the person who built the site, which is a better witness than body copy.
  const markers = scan.tags
    .map((t) => `${t.attrs.class ?? ""} ${t.attrs.id ?? ""}`)
    .join(" ");
  for (const { canonical, re } of LEXICON_INDEX) {
    re.lastIndex = 0;
    if (re.test(markers)) push(canonical, 0.45, "markup-name", "Used in a class or id name");
  }

  return mergeCandidates(out, 4);
}

// ─── colours ─────────────────────────────────────────────────────────────────

/** Custom-property names that mean "this is the brand colour", across platforms. */
const BRAND_PROP =
  /(^|-)(primary|secondary|brand|school|accent|theme|main|spirit|color-?1|color-?2)(-|$)/i;
/** Platform-specific palette prefixes worth trusting on sight. */
const PLATFORM_PROP = /^--(fs|edlio|wp--preset--color|sqs|apptegy)/i;
/** Selectors whose background is, in practice, the school's colour. */
const CHROME_SELECTOR =
  /(^|[\s.#>])(site-)?(header|masthead|banner|topbar|top-bar|navbar|nav|site-title|brand|hero)(\b|[-_])/i;

interface RawColor {
  hex: string;
  confidence: number;
  source: string;
  why?: string;
}

/** Walk flat CSS rules. Nested at-rules fall out naturally — see the comment. */
function cssRules(css: string): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = [];
  // `[^{}]*` on both sides means an `@media …{ .a{…} }` wrapper can never match as a
  // rule (its body contains braces); the engine backtracks past it and matches the
  // INNER rule instead, which is exactly what we want — media-query colours are
  // still the school's colours.
  for (const m of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    out.push({ selector: collapse(m[1]), body: m[2] });
  }
  return out;
}

function declarations(body: string): { prop: string; value: string }[] {
  const out: { prop: string; value: string }[] = [];
  for (const decl of body.split(";")) {
    const idx = decl.indexOf(":");
    if (idx < 0) continue;
    out.push({ prop: collapse(decl.slice(0, idx)).toLowerCase(), value: collapse(decl.slice(idx + 1)) });
  }
  return out;
}

/**
 * Is this hex a neutral — white, black, or a grey?
 *
 * NOT a reason to drop it. A depressing number of schools are black-and-gold or
 * silver-and-blue, and dropping neutrals would lose half of a real palette. It is a
 * reason to distrust it, because EVERY page also declares #FFFFFF for the body and
 * #333333 for text, and on raw frequency those beat the crest's navy every time.
 *
 * Thresholds: saturation under 0.12 is visually grey; luminance over 0.93 or under
 * 0.06 is white/black regardless of what tiny saturation it carries.
 */
function isNeutral(hex: string): boolean {
  const sat = colorSaturation(hex);
  const lum = colorLuminance(hex);
  return sat < 0.12 || lum > 0.93 || lum < 0.06;
}

/**
 * Colour WORDS, as schools actually write them.
 *
 * Deliberately not the CSS named-colour list: `purple` in CSS is #800080, a colour
 * no school uses, and half the CSS names (`peru`, `thistle`) never appear on a
 * school site. These are the shades that show up on real gym walls, with hex values
 * chosen to look like the ink a school would actually print.
 *
 * Multi-word entries must be matched BEFORE their single-word parts, or "vegas
 * gold" matches as plain "gold" — hence the length sort where this is used.
 */
const COLOR_WORDS: ReadonlyArray<readonly [string, string]> = [
  ["columbia blue", "#9BDDFF"], ["carolina blue", "#4B9CD3"], ["royal blue", "#1E3A8A"],
  ["light blue", "#7EC8E3"], ["powder blue", "#B0E0E6"], ["sky blue", "#87CEEB"],
  ["navy blue", "#1B2A4A"], ["vegas gold", "#C5B358"], ["old gold", "#CFB53B"],
  ["athletic gold", "#FFB81C"], ["forest green", "#1B4D3E"], ["kelly green", "#2E8B57"],
  ["hunter green", "#355E3B"], ["dark green", "#1B4D3E"], ["burnt orange", "#CC5500"],
  ["cardinal red", "#8C1D40"], ["brick red", "#8B2500"], ["dark red", "#8B1A1A"],
  ["light gray", "#C8CBD0"], ["light grey", "#C8CBD0"],
  ["navy", "#1B2A4A"], ["maroon", "#6E1F2E"], ["crimson", "#9E1B32"], ["scarlet", "#B02020"],
  ["cardinal", "#8C1D40"], ["burgundy", "#6E1F2E"], ["purple", "#4E2A84"],
  ["violet", "#5B2C8D"], ["gold", "#C9A227"], ["orange", "#E36414"], ["teal", "#0F5C6B"],
  ["turquoise", "#30A5A5"], ["green", "#1B6B3A"], ["blue", "#1B4C9B"], ["red", "#B3202C"],
  ["yellow", "#F3C518"], ["silver", "#C0C0C0"], ["black", "#111111"], ["white", "#FFFFFF"],
  ["gray", "#808080"], ["grey", "#808080"], ["brown", "#5A3A22"], ["pink", "#D64C8B"],
];

/** "school colors", "colours are", "team colors" — the phrase that introduces them. */
const COLOR_PHRASE =
  /\b(?:school|team|official|our)?\s*colou?rs?\s*(?:are|:|of|include)?\s*([^.!?\n]{0,80})/gi;

/**
 * Colours a page states IN WORDS.
 *
 * This existed as a gap for a long time and it is embarrassing in hindsight: the
 * scanner read stylesheets to infer that a school was purple, while the page said
 * "our school colors are purple and white" in plain English a few hundred bytes
 * away. A site whose palette lives in a hashed CSS bundle or a JS-rendered theme
 * defeats every other colour source here and loses nothing to this one.
 *
 * Scoped to the sentence following a "colors are" phrase rather than scanning the
 * whole document, because a page mentioning "the red barn" in a news item is not
 * declaring a brand colour. That scoping is the entire reason this can be trusted
 * at a confidence above raw frequency.
 */
export function colorWordsInText(text: string): { hex: string; word: string }[] {
  // Longest first: "vegas gold" must win over "gold" on the same characters.
  const byLength = [...COLOR_WORDS].sort((a, b) => b[0].length - a[0].length);
  const out: { hex: string; word: string }[] = [];
  const seen = new Set<string>();

  for (const m of text.matchAll(COLOR_PHRASE)) {
    let clause = ` ${m[1].toLowerCase()} `;
    for (const [word, hex] of byLength) {
      if (!clause.includes(` ${word} `) && !clause.includes(` ${word},`) &&
          !clause.includes(` ${word}.`) && !clause.includes(` ${word}&`)) continue;
      // Consume the match so a longer name cannot be re-counted as its own suffix.
      clause = clause.split(word).join(" ");
      if (seen.has(hex)) continue;
      seen.add(hex);
      out.push({ hex, word });
    }
    // Two or three colours is a scheme; a run of eight is a paint chart.
    if (out.length >= 4) break;
  }
  return out.slice(0, 4);
}

export function extractColors(scan: PageScan): ColorCandidate[] {
  const raw: RawColor[] = [];
  const push = (value: string, confidence: number, source: string, why?: string) => {
    const hex = normalizeColor(value);
    if (!hex) return; // var(), currentColor, transparent, a gradient keyword…
    raw.push({ hex, confidence, source, why });
  };

  // 1. theme-color. One value, set on purpose, used by the OS chrome — the single
  //    most reliable "our colour is this" declaration a page can make.
  if (scan.meta["theme-color"]) {
    push(scan.meta["theme-color"], 0.75, "meta:theme-color");
  }
  if (scan.meta["msapplication-tilecolor"]) {
    push(scan.meta["msapplication-tilecolor"], 0.6, "meta:msapplication-TileColor");
  }

  // 2. CSS custom properties. This is where every modern school theme keeps its
  //    palette, and it is why `styleBlocks` had to scan the whole document rather
  //    than <head> — Edlio's `:root` block is inside <main>.
  for (const css of scan.styles) {
    for (const rule of cssRules(css)) {
      const isRoot = /(^|,)\s*(:root|html|body)\s*$/i.test(rule.selector);
      for (const { prop, value } of declarations(rule.body)) {
        if (prop.startsWith("--")) {
          const named = BRAND_PROP.test(prop) || PLATFORM_PROP.test(prop);
          if (!isRoot && !named) continue;
          push(
            value,
            named ? 0.9 : 0.55,
            `css-var:${prop}`,
            named ? `Custom property ${prop} names itself a brand colour` : `Custom property ${prop} on ${rule.selector}`,
          );
          continue;
        }
        if (!CHROME_SELECTOR.test(rule.selector)) continue;
        if (prop === "background" || prop === "background-color") {
          // A `background` shorthand can be `#0B3D91 url(x) no-repeat`; take the
          // first token that parses as a colour and ignore the rest.
          for (const token of value.split(/\s+/)) {
            const hex = normalizeColor(token);
            if (hex) {
              push(token, 0.62, "css:chrome-background", `${rule.selector} { ${prop} }`);
              break;
            }
          }
        } else if (prop === "color" || prop === "border-color" || prop === "border-bottom-color") {
          push(value, 0.45, "css:chrome-foreground", `${rule.selector} { ${prop} }`);
        }
      }
    }
  }

  // 3. Inline styles on the chrome elements themselves. CMS page builders write
  //    these constantly and they override the stylesheet, so they are what the
  //    visitor actually sees.
  for (const tag of scan.tags) {
    const style = tag.attrs.style;
    if (!style) continue;
    const marker = `${tag.name} ${tag.attrs.class ?? ""} ${tag.attrs.id ?? ""}`;
    if (!CHROME_SELECTOR.test(marker)) continue;
    for (const { prop, value } of declarations(style)) {
      if (prop === "background" || prop === "background-color") {
        push(value.split(/\s+/)[0], 0.58, "inline:chrome-background", `Inline style on <${tag.name}>`);
      }
    }
  }

  // 3b. The page SAYING its colours, in words. Ranked above frequency and below a
  //     named brand property: a sentence that reads "our school colors are purple
  //     and white" is a deliberate statement of the palette, but it names a shade
  //     rather than the school's exact ink, so a declared hex still wins.
  for (const { hex, word } of colorWordsInText(scan.text)) {
    push(hex, 0.66, "text:stated-colors", `The page says its colours are "${word}"`);
  }

  // 4. Raw frequency across all stylesheets — the floor. Weak on its own, but it is
  //    the only source that works on a hand-rolled site with no custom properties,
  //    and there are a lot of those.
  const freq = new Map<string, number>();
  for (const css of scan.styles) {
    for (const m of css.matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)/g)) {
      const hex = normalizeColor(m[0]);
      if (!hex) continue;
      freq.set(hex, (freq.get(hex) ?? 0) + 1);
    }
  }
  for (const [hex, hits] of freq) {
    // 0.18 base + 0.03/mention, capped at 0.36 — deliberately below every named
    // source above, so frequency can order the tail but never lead the list.
    push(hex, Math.min(0.36, 0.18 + hits * 0.03), "css:frequency", `Declared ${hits}x in the stylesheets`);
  }

  // ── merge ──
  const byHex = new Map<string, ColorCandidate>();
  for (const c of raw) {
    const neutral = isNeutral(c.hex);
    // The neutral penalty. 0.45 keeps a genuine `--school-black` (0.9 → 0.41) above
    // the frequency floor, so a real black-and-gold school still gets its black,
    // while the incidental #FFFFFF that appears 40 times (0.36 → 0.16) sinks.
    const confidence = neutral ? c.confidence * 0.45 : c.confidence;
    const prev = byHex.get(c.hex);
    if (!prev) {
      byHex.set(c.hex, {
        hex: c.hex,
        confidence,
        source: c.source,
        hits: 1,
        role: "accent",
        neutral,
        why: c.why,
      });
      continue;
    }
    prev.hits++;
    if (confidence > prev.confidence) {
      prev.confidence = confidence;
      prev.source = c.source;
      prev.why = c.why;
    }
  }

  const ranked = [...byHex.values()].sort(
    (a, b) => b.confidence - a.confidence || b.hits - a.hits || a.hex.localeCompare(b.hex),
  );

  // Roles are assigned by ORDER, not by property name. `--color-primary` on an Edlio
  // page is very often the link blue rather than the crest colour, so trusting the
  // name would hand the frame the wrong field colour with high confidence — the
  // exact failure this whole file is arranged to avoid.
  let slot = 0;
  for (const c of ranked) {
    c.role = slot === 0 ? "primary" : slot === 1 ? "secondary" : "accent";
    slot++;
  }

  return ranked.slice(0, 8);
}
