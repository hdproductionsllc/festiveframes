// ─── What the brand-import panel DECIDES, pulled out of the component ────────
//
// `SchoolBrandImport.tsx` renders this; it does not think. Everything with a
// judgement in it — is this candidate addable, what do we say about it, which
// suggested next action can we actually perform, which detected text is worth
// offering as a one-tap fill — lives here as a pure function over plain data.
//
// That split is not architecture for its own sake. This repo's vitest config is
// `environment: "node"` with no jsdom and no react plugin (see the comment at the top
// of vitest.config.ts), so THERE IS NO WAY TO TEST A COMPONENT HERE. A decision left
// inside the JSX is a decision with no test, and the two decisions that matter most in
// this panel are the two that were already reproduced as defects on the server side:
// handing the crop flow a preview instead of the full-res, and showing a candidate as
// usable that the resolution gate will refuse. Both are one-line mistakes that look
// completely fine on screen. They get functions, and the functions get tests.
//
// TYPE-ONLY IMPORTS BELOW ARE LOAD-BEARING. `prepare-artwork.server` pulls in
// `@napi-rs/canvas`, and this module is imported by a "use client" component. `import
// type` is erased by the compiler before the bundler ever runs, so the shapes are
// shared without the server module following them into the browser bundle. If one of
// these ever becomes a value import, the client bundle gains a native addon and the
// build breaks in a way whose error message names neither file.

import type { QcCode, QcFinding } from "@/lib/utils/artwork-qc";
import type { SectionId } from "@/lib/types";

import type { PreparedImage, ScanCandidate } from "./prepare-artwork.server";
import type { NextAction, SchoolProfile, TextCandidate } from "./types";

// ─── the Add button's gate (constraint 5) ────────────────────────────────────

/**
 * Is this candidate allowed to enter the frame?
 *
 * The server already answered this — `ScanCandidate.usable` is `isUsable(after) &&
 * resolution.usable`, computed next to the pixels. This re-asks it anyway, as an AND
 * over every signal the candidate carries, and that redundancy is the point: the
 * failure mode being guarded is a DEAD END, not a wrong pixel.
 *
 * The dead end goes like this. The picker offers a 300px crest. The user taps Add.
 * `ImageCropModal` gates on `evaluateResolution` / `BLOCK_DPI` and refuses it. There is
 * no third screen — no "use it anyway", no way back to a different candidate with the
 * crop modal open — so the user is left holding a button that does nothing, having
 * been told by our own UI that this logo was fine. Restating the gate as an AND means
 * the only drift this UI can express is toward being MORE conservative than the
 * server: a regression that flips `usable` to true can no longer reach the crop modal,
 * because `resolution.blocked` still says no.
 *
 * Which is also why this reads `resolution.blocked` and `resolution.usable` and the
 * findings SEPARATELY rather than trusting `usable` to summarise them.
 */
export function isAddable(c: ScanCandidate): boolean {
  if (!c.usable) return false;
  if (!c.resolution.usable || c.resolution.blocked) return false;
  // An error-severity finding is `isUsable`'s own veto. Re-checked here so a future
  // QC code that the server forgets to wire into `isUsable` still stops the button.
  if (c.qc.findings.some((f) => f.severity === "error")) return false;
  // Zero-area art is not a rendering problem, it is nothing. Cheap, and it keeps a
  // 0x0 raster out of `candidateAspect`'s divisor.
  return c.fullRes.width > 0 && c.fullRes.height > 0;
}

// ─── constraint 4: the full-res is the artwork ───────────────────────────────

