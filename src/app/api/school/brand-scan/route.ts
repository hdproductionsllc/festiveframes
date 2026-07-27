// ─────────────────────────────────────────────────────────────────────────────
// POST /api/school/brand-scan — "paste your school's website, get its branding"
//
// A parent pastes a URL. We fetch that page, parse it with the PURE
// `src/lib/school-brand` package, then fetch and quality-check the logo candidates
// it ranked, and hand back the ones that would actually survive being printed on a
// 2" badge.
//
// This handler is deliberately thin. Everything with a decision in it lives next
// door and is unit-tested there:
//   - what to look for, what to rank, what to say  → the pure package
//   - which addresses we may touch, which bytes are safe to decode, what a
//     transport failure MEANS                       → `guard.server.ts`
//   - decode/QC/repair/package one candidate        → `prepare-artwork.server.ts`
// What is left here is sequencing and budgets, because that is the part that cannot
// be tested in a sandbox where every CONNECT is answered "403".
//
// FIVE THINGS ARE NOT STYLE CHOICES. Each was reproduced against this repo, and each
// is enforced in one of the modules above rather than here:
//
//   1. An Illustrator-exported SVG (`<style>.st0{fill:#C8102E}</style>` +
//      `class="st0"`) rasterises to meanRGB [0,0,0] under the installed
//      @napi-rs/canvas — a correctly-sized, fully-opaque black silhouette that
//      passes every QC check we own. Refused at SOURCE level before ranking, and
//      again at PIXEL level after rendering.
//   2. TIFF SEGFAULTS the decoder outright (exit 139). ICO is subtler and the
//      subtlety nearly got the block reverted: a WELL-FORMED ICO decodes fine, but
//      a truncated one exits 139, garbage exits 139, and absurd dimensions exit 132
//      on a SkBitmap assert. Telling a good ICO from a bad one requires decoding it,
//      which is the thing that kills the process — a signal, not an exception, and
//      in a shared container it takes every concurrent request with it.
//      `/favicon.ico` is a candidate source by definition. Magic-byte ALLOWLIST,
//      applied before any decoder.
//   3. 10 MP of RGBA through analyzeArtwork + repairArtwork measured +480 MB.
//      Dimensions come from the container header before anything is allocated,
//      decodes are capped at 4 MP, and candidates are processed SEQUENTIALLY.
//   4. The preview is not the artwork. Full-res and a <=1200px card thumbnail are
//      separate fields, and the handoff is asserted rather than commented.
//   5. Exactly ONE error message is opaque — `unreachable`, covering the SSRF guard
//      and DNS together. Everything else (robots, 4xx/5xx, not-html, timeout) is a
//      distinguishable state with its own copy and its own next action.
//
// The most likely outcome of a SUCCESSFUL scan is zero usable candidates: a typical
// school header logo is ~200px wide and a 2" badge needs ~397px. That is designed
// for, not defaulted to — `buildEmptyState` writes copy about the ARTWORK ("nothing
// on this page prints at 2 inches") with "Upload a photo" as the primary action.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

import {
  buildEmptyState,
  classifyHttpStatus,
  describeOutcome,
  looksLikeHtml,
  parseSchoolPage,
  type OutcomeCopy,
  type PageOutcome,
  type SchoolProfile,
} from "@/lib/school-brand";
import { pickCrawlTargets } from "@/lib/school-brand/crawl-targets";
import { mergeProfiles } from "@/lib/school-brand/merge-profiles";
import {
  manifestIconCandidates,
  scoreLogoCandidate,
  upgradeCandidateUrl,
} from "@/lib/school-brand/rank-candidates";
import { scanTags, resolveUrl as resolveHtmlUrl } from "@/lib/school-brand/html-scan";
import {
  assertPublicUrl,
  checkUrlShape,
  fetchGuarded,
  outcomeForFailure,
  parseRobots,
  robotsAllows,
  MAX_PAGE_BYTES,
  MAX_ROBOTS_BYTES,
  PAGE_TIMEOUT_MS,
  ROBOTS_TIMEOUT_MS,
  USER_AGENT,
} from "@/lib/school-brand/guard.server";
import {
  prepareCandidate,
  type PrepareResult,
  type RejectedCandidate,
  type ScanCandidate,
} from "@/lib/school-brand/prepare-artwork.server";

