// ─── School branding: the shapes ─────────────────────────────────────────────
//
// A parent pastes their school's website URL and we try to come back with the
// crest, the colours, the mascot and the motto — enough to seed a frame without
// them hunting for files. Everything in this folder is PURE: HTML string in, data
// out. No fetch, no DOM, no canvas.
//
// That is not tidiness, it is the only way this code can be tested at all. The
// sandbox this was written in cannot reach a school website (every CONNECT is
// answered with a 403 by the proxy), so a "it worked against lincolnhigh.org"
// test would have been a lie. Instead the parsing is a pure function over a
// string, and the strings live in `__fixtures__/`, written by hand from the
// patterns each platform documents and emits.
//
// The whole file is built around one belief, learned the hard way on the artwork
// side: A CONFIDENT WRONG ANSWER IS WORSE THAN THREE ORDERED GUESSES. Every
// extractor therefore returns a ranked list, never a single value. The UI can
// show the top one and keep the rest a click away; it can never show a wrong name
// with no way back.

/** Which CMS the page was built by. Drives where we look, not whether we look. */
export type SchoolPlatform =
  | "edlio"
  | "finalsite"
  | "apptegy"
  | "wordpress"
  | "squarespace"
  | "unknown";

/**
 * `unknown` is a first-class outcome, not a failure. A large minority of school
 * sites are hand-rolled or run on a platform nobody has fingerprinted, and those
 * pages still have a <title>, a header <img>, and a stylesheet full of hex. The
 * generic path has to produce a usable profile on its own; platform detection only
 * ever ADDS hints (and removes vendor marks), it never gates extraction.
 */
export interface PlatformDetection {
  platform: SchoolPlatform;
  /** 0–1. How much the fingerprints agreed. */
  confidence: number;
  /** Human-readable signals that fired, best first. Shown in the debug panel. */
  signals: string[];
}

/** Where a candidate came from. Kept as a string so new sources need no type churn. */
export type CandidateSource = string;

/** A ranked guess at a piece of text — name, motto, mascot. */
export interface TextCandidate {
  value: string;
  /** 0–1, comparable ACROSS sources (that is the point of the constants below). */
  confidence: number;
  source: CandidateSource;
  /** Why this one scored the way it did. Debug copy, safe to show. */
  why?: string;
}

/** A ranked guess at a brand colour. */
export interface ColorCandidate {
  /** Always `#RRGGBB`, uppercase. Alpha is dropped — a print colour has no alpha. */
  hex: string;
  confidence: number;
  source: CandidateSource;
  /** How many separate places in the document declared this colour. */
  hits: number;
  /**
   * Guessed slot. Assigned by ORDER after ranking, not by name, because
   * `--color-primary` on an Edlio page is frequently the link blue rather than the
   * school's colour.
   */
  role: "primary" | "secondary" | "accent";
  /**
   * Near-white / near-black / near-grey. NOT dropped — plenty of schools really are
   * black-and-gold — but heavily down-weighted, because every page on earth also
   * declares #FFFFFF and #333333 for reasons that have nothing to do with a crest.
   */
  neutral: boolean;
  why?: string;
}

/** How a logo will have to be turned into pixels. Decides which risks apply. */
export type LogoKind =
  | "inline-svg"
  | "svg-file"
  | "raster"
  | "css-background"
  | "favicon"
  | "unknown";

/** A ranked candidate for "the school's mark". */
export interface LogoCandidate {
  /** Absolute URL, or `""` for an inline SVG (whose bytes are in `svgSource`). */
  url: string;
  kind: LogoKind;
  source: CandidateSource;
  /** Additive score from `scoreLogoCandidate`. Higher is better; can go negative. */
  score: number;
  /** Markup-declared size, when the page bothered to say. Not the real size. */
  declaredWidth?: number;
  declaredHeight?: number;
  alt?: string;
  /** Present for `inline-svg` only: the full `<svg>…</svg>` source. */
  svgSource?: string;
  /**
   * Render risks from `svgRenderRisks`. A NON-EMPTY list is fatal: the candidate is
   * dropped before ranking, never merely down-weighted. See svg-risks.ts for the
   * black-blob measurement that forced that rule.
   */
  risks: string[];
  /** Byte offset of the element in the source HTML. Used for vendor-range checks. */
  offset: number;
  /** Set when the candidate was hard-dropped; it is kept for the debug panel only. */
  dropped?: DropReason;
}