/**
 * THE image — the one that goes to the crop flow, `putFullRes` and the print sheet.
 *
 * A three-line function with a test, because the bug it prevents is invisible on every
 * screen a human will look at. `ScanCandidate` carries two images and the wrong one is
 * the more convenient one: `preview` is already sized for an `<img>` in a 340px rail,
 * `fullRes` can be 4 MP of base64. Reach for `preview` in the card (correct) and then
 * reach for it again in the Add handler (wrong) and everything still looks right — the
 * card is right, the crop modal is right because 1200px fills a phone screen, the DPI
 * meter is even right if it measures what it was handed. It is wrong only on the
 * printed badge, weeks later, where a 2" crop taken from a 1200px preview of a 3000px
 * original threw away sixty percent of the pixels for nothing.
 *
 * `finishCandidate` asserts the same thing server-side with `checkFullResHandoff`.
 * This is the client half of the same assertion, and it exists because the server's
 * version cannot see what the component does with the object afterwards.
 */
export function artworkOf(c: ScanCandidate): PreparedImage {
  return c.fullRes;
}

/**
 * The aspect the crop must be shaped for — measured on the FULL-RES.
 *
 * Not a duplicate of `artworkOf`, and not interchangeable with the preview's aspect.
 * `planPreview` scales by a ratio and then ROUNDS both sides to whole pixels, so a
 * 1001x667 original becomes a 1200x800 preview whose aspect differs in the third
 * decimal. `useSnappetUpload.begin` feeds this number to `panelSnappetPlacement`,
 * which picks the tile span, which becomes the crop's aspect target — so a preview
 * aspect can seat the art in a span shaped fractionally wrong and hand back a crop of
 * a shape the art does not have. Small, real, and free to avoid.
 */
export function candidateAspect(c: ScanCandidate): number {
  const { width, height } = c.fullRes;
  // Matches `readImageAspect`'s own bad-aspect guard, which falls back to 1 (square)
  // rather than propagating a NaN into the placement maths.
  if (!(width > 0) || !(height > 0)) return 1;
  const a = width / height;
  return Number.isFinite(a) && a > 0 ? a : 1;
}

/**
 * Turn a `data:` URL back into a `File`, because the existing upload path takes a File.
 *
 * This is the whole trick that lets the scanner reuse `useSnappetUpload` UNCHANGED.
 * The alternative — a second placement path that takes a data URL — would be a second
 * copy of the 2x2 `minTileSpan` floor, the aspect-locked crop target and the DPI gate,
 * and the copy would drift. A File costs one base64 decode and buys the real flow.
 *
 * Throws on anything that is not a base64 `data:` URL. The server only ever emits
 * `data:image/png;base64,` (see `encode` in prepare-artwork.server), so a different
 * shape here means the response was not ours, and guessing at it would be worse than
 * failing loudly next to the button that caused it.
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  // `[\s\S]*` rather than `.*` with the `s` flag: the dotAll flag needs an es2018
  // target and this project compiles below that, so the flag is a build error rather
  // than a runtime one. A base64 payload never contains newlines anyway; this just
  // keeps the intent explicit without depending on the target.
  const match = /^data:([^;,]+);base64,([\s\S]*)$/.exec(dataUrl);
  if (!match) throw new Error("Expected a base64 data: URL for the scanned artwork.");
  const [, mime, b64] = match;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

/** Illegal-character-free, extension-correct filename for the candidate's artwork. */
export function candidateFileName(c: ScanCandidate): string {
  // The URL's last path segment is the most recognisable name available; alt text is
  // the fallback for an inline SVG, which has no URL at all.
  let stem = "";
  try {
    if (c.url) stem = new URL(c.url).pathname.split("/").filter(Boolean).pop() ?? "";
  } catch {
    stem = "";
  }
  if (!stem) stem = c.alt ?? "";
  stem = stem
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 48);
  // Always .png: `finishCandidate` re-encodes every candidate through the canvas, so
  // the bytes are PNG regardless of what the source was. Naming it .svg or .ico after
  // its origin would be a lie the OS then acts on.
  return `${stem || "school-logo"}.png`;
}

// ─── plain language ──────────────────────────────────────────────────────────