export const runtime = "nodejs";
// Up to twelve candidate fetches at 6 s each, plus the page and robots.txt, plus
// decode/repair/encode per candidate. `CANDIDATE_BUDGET_MS` stops us well short of
// this; the platform ceiling is headroom so a slow-but-working scan is not cut off
// mid-encode.
export const maxDuration = 60;

// ─── budgets ─────────────────────────────────────────────────────────────────

/**
 * How many ranked candidates we are willing to FETCH. A school page yields 3–8 after
 * the vendor blocklist and dedupe; 12 covers the pathological theme that scatters
 * the crest across a `<picture>`, a CSS background and three favicons, without
 * turning one paste into a two-dozen-request crawl of somebody else's site.
 */
const MAX_CANDIDATES_FETCHED = 12;

/**
 * How many we RETURN with pixels attached. Each carries a full-res PNG data URL, so
 * this number times a few MB is the response size. Six is a picker a person can
 * look at; past that, scrolling replaces choosing.
 */
const MAX_CANDIDATES_RETURNED = 6;

/**
 * Total image bytes we will put in one response. A 4 MP repaired PNG can be several
 * MB, and without this ceiling six of them is a 40 MB JSON body that times out in
 * transit on exactly the phone this feature is for.
 */
const MAX_RESPONSE_IMAGE_BYTES = 20 * 1024 * 1024;

/**
 * Wall-clock budget for the candidate loop. The loop is sequential (that is the
 * memory constraint, not laziness) and school CDNs are slow, so twelve candidates
 * could otherwise spend a minute. Four good candidates in 20 s beats six in 55.
 */
const CANDIDATE_BUDGET_MS = 22_000;

/** Second-hop pages fetched after the entry page (see the hop block below). Three
 *  covers brand + athletics + one more without doubling the scan's feel. */
const SECOND_HOP_PAGES = 3;
/** Tighter than the entry page's timeout: a slow subpage is an opportunity cost,
 *  not the user's actual request. */
const SECOND_HOP_TIMEOUT_MS = 5_000;

/** Linked stylesheets fetched for CSS-background logos and brand colours. Themes
 *  compile to one or two files; four covers a theme plus an override sheet. */
const MAX_STYLESHEETS = 4;
/** A stylesheet is a means to an end. Small cap — theme CSS is big, and we only ever
 *  regex it for `url(...)` and hex colours. */
const MAX_CSS_BYTES = 512 * 1024;

// ─── response ────────────────────────────────────────────────────────────────

export type BrandScanResponse =
  | {
      ok: true;
      /** The parsed profile MINUS the raw candidate lists — see the note at the end. */
      profile: Omit<SchoolProfile, "logos" | "droppedLogos">;
      candidates: ScanCandidate[];
      rejected: RejectedCandidate[];
      /** True when nothing usable survived. `emptyState` then carries the copy. */
      empty: boolean;
      emptyState: SchoolProfile["emptyState"];
      /** True when a budget stopped us early, so the picker can say "showing 4 of 9". */
      truncated: boolean;
      /**
       * Candidates discarded at RANKING time, before any fetch — vendor marks, SVGs
       * that would print black. Returned because leaving them out made the "what we
       * found" list a half-answer: a scan that located the crest and then dropped it
       * looked identical to one that never saw it, which is the exact ambiguity that
       * cost a debugging round on a real site.
       */
      dropped: { url: string; kind: string; reason: string }[];
      robots: { checked: boolean; matchedAgent: string };
    }
  | { ok: false; outcome: PageOutcome; copy: OutcomeCopy }
  | { ok: false; error: "invalid-url" | "bad-request"; copy: OutcomeCopy };

// ─── url validation, and the one opaque message (constraint 6) ───────────────

/**
 * Shape failures that are safe to NAME, versus address failures that are not.
 *
 * These five are facts about the string the user just typed. Repeating them back
 * leaks nothing — they already know what they pasted — and "that isn't a web
 * address" is far more useful than "we couldn't reach that".
 *
 * Everything else collapses into `unreachable`: `ip:*`, `private-suffix`,
 * `malformed-ip-literal`, and every DNS failure. The collapse is the security
 * property. If a hostname resolving to 10.0.0.5 read differently from a hostname
 * that does not resolve at all, this endpoint becomes an internal-network scanner —
 * submit a URL, read the error text, learn what is listening behind our firewall.
 */
