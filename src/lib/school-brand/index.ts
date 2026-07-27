// ─── parseSchoolPage: HTML string in, SchoolProfile out ──────────────────────
//
// The public face of the folder, and the only function the route handler needs.
// It is pure. It takes markup that somebody else downloaded and returns data; it
// cannot fetch, cannot touch a DOM, cannot rasterise. That boundary is what lets
// the parsing be tested at all in an environment with no network (every CONNECT in
// this sandbox is answered "403"), and it is also the right shape anyway: the
// fetch has its own failure modes, they are enumerated below as `PageOutcome`, and
// none of them are parsing problems.

import { detectPlatform } from "./detect-platform";
import { extractColors, extractMascots, extractMottos, extractSchoolNames } from "./extract-text";
import { scanPage } from "./html-scan";
import { imageHints, gateByResolution, rankLogoCandidates, MIN_BADGE_PIXELS } from "./rank-candidates";
import type {
  EmptyState,
  NextAction,
  OutcomeCopy,
  PageOutcome,
  SchoolProfile,
} from "./types";

export * from "./types";
export * from "./html-scan";
export * from "./detect-platform";
export * from "./extract-text";
export * from "./svg-risks";
export * from "./raster-safety";
export * from "./rank-candidates";

/**
 * The action that always works.
 *
 * Every dead end in this feature ends here. A school site can be down, can block
 * robots, can be a single background-image with no markup at all — and in every one
 * of those cases the parent still has a photo on their phone. An error state
 * without this button is a state the user cannot leave.
 */
const UPLOAD: NextAction = { id: "upload-photo", label: "Upload a photo", primary: true };
const ANOTHER_PAGE: NextAction = {
  id: "try-another-page",
  label: "Try a different page",
  primary: false,
};
const TYPE_IT_IN: NextAction = { id: "type-it-in", label: "Type the details in", primary: false };
const PASTE_URL: NextAction = {
  id: "paste-image-url",
  label: "Paste an image link",
  primary: false,
};

/**
 * The empty state, designed rather than defaulted.
 *
 * THIS IS THE MOST LIKELY OUTCOME, not the sad path — which is why it gets real
 * copy and three real actions instead of a shrug. A typical school home page has
 * exactly one logo file, sized for a 200px-wide header slot, and 200px is 100 DPI
 * on a 2" badge: blocked by `evaluateResolution` before a crop handle is ever
 * drawn. Add the pages whose only mark is the vendor's, and the pages whose crest
 * is an Illustrator SVG that would print black, and "nothing here prints" is
 * common enough that it has to feel like a normal step in the flow.
 *
 * The headline says what is true about the ARTWORK, not about us. "We couldn't
 * find anything" reads as our bug and invites a retry that will fail identically;
 * "nothing on this page is big enough to print at 2 inches" is a fact about the
 * page, and it points somewhere.
 */
export function buildEmptyState(reason: {
  hadCandidates: boolean;
  droppedVendor: number;
  droppedRisk: number;
}): EmptyState {
  const detailParts: string[] = [];
  if (reason.droppedVendor > 0) {
    detailParts.push(
      `${reason.droppedVendor === 1 ? "One image" : `${reason.droppedVendor} images`} in the header belonged to the website provider rather than the school`,
    );
  }
  if (reason.droppedRisk > 0) {
    detailParts.push(
      `${reason.droppedRisk === 1 ? "one logo" : `${reason.droppedRisk} logos`} would have printed as a black silhouette`,
    );
  }
  const detail = detailParts.length
    ? `${detailParts.join(", and ")}. School sites usually keep their crest at web size — around ${MIN_BADGE_PIXELS}px across is what a 2" badge needs.`
    : `Everything we found is sized for a web page, not for print — a 2" badge needs about ${MIN_BADGE_PIXELS}px across. A photo from your phone is comfortably bigger than that.`;

  return {
    headline: reason.hadCandidates
      ? "Nothing on this page prints at 2 inches"
      : "No logo on this page",
    detail,
    actions: [UPLOAD, ANOTHER_PAGE, TYPE_IT_IN],
  };
}

/**
 * Parse a school home page into ranked branding candidates.
 *
 * Never throws. A page that is empty, truncated, binary-ish or hostile produces a
 * profile with empty lists and `empty: true` — the caller has exactly one shape to
 * handle, and the difference between "nothing there" and "we crashed" is a field
 * rather than a try/catch.
 */
export function parseSchoolPage(html: string, pageUrl: string): SchoolProfile {
  const scan = scanPage(html ?? "", pageUrl ?? "");
  const platform = detectPlatform(scan.html, scan.pageUrl);
  const warnings: string[] = [];

  const names = extractSchoolNames(scan);
  const mottos = extractMottos(scan);
  const mascots = extractMascots(scan);
  const colors = extractColors(scan);

  // The best name feeds logo scoring: alt text that names the school is the
  // strongest same-page way to tell the crest from the district seal next to it.
  const { logos, dropped } = rankLogoCandidates(scan, { schoolName: names[0]?.value });

  if (!scan.styles.length) {
    warnings.push("No inline <style> blocks — colours could only come from meta and inline styles.");
  }
  if (platform.platform === "unknown") {
    warnings.push("Platform not recognised; used the generic extractors.");
  }
  const vendorDropped = dropped.filter((d) => d.dropped === "vendor-mark").length;
  if (vendorDropped > 0) {
    warnings.push(
      `Ignored ${vendorDropped} website-provider mark${vendorDropped === 1 ? "" : "s"} in the page chrome.`,
    );
  }

  const empty = logos.length === 0;
  return {
    pageUrl: scan.pageUrl,
    host: scan.host,
    platform: platform.platform,
    platformConfidence: platform.confidence,
    platformSignals: platform.signals,
    names,
    mottos,
    mascots,
    colors,
    logos,
    droppedLogos: dropped,
    imageHints: imageHints(scan),
    empty,
    emptyState: empty
      ? buildEmptyState({
          hadCandidates: dropped.length > 0,
          droppedVendor: vendorDropped,
          droppedRisk: dropped.filter((d) => d.dropped === "svg-render-risk").length,
        })
      : null,
    warnings,
  };
}