/**
 * Plain-English replacements for QC's engineer-facing messages.
 *
 * The raw text is precise and unusable in a parent-facing panel — "matte-fringe: edge
 * pixels ramp to (235,235,234) while the art is (130,130,129)" is exactly the sentence
 * that made this feature debuggable and exactly the wrong thing to put next to an Add
 * button. The technical message is still shown, as the element's `title`, so a support
 * conversation can get at it without a rebuild.
 *
 * PRESENT TENSE, describing the art AS DELIVERED. `ScanCandidate.qc.findings` comes
 * from the analysis taken AFTER `repairArtwork` ran, so a finding that is still here is
 * one the repair could not fix — "we removed the background" belongs in `repairs`, and
 * "it still has a background" belongs here. Wording them as problems-to-be-fixed would
 * describe a step that already happened.
 */
const FINDING_COPY: Record<QcCode, string> = {
  "resolution-low": "Too small to print on a 2-inch badge.",
  "resolution-marginal": "Prints, but a little soft at badge size.",
  "background-opaque": "Comes with a solid rectangle of background behind it.",
  "matte-fringe": "Has a faint halo around its edges.",
  "palette-quantized": "Saved with a reduced colour palette, so smooth shading may band.",
  "near-empty": "Almost nothing in the image — it may not have downloaded properly.",
};

export function plainFinding(f: QcFinding): string {
  return FINDING_COPY[f.code] ?? f.message;
}

export interface CandidateNotes {
  /** Card title. What this thing IS, as far as we can tell. */
  title: string;
  /** `PNG 512 × 512 · 258 DPI on a 2" badge`. Facts, no judgement. */
  spec: string;
  /** One-line verdict. Always present, addable or not. */
  verdict: string;
  /** True when the Add button is live. `isAddable`, never anything else. */
  addable: boolean;
  /** Why it cannot be added. Empty iff `addable`. */
  blockers: string[];
  /** True but not fatal. */
  cautions: string[];
  /** What we already did to it, so "why does this look different" has an answer. */
  repairs: string[];
}

/** Where a candidate came from, in words a parent can check against their own screen. */
const KIND_TITLE: Record<ScanCandidate["kind"], string> = {
  "inline-svg": "Logo drawn into the page",
  "svg-file": "Logo (vector file)",
  raster: "Logo image",
  "css-background": "Logo from the page background",
  favicon: "Browser-tab icon",
  unknown: "Image from the page",
};

export function candidateNotes(c: ScanCandidate): CandidateNotes {
  const addable = isAddable(c);
  const blockers: string[] = [];
  const cautions: string[] = [];

  for (const f of c.qc.findings) {
    (f.severity === "error" ? blockers : cautions).push(plainFinding(f));
  }
  // The resolution gate gets its own line when IT is the refusal and QC did not
  // already say so. The two agree in every case we have measured (artwork-qc's
  // MIN_DPI literally imports print-resolution's BLOCK_DPI), but "agree today" is not
  // "cannot disagree", and a blocked candidate with an empty blockers list would be a
  // button that is off for no stated reason.
  if (c.resolution.blocked && !c.qc.findings.some((f) => f.code === "resolution-low")) {
    blockers.push(c.resolution.message);
  }
  if (!addable && blockers.length === 0) {
    blockers.push("This one can't be printed at badge size.");
  }

  const alt = (c.alt ?? "").trim();
  const title = alt ? `${KIND_TITLE[c.kind]} — “${alt}”` : KIND_TITLE[c.kind];

  // A favicon is 32px or 64px and will always be blocked; saying so up front is
  // kinder than letting the DPI number be the explanation.
  const isVector = c.kind === "inline-svg" || c.kind === "svg-file";
  const spec = [
    `${c.fullRes.width} × ${c.fullRes.height}`,
    isVector
      ? "vector — sharp at any size"
      : `${Math.round(c.resolution.dpi)} DPI on a 2" badge`,
  ].join(" · ");

  const verdict = addable
    ? isVector
      ? "Vector art — sharp at any size."
      : c.resolution.level === "green"
        ? "Sharp at badge size."
        : "Prints, but softer than we'd like."
    : blockers[0];

  return { title, spec, verdict, addable, blockers, cautions, repairs: c.qc.repairs };
}