const NAMEABLE_SHAPE_REASONS = new Set([
  "unparseable-url",
  "unsupported-scheme",
  "embedded-credentials",
  "non-web-port",
  "no-host",
]);

/**
 * Copy for a URL that is not a URL. It gets its own state rather than being folded
 * into `unreachable` because the fix is different and knowable: the user mistyped,
 * and telling them "we couldn't reach that address" would send them to check their
 * wifi. "Upload a photo" is still primary, because it is the action that always works.
 */
const INVALID_URL_COPY: OutcomeCopy = {
  headline: "That doesn't look like a web address",
  detail:
    "Paste the school's website address — it should start with https:// and point at their home page.",
  actions: [
    { id: "upload-photo", label: "Upload a photo", primary: true },
    { id: "try-another-page", label: "Try a different page", primary: false },
  ],
  retryable: false,
};

// ─── robots.txt ──────────────────────────────────────────────────────────────

/**
 * Check robots.txt before touching the page.
 *
 * A FAILED FETCH MEANS ALLOWED. A 404 is overwhelmingly the common case — most
 * school sites have no robots.txt at all — and a timeout or a connection error is
 * not consent withheld, it is no answer. Treating "no answer" as "no" would refuse
 * most of the internet on the strength of a missing file. Only a 2xx body with a
 * matching `Disallow` blocks us.
 *
 * Fetched through the same guard as everything else: it is a URL on a host the user
 * chose, and the fact that WE constructed the path does not make the origin
 * trustworthy — a redirect from /robots.txt is the same SSRF hop as any other.
 */
async function checkRobots(
  pageUrl: URL,
): Promise<{ allowed: boolean; rule?: string; checked: boolean; matchedAgent: string }> {
  const robotsUrl = new URL("/robots.txt", pageUrl.origin).toString();
  const res = await fetchGuarded(robotsUrl, {
    maxBytes: MAX_ROBOTS_BYTES,
    timeoutMs: ROBOTS_TIMEOUT_MS,
    accept: "text/plain,*/*;q=0.5",
  });
  if (!res.ok || res.status < 200 || res.status >= 300) {
    return { allowed: true, checked: false, matchedAgent: "" };
  }
  const rules = parseRobots(new TextDecoder().decode(res.bytes));
  const verdict = robotsAllows(rules, pageUrl.pathname + pageUrl.search);
  return {
    allowed: verdict.allowed,
    rule: verdict.rule,
    checked: true,
    matchedAgent: rules.matchedAgent,
  };
}

// ─── the handler ─────────────────────────────────────────────────────────────

const fail = (outcome: PageOutcome): NextResponse =>
  NextResponse.json<BrandScanResponse>(
    { ok: false, outcome, copy: describeOutcome(outcome) },
    // 200, deliberately. The scan RAN and produced a verdict; "the school's site
    // returned 404" is a fact we successfully established about somebody else's
    // server, not a failure of this request. A 5xx here would send the client's
    // generic error handling down a path that has none of this copy in it, and the
    // copy IS the feature for these states.
    { status: 200 },
  );

