import { scanTags, innerText, resolveUrl } from "./html-scan";

// ─── Which OTHER pages of the school's site are worth one more fetch ─────────
//
// The first live scan of a real school site returned nothing usable, and for the
// reason the product review predicted: a homepage header logo is a 150–300px
// convenience asset, below the 200 DPI print floor at the 2×2 badge, while the files
// worth printing — the athletics mark, the brand-page downloads — live one click
// deeper. Scanning ONLY the pasted URL made the most likely real-world outcome
// "too low res to use anything".
//
// This module picks that one click. It is NOT a crawler: no sitemap walk, no depth,
// no queue — a ranked handful of same-host links whose path or anchor text says
// they are about identity or athletics, for the route to fetch under the same
// budget as everything else. Pure (HTML string in, URLs out) so the selection logic
// is testable against fixtures like the rest of this package.

/**
 * Path/anchor-text signals, strongest first. Weights are ordinal, not tuned: an
 * "athletics" link is where US school sites keep their best mark (team pages get
 * real logos even when the district header is a wordmark); "brand"/"logo" pages are
 * rarer but are downloads pages when they exist, which is the jackpot.
 */
const SIGNALS: ReadonlyArray<[RegExp, number]> = [
  [/\b(brand|logos?|style-?guide|media-?kit)\b/i, 5],
  [/\bathletics?\b/i, 4],
  [/\b(mascot|spirit)\b/i, 4],
  [/\b(activities|clubs?|teams?)\b/i, 2],
  [/\babout\b/i, 1],
];

/** File-ish or account-ish links that match a signal by accident. */
const EXCLUDE = /\.(pdf|docx?|xlsx?|pptx?|zip|jpe?g|png|gif|webp|svg|ico)(\?|#|$)|\b(login|signin|account|calendar|lunch|menu)\b/i;

export interface CrawlTarget {
  url: string;
  score: number;
  /** The signal(s) that picked it — debug copy, mirrored into the scan notes. */
  why: string[];
}

/**
 * Rank the entry page's internal links for a second fetch.
 *
 * Same-host only, on purpose: a school's athletics page frequently lives on a
 * different vendor's domain (rSchoolToday and friends), but following a host we
 * were never given crosses from "scanned the page you pasted" into crawling, and
 * every fetched host is another SSRF surface. The vendor-host case can earn its way
 * in later with evidence; the same-host athletics page already covers most sites.
 */
export function pickCrawlTargets(html: string, pageUrl: string, limit = 3): CrawlTarget[] {
  let host: string;
  try {
    host = new URL(pageUrl).host.toLowerCase();
  } catch {
    return [];
  }

  const seen = new Map<string, CrawlTarget>();
  for (const a of scanTags(html, "a")) {
    const href = a.attrs.href;
    if (!href) continue;
    const abs = resolveUrl(href, pageUrl);
    if (!abs) continue;

    let u: URL;
    try {
      u = new URL(abs);
    } catch {
      continue;
    }
    if (u.host.toLowerCase() !== host) continue;
    if (EXCLUDE.test(u.pathname + u.search)) continue;

    // Score on the PATH and the ANCHOR TEXT together: "Athletics" as link text on a
    // /page/12345 CMS URL is exactly as good a signal as /athletics in the path.
    // ScannedTag is only the opening tag, so the text is the slice up to the next
    // `</a` — capped so a malformed page cannot hand innerText half the document.
    const close = html.indexOf("</a", a.end);
    const text = close > -1 && close - a.end < 400 ? innerText(html.slice(a.end, close)) : "";
    const hay = `${u.pathname} ${text}`;
    let score = 0;
    const why: string[] = [];
    for (const [re, w] of SIGNALS) {
      if (re.test(hay)) {
        score += w;
        why.push(re.source.replace(/\\b|\(|\)/g, "").slice(0, 24));
      }
    }
    if (score === 0) continue;

    // Normalise away fragments and dedupe on the path, keeping the best score —
    // header nav + footer nav list the same athletics page twice on most sites.
    u.hash = "";
    const key = u.origin + u.pathname;
    const prev = seen.get(key);
    if (!prev || prev.score < score) seen.set(key, { url: u.toString(), score, why });
  }

  // Never return the entry page itself, whatever its nav calls it.
  try {
    const self = new URL(pageUrl);
    self.hash = "";
    seen.delete(self.origin + self.pathname);
  } catch {
    /* pageUrl already parsed above */
  }

  return [...seen.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}