// ─── constraint 6: every state ends somewhere the user can go ────────────────

/**
 * The suggested actions this panel can actually carry out.
 *
 * `describeOutcome` and `buildEmptyState` return `NextAction[]` for the SHAPE of the
 * problem, not for this particular screen — they are pure and know nothing about what
 * is wired up. Three of the four ids map onto something real here:
 *
 *   upload-photo     → the panel's own file input, feeding the same `useSnappetUpload`
 *                      flow as the Upload button below it. The action that always works.
 *   try-another-page → clears and focuses the URL field.
 *   type-it-in       → selects the bottom banner and puts it in text mode, which is
 *                      where somebody who has given up on the scan wants to be.
 *
 * `paste-image-url` is deliberately DROPPED rather than rendered. Nothing in this app
 * accepts a direct image URL — `/api/school/brand-scan` takes a page and parses it —
 * so the button would open nothing. A dead button in an error state is worse than one
 * fewer option: it reads as the app being broken on top of whatever already failed,
 * and it costs the user a click to find that out. When an image-URL endpoint exists,
 * delete it from this set and wire the handler; the tests below will start requiring it.
 */
export const PERFORMABLE_ACTIONS: ReadonlySet<NextAction["id"]> = new Set<NextAction["id"]>([
  "upload-photo",
  "try-another-page",
  "type-it-in",
]);

/**
 * Filter to what we can do, and GUARANTEE the result is non-empty.
 *
 * The fallback is not defensive padding — it is the invariant the whole error taxonomy
 * rests on. Every dead end in this feature has to end somewhere, and "Upload a photo"
 * is the one action that works no matter what a school's website did, so it is
 * appended rather than assumed. An empty action row is a state the user cannot leave.
 */
export const ALWAYS_WORKS: NextAction = {
  id: "upload-photo",
  label: "Upload a photo",
  primary: true,
};

export function performableActions(actions: readonly NextAction[]): NextAction[] {
  const kept = actions.filter((a) => PERFORMABLE_ACTIONS.has(a.id));
  return kept.length ? kept : [ALWAYS_WORKS];
}

// ─── one-tap fills for the banner ────────────────────────────────────────────

/**
 * Below this we show nothing rather than a chip.
 *
 * The number is read off `extractSchoolNames`'s own scale, not invented: the hostname
 * fallback — "a guess of last resort", by its own comment — is pushed at 0.15, and the
 * weakest real source (`<h1>`, which on an interior page is the article headline) is
 * pushed at 0.35 plus its score. 0.30 sits in that gap.
 *
 * The asymmetry is what sets it. A chip is not a suggestion, it is an ASSERTION — it
 * is labelled "School name" and tapping it OVERWRITES what is in the banner. Offering
 * "Lincolnhigh" (the domain, de-camel-cased) under that label costs the user a
 * retype plus the moment of wondering whether we know something they don't. Offering
 * nothing costs them exactly what they had before the scan: an empty field and a
 * keyboard. So the threshold is set to exclude the guess of last resort, and text
 * below it simply does not appear.
 */
export const MIN_FILL_CONFIDENCE = 0.3;

/**
 * At most this many chips per kind.
 *
 * The tools rail is 340px wide (see SchoolDesigner's grid template) and a chip is a
 * full school name, so three is roughly three rows. Past that the alternatives stop
 * being "in case the first is wrong" and start being a list to read, which is the
 * problem the ranking exists to solve.
 */
export const MAX_FILLS_PER_KIND = 3;

export interface BannerFill {
  kind: "name" | "motto" | "mascot";
  value: string;
  /** Which banner this writes into. */
  section: SectionId;
  /** Which field of that banner — `setSectionText(section, { [field]: value })`. */
  field: "text" | "tagline";
  /** Group heading for the chip row. */
  label: string;
  /** Where it will land, said out loud, because the chip changes a panel off-screen. */
  hint: string;
  confidence: number;
}