export async function POST(request: Request): Promise<NextResponse> {
  let body: { url?: unknown };
  try {
    body = (await request.json()) as { url?: unknown };
  } catch {
    return NextResponse.json<BrandScanResponse>(
      { ok: false, error: "bad-request", copy: INVALID_URL_COPY },
      { status: 400 },
    );
  }

  const raw = typeof body.url === "string" ? body.url.trim() : "";
  // 2048 is the practical URL ceiling every browser and proxy already enforces;
  // anything longer is not a school website address.
  if (!raw || raw.length > 2048) {
    return NextResponse.json<BrandScanResponse>(
      { ok: false, error: "invalid-url", copy: INVALID_URL_COPY },
      { status: 400 },
    );
  }
  // A bare "lincolnhigh.org" is what people actually paste. Assume https rather than
  // rejecting it — the guard still has to approve whatever that resolves to, so the
  // convenience costs no safety.
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;

  const shape = checkUrlShape(withScheme);
  if (!shape.ok) {
    if (NAMEABLE_SHAPE_REASONS.has(shape.reason)) {
      return NextResponse.json<BrandScanResponse>(
        { ok: false, error: "invalid-url", copy: INVALID_URL_COPY },
        { status: 400 },
      );
    }
    // Address-shaped refusals share the one opaque message with DNS failures.
    return fail({ kind: "unreachable" });
  }

  let target;
  try {
    target = await assertPublicUrl(shape.url.toString());
  } catch {
    // GuardError carries a reason for OUR logs. It must not reach the response.
    return fail({ kind: "unreachable" });
  }

  // ── robots.txt, before the page ──
  const robots = await checkRobots(target.url);
  if (!robots.allowed) {
    return fail({ kind: "blocked-by-robots", rule: robots.rule });
  }

  // ── the page ──
  const page = await fetchGuarded(target.url.toString(), {
    maxBytes: MAX_PAGE_BYTES,
    timeoutMs: PAGE_TIMEOUT_MS,
    accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
  });
  if (!page.ok) {
    // The whole mapping lives in `outcomeForFailure` and is unit-tested there —
    // including the fact that a guard-refused REDIRECT HOP produces the same opaque
    // `unreachable` as a first-hop refusal. The redirect target is exactly the
    // address we must not describe.
    return fail(outcomeForFailure(page.failure));
  }

  const status = classifyHttpStatus(page.status);
  if (status.kind !== "ok") return fail(status);

  // `fatal: false` on purpose: a school page with one mis-encoded byte in a staff
  // name still parses fine with a replacement character, and throwing on it would
  // turn a cosmetic flaw into "we couldn't read that page".
  const html = new TextDecoder("utf-8", { fatal: false }).decode(page.bytes);
  if (!looksLikeHtml(html, page.contentType)) {
    return fail({ kind: "not-html", contentType: page.contentType.split(";")[0] || undefined });
  }

  // ── parse (pure) ──
  // `page.finalUrl` rather than the submitted URL, so relative asset paths resolve
  // against where the bytes actually came from after redirects.
  // ── LINKED STYLESHEETS ──
  //
  // Fetched before parsing, because a theme's compiled CSS is where two things hide
  // that the markup does not have: a header crest set as a `background-image`, and
  // the real brand palette. `collectLogoCandidates` has always looked for CSS
  // backgrounds — but only in inline `<style>`, which on a CMS site is a reset sheet
  // and nothing else. On the first real scan the school's mark was nowhere in the
  // HTML at all, which is what sent me looking here.
  const cssTexts: string[] = [];
  try {
    const sheets = scanTags(html, "link")
      .filter((t) => /(^|\s)stylesheet(\s|$)/i.test(t.attrs.rel ?? ""))
      .map((t) => resolveHtmlUrl(t.attrs.href ?? "", page.finalUrl))
      .filter((u): u is string => !!u)
      .slice(0, MAX_STYLESHEETS);
    for (const href of sheets) {
      const css = await fetchGuarded(href, {
        maxBytes: MAX_CSS_BYTES,
        timeoutMs: SECOND_HOP_TIMEOUT_MS,
        accept: "text/css,*/*;q=0.5",
      });
      if (css.ok && css.status >= 200 && css.status < 300) {
        cssTexts.push(new TextDecoder("utf-8", { fatal: false }).decode(css.bytes));
      }
    }
  } catch {
    // A stylesheet we cannot read costs us a possible logo, never the scan.
  }

  let profile = parseSchoolPage(html, page.finalUrl, cssTexts);

  // ── the SECOND HOP ──
  //
  // The first live scan of a real school site returned nothing usable, exactly as
  // the product review predicted: a homepage header logo is a 150–300px convenience
  // asset, below the print floor, while the marks worth printing live one click
  // deeper — the athletics page, the brand/downloads page. So after the entry page,
  // fetch a ranked handful of same-host identity/athletics links and MERGE their
  // candidates in (evidence accumulation, not replacement — see merge-profiles.ts).
  //
  // Unconditional rather than only-when-empty: even when the homepage yields a
  // usable logo, the athletics page frequently yields a better one, and "the scan
  // found the good one" is the difference between a demo and a tool. Bounded hard:
  // at most SECOND_HOP_PAGES same-host pages, each under the page guard, each
  // robots-checked for ITS OWN path (rules are per-path, and consent to / is not
  // consent to /athletics), and the whole hop abandoned once the candidate budget
  // is half spent — the hop exists to feed the QC loop, not to starve it.
  const hopStarted = Date.now();
  const extraProfiles: SchoolProfile[] = [];
  for (const t of pickCrawlTargets(html, page.finalUrl, SECOND_HOP_PAGES)) {
    if (Date.now() - hopStarted > CANDIDATE_BUDGET_MS / 2) break;
    try {
      const hopUrl = new URL(t.url);
      const hopRobots = await checkRobots(hopUrl);
      if (!hopRobots.allowed) continue;
      const hop = await fetchGuarded(t.url, {
        maxBytes: MAX_PAGE_BYTES,
        timeoutMs: SECOND_HOP_TIMEOUT_MS,
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
      });
      if (!hop.ok || hop.status < 200 || hop.status >= 300) continue;
      const hopHtml = new TextDecoder("utf-8", { fatal: false }).decode(hop.bytes);
      if (!looksLikeHtml(hopHtml, hop.contentType)) continue;
      extraProfiles.push(parseSchoolPage(hopHtml, hop.finalUrl));
    } catch {
      // A failed hop page is a lost opportunity, never a failed scan — the entry
      // page already succeeded, and that is the page the user actually asked for.
      continue;
    }
  }
  profile = mergeProfiles(profile, extraProfiles);

  // ── the MANIFEST ──
  //
  // The web-app manifest is where the one reliably LARGE icon lives: the PWA spec
  // demands a 512x512, so sites with a manifest almost always have one — often the
  // only >=400px mark on the whole site. The first live scan's school was exactly
  // this shape: every visible logo below the print floor, and a printable 512
  // sitting unread in the manifest. One extra fetch, JSON, small cap.
  try {
    const manifestLink = scanTags(html, "link").find((t) =>
      /(^|\s)manifest(\s|$)/i.test(t.attrs.rel ?? ""),
    );
    const manifestUrl = manifestLink
      ? resolveHtmlUrl(manifestLink.attrs.href ?? "", page.finalUrl)
      : null;
    if (manifestUrl) {
      const mf = await fetchGuarded(manifestUrl, {
        maxBytes: 64 * 1024,
        timeoutMs: SECOND_HOP_TIMEOUT_MS,
        accept: "application/manifest+json,application/json,*/*;q=0.5",
      });
      if (mf.ok && mf.status >= 200 && mf.status < 300) {
        const icons = manifestIconCandidates(
          JSON.parse(new TextDecoder().decode(mf.bytes)),
          mf.finalUrl,
        );
        // Scored with the same function as every page candidate, then folded in via
        // the same URL-deduping merge the second hop uses — a manifest icon that
        // also appears in the page keeps whichever description scored better.
        const scored = icons.map((c) => ({ ...c, score: scoreLogoCandidate(c) }));
        if (scored.length) {
          profile = mergeProfiles(profile, [{ ...profile, logos: scored }]);
        }
      }
    }
  } catch {
    // A malformed manifest is a lost opportunity, never a failed scan.
  }

  // ── fetch + QC the candidates, SEQUENTIALLY ──
  //
  // Sequential is the memory constraint, not laziness. Two 10 MP candidates in
  // flight through analyzeArtwork/repairArtwork exceeded a 1 GB container in the
  // measurement that produced the 4 MP cap. The cap makes each one affordable; the
  // sequencing makes the peak one candidate deep instead of twelve.
  const started = Date.now();
  const candidates: ScanCandidate[] = [];
  const rejected: RejectedCandidate[] = [];
  let imageBytes = 0;
  let truncated = false;

  const queue = profile.logos.slice(0, MAX_CANDIDATES_FETCHED);
  for (const c of queue) {
    if (
      candidates.length >= MAX_CANDIDATES_RETURNED ||
      Date.now() - started > CANDIDATE_BUDGET_MS ||
      imageBytes > MAX_RESPONSE_IMAGE_BYTES
    ) {
      truncated = true;
      break;
    }

    let result: PrepareResult;
    try {
      result = await prepareCandidate(c);
    } catch (err) {
      // A decoder that THROWS is fine and lands here. A decoder that SEGFAULTS never
      // reaches this catch — which is why the allowlist runs before it rather than
      // around it, and why this handler is a tidiness measure and not the shield.
      result = {
        ok: false,
        rejected: {
          url: c.url,
          kind: c.kind,
          reason: "unexpected",
          detail: err instanceof Error ? err.message : "Preparing this image failed.",
        },
      };
    }

    // ── the RESIZER RETRY ──
    //
    // CMS image services serve the page's copy of the logo through a resizer —
    // `?width=150`, a WordPress `-300x150` suffix — so the fetched bytes measure
    // small even though the ORIGINAL on the same host is not. When a candidate
    // comes back unusable purely on size and its URL carries resize markers, retry
    // once with the markers stripped. Strictly an upgrade: the variant replaces the
    // original only when it measures USABLE, so a 404 or a same-size answer costs
    // one bounded fetch and changes nothing.
    if (result.ok && !result.candidate.usable && result.candidate.resolution.usable === false) {
      const up = upgradeCandidateUrl(c.url);
      if (up) {
        try {
          const retried = await prepareCandidate({ ...c, url: up });
          if (retried.ok && retried.candidate.usable) result = retried;
        } catch {
          // The stripped URL not existing is the expected failure of a guess.
        }
      }
    }
    if (result.ok) {
      candidates.push(result.candidate);
      imageBytes += result.bytes;
    } else {
      rejected.push(result.rejected);
    }
  }
  if (!truncated && profile.logos.length > queue.length) truncated = true;

  // ── the empty state, which is the MOST LIKELY OUTCOME ──
  //
  // Not the sad path. A typical school header logo is ~200px wide, which is ~100 DPI
  // on a 2" badge — blocked before a crop handle is ever drawn. Add the pages whose
  // only mark belongs to Edlio or Finalsite, and the pages whose crest is an
  // Illustrator SVG that would print black, and "nothing here prints" is common
  // enough that it has to read as a normal step with a working next action rather
  // than as our bug. `buildEmptyState` writes copy about the ARTWORK and puts
  // "Upload a photo" first.
  //
  // It is rebuilt here rather than reused from `profile.emptyState` whenever the
  // page HAD candidates, because the profile's version was written before anything
  // was decoded — it cannot know that all four survivors turned out to be 180px.
  const kept = candidates.filter((c) => c.usable);
  const empty = kept.length === 0;
  const emptyState = empty
    ? buildEmptyState({
        hadCandidates: profile.logos.length > 0 || rejected.length > 0,
        droppedVendor: profile.droppedLogos.filter((d) => d.dropped === "vendor-mark").length,
        droppedRisk:
          profile.droppedLogos.filter((d) => d.dropped === "svg-render-risk").length +
          rejected.filter((r) => r.reason === "svg-render-risk" || r.reason === "black-blob").length,
      })
    : null;

  // Everything the profile carries EXCEPT the raw candidate lists. Those are
  // superseded by `candidates`/`rejected`, which have been through the decoder;
  // returning both would invite the client to render the untested one — and the
  // untested one is where the black-blob crest lives.
  const { logos: _logos, droppedLogos: _droppedLogos, ...publicProfile } = profile;
  void _logos;
  void _droppedLogos;

  return NextResponse.json<BrandScanResponse>(
    {
      ok: true,
      profile: publicProfile,
      candidates,
      rejected,
      empty,
      emptyState,
      truncated,
      dropped: profile.droppedLogos.slice(0, 12).map((d) => ({
        url: d.url,
        kind: d.kind,
        reason: d.dropped ?? "dropped",
      })),
      robots: { checked: robots.checked, matchedAgent: robots.matchedAgent },
    },
    {
      status: 200,
      headers: {
        // Nothing here is worth caching: the answer depends on a third-party site
        // that changes, and the body embeds several MB of image data.
        "cache-control": "no-store",
        // Declared so an operator reading their access log can identify us and find
        // the contact address without having to guess who we are.
        "x-scanner-user-agent": USER_AGENT,
      },
    },
  );
}