/** Why a candidate never made the list. Distinguishable on purpose. */
export type DropReason =
  | "vendor-mark"
  | "svg-render-risk"
  | "undecodable-format"
  | "tracking-pixel"
  | "social-icon"
  | "duplicate";

/**
 * The one thing the UI actually consumes.
 *
 * Note what is NOT here: a single `name: string`, a single `logoUrl: string`. Every
 * field that could be wrong is a ranked list, and `empty` is a state the caller has
 * to handle rather than an empty array it can quietly render as nothing.
 */
export interface SchoolProfile {
  pageUrl: string;
  /** Hostname of `pageUrl`, lowercased. `""` if the URL would not parse. */
  host: string;
  platform: SchoolPlatform;
  platformConfidence: number;
  platformSignals: string[];
  names: TextCandidate[];
  mottos: TextCandidate[];
  mascots: TextCandidate[];
  colors: ColorCandidate[];
  /** Ranked, vendor-filtered, de-duped, risk-free logo candidates. Best first. */
  logos: LogoCandidate[];
  /** Everything that was thrown away, WITH the reason. Debug panel + tests. */
  droppedLogos: LogoCandidate[];
  /**
   * Filenames seen on `og:image` and friends. Weak hints ONLY — see
   * rank-candidates.ts for why og:image is not allowed to be a logo candidate.
   */
  imageHints: string[];
  /** True when there is no logo worth offering. The caller must show `emptyState`. */
  empty: boolean;
  emptyState: EmptyState | null;
  /** Non-fatal notes about the page, for the debug panel. */
  warnings: string[];
}

/** An action the user can actually take. `id` is what the caller switches on. */
export interface NextAction {
  id: "upload-photo" | "try-another-page" | "paste-image-url" | "type-it-in";
  label: string;
  /** True for the one action that always works no matter what the site did. */
  primary: boolean;
}

/**
 * The empty state is the MOST LIKELY OUTCOME, not the sad path.
 *
 * Most school home pages carry one 180px-wide PNG crest and nothing else, and a
 * 180px crest is ~90 DPI on a 2" badge — blocked by `evaluateResolution` before the
 * user ever sees a crop handle. So "we found nothing you can print" is the common
 * case, and it gets designed copy and a working next action rather than a spinner
 * that stops.
 */
export interface EmptyState {
  headline: string;
  detail: string;
  actions: NextAction[];
}

// ─── Error taxonomy (constraint 6) ───────────────────────────────────────────
//
// The fetch itself lives outside this folder — it needs the network, so it cannot
// be here or be tested here. What CAN live here, and be tested here, is the
// decision about what each failure MEANS and what we say about it. That decision is
// where the actual product damage was: everything used to collapse into "Couldn't
// read that page", which is indistinguishable from our own bug and leaves the user
// with nothing to do.
//
// One rule governs the shape: exactly ONE outcome is deliberately opaque.

export type PageOutcome =
  | { kind: "ok" }
  /** robots.txt says no. Their call; say so plainly and offer the alternative. */
  | { kind: "blocked-by-robots"; rule?: string }
  /** A validated public host answered, and answered badly. 4xx/5xx. */
  | { kind: "blocked-by-site"; status: number }
  /** 200, but it is a PDF / an image / JSON. Nothing to parse. */
  | { kind: "not-html"; contentType?: string }
  | { kind: "timeout"; ms: number }
  /**
   * The SSRF guard refused the address, or DNS did not resolve.
   *
   * THE ONE OPAQUE MESSAGE, on purpose. Distinguishing "that host does not exist"
   * from "that host resolves to 10.0.0.5 and we won't touch it" turns this endpoint
   * into an internal-network scanner: an attacker submits URLs and reads our error
   * text as an oracle for what is alive behind the firewall. Both cases therefore
   * produce the same words and the same next action.
   */
  | { kind: "unreachable" };

export type PageOutcomeKind = PageOutcome["kind"];

/** What the user is shown for an outcome. Always has at least one action. */
export interface OutcomeCopy {
  headline: string;
  detail: string;
  actions: NextAction[];
  /** True when retrying the same URL could plausibly work. Drives a Retry button. */
  retryable: boolean;
}