/**
 * Which banner each kind of text belongs in.
 *
 * Not arbitrary, and not a preference — it falls out of the frame's geometry, which
 * CLAUDE.md records: the TOP strip is one row tall, too short for a 2x2 badge, so
 * `sectionSupportsTiles` forces it to text forever. It is the only section that is
 * guaranteed to be a text banner, which makes it the right home for the one piece of
 * text every school frame has: the name.
 *
 * The BOTTOM banner is two rows, so it renders a headline and — when `tagline` is
 * filled — a smaller second tier beneath it (see banner-tiers). A mascot is a shout
 * and belongs in the headline; a motto is a quiet line and belongs in the tier under
 * it. Putting both in `text` would make the second overwrite the first.
 */
const FILL_TARGET: Record<BannerFill["kind"], { section: SectionId; field: "text" | "tagline" }> = {
  name: { section: "top", field: "text" },
  mascot: { section: "bottom", field: "text" },
  motto: { section: "bottom", field: "tagline" },
};

const FILL_LABEL: Record<BannerFill["kind"], string> = {
  name: "School name",
  mascot: "Mascot",
  motto: "Motto",
};

const FILL_HINT: Record<BannerFill["kind"], string> = {
  name: "→ Top bar",
  mascot: "→ Bottom banner headline",
  motto: "→ Bottom banner tagline",
};

function fillsFor(kind: BannerFill["kind"], candidates: readonly TextCandidate[]): BannerFill[] {
  const target = FILL_TARGET[kind];
  const seen = new Set<string>();
  const out: BannerFill[] = [];
  for (const c of candidates) {
    if (c.confidence < MIN_FILL_CONFIDENCE) continue;
    const value = c.value.trim();
    if (!value) continue;
    // Case-insensitive dedupe. `mergeCandidates` already dedupes exactly, but "Lincoln
    // High School" from <title> and "LINCOLN HIGH SCHOOL" from a logo alt survive it as
    // two entries and read as a bug in the chip row.
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      kind,
      value,
      section: target.section,
      field: target.field,
      label: FILL_LABEL[kind],
      hint: FILL_HINT[kind],
      confidence: c.confidence,
    });
    if (out.length >= MAX_FILLS_PER_KIND) break;
  }
  return out;
}

/**
 * The chips, grouped and ordered name → mascot → motto.
 *
 * That order is the order of certainty, which is also the order of usefulness: the
 * name is extracted from structured data on a good page and is the thing the frame is
 * for; a motto comes from a `<meta description>` that half of school CMSes never set,
 * and is the most likely of the three to be somebody's boilerplate.
 */
export function bannerFills(
  profile: Pick<SchoolProfile, "names" | "mascots" | "mottos">,
): BannerFill[] {
  return [
    ...fillsFor("name", profile.names),
    ...fillsFor("mascot", profile.mascots),
    ...fillsFor("motto", profile.mottos),
  ];
}

// ─── the URL field ───────────────────────────────────────────────────────────

/**
 * Should the Scan button be live?
 *
 * Deliberately permissive. The server does the real validation — `checkUrlShape`, then
 * `assertPublicUrl`, then DNS — and it has copy for every way that can fail. All this
 * decides is whether pressing the button could conceivably do anything, so it only
 * refuses what is definitely not an address: empty, no dot in the host, or past the
 * 2048-character ceiling the route enforces (which is itself the practical URL limit
 * every browser and proxy already imposes).
 *
 * A stricter client-side regex would be the wrong trade. Rejecting "lincolnhigh.org"
 * because it has no scheme, or an IDN because it has non-ASCII, produces a disabled
 * button with no explanation — and the route already accepts a bare hostname on
 * purpose, because that is what people actually paste.
 */
export function isSubmittableUrl(raw: string): boolean {
  const v = raw.trim();
  if (!v || v.length > 2048) return false;
  const host = v
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .split(/[/?#]/)[0]
    .replace(/^[^@]*@/, "")
    .replace(/:\d+$/, "");
  return host.includes(".") && host.length >= 4;
}