// ─── the error taxonomy (constraint 6) ───────────────────────────────────────

/**
 * Is this body worth handing to `parseSchoolPage` at all?
 *
 * Pure, and separate from the fetch, so the "not HTML" branch can be tested without
 * a server. Content-type is checked when present but is NOT trusted on its own:
 * school CMSes serve HTML as `text/plain` and as `application/octet-stream` often
 * enough that a content-type-only gate rejects real pages.
 */
export function looksLikeHtml(body: string, contentType?: string): boolean {
  const ct = (contentType ?? "").toLowerCase();
  if (ct && !/(text\/html|application\/xhtml|text\/plain|octet-stream)/.test(ct)) return false;
  const head = body.slice(0, 4096).toLowerCase();
  return /<!doctype html|<html[\s>]|<head[\s>]|<body[\s>]|<meta[\s>]|<title[\s>]/.test(head);
}

/**
 * Map an HTTP status from a VALIDATED PUBLIC HOST to an outcome.
 *
 * "Validated public host" is doing real work in that sentence: by the time a status
 * code exists, the SSRF guard has already approved the address, so saying "that
 * site returned 403" leaks nothing an attacker did not already know. The opaque
 * case is the one that happens BEFORE a request goes out.
 */
export function classifyHttpStatus(status: number): PageOutcome {
  if (status >= 200 && status < 300) return { kind: "ok" };
  return { kind: "blocked-by-site", status };
}

/**
 * What the user is told, per outcome.
 *
 * Five distinguishable states and one opaque one. The opaque one is deliberate and
 * is the ONLY one: `unreachable` covers both "DNS did not resolve" and "the SSRF
 * guard refused this address", with identical wording, because distinguishing them
 * turns this endpoint into an internal-network scanner — submit `http://10.0.0.5/`,
 * read the error text, learn whether something is listening. Everything else is a
 * fact about a public website that the user could confirm in their own browser, and
 * hiding those helps nobody: "we couldn't read that page" for a 404 sends the user
 * to check their wifi when the real answer is that they pasted a dead link.
 */
export function describeOutcome(outcome: PageOutcome): OutcomeCopy {
  switch (outcome.kind) {
    case "ok":
      return { headline: "Read the page", detail: "", actions: [], retryable: false };

    case "blocked-by-robots":
      return {
        headline: "This site asks not to be read automatically",
        detail:
          "Their robots.txt tells tools like ours to stay out, and we respect that. You can still use anything you have a copy of.",
        // No retry: the answer will be identical every time, and a Retry button that
        // cannot work is worse than no button.
        actions: [UPLOAD, PASTE_URL, TYPE_IT_IN],
        retryable: false,
      };

    case "blocked-by-site":
      return {
        headline:
          outcome.status === 404
            ? "That page isn't there"
            : outcome.status >= 500
              ? "The school's website is having trouble"
              : "The school's website turned us away",
        detail:
          outcome.status === 404
            ? "The address came back as not found. A different page on the same site will usually work — the home page is the best one."
            : outcome.status >= 500
              ? `Their server answered with an error (${outcome.status}). That is on their end and it is usually temporary.`
              : `Their server refused the request (${outcome.status}). Some school sites block anything that isn't a person in a browser.`,
        actions: [ANOTHER_PAGE, UPLOAD, TYPE_IT_IN],
        // 5xx is worth retrying; a 404 or a 403 will not change on a second press.
        retryable: outcome.status >= 500,
      };

    case "not-html":
      return {
        headline: "That link isn't a web page",
        detail: outcome.contentType
          ? `It came back as ${outcome.contentType}. Paste the address of the school's home page instead — the one with their name and crest at the top.`
          : "Paste the address of the school's home page instead — the one with their name and crest at the top.",
        actions: [ANOTHER_PAGE, UPLOAD],
        retryable: false,
      };

    case "timeout":
      return {
        headline: "The school's site took too long",
        detail: `We gave it ${Math.round(outcome.ms / 1000)} seconds. School sites are often slow rather than broken, so this is worth one more try.`,
        actions: [UPLOAD, ANOTHER_PAGE],
        retryable: true,
      };

    case "unreachable":
      // THE ONE OPAQUE MESSAGE. Same words for a typo'd domain and for an address
      // the SSRF guard rejected — see the doc comment above.
      return {
        headline: "We couldn't reach that address",
        detail:
          "Double-check the web address, or skip it — you can build the frame from a photo just as easily.",
        actions: [UPLOAD, ANOTHER_PAGE],
        retryable: false,
      };
  }
}

/** Re-exported so callers gate a candidate without importing two modules. */
export { gateByResolution };
