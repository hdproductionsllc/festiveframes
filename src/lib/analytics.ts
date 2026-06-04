// ─────────────────────────────────────────────────────────────
// Tiny, dependency-free analytics shim.
//
// NO analytics provider package is installed and none should be added.
// Until a provider script is attached at runtime (a Plausible script or a
// Google Tag Manager container that defines window.dataLayer), every call to
// track() is a SAFE NO-OP: it merely pushes onto window.dataLayer (created if
// absent) and calls window.plausible if it exists. Nothing is sent over the
// network by this file. To "turn on" analytics later, just include the
// provider's <script> tag; the events below will start flowing with no code
// change here.
//
// CONTRACT (shared by both /buy + /thanks islands and the /build designer):
//   track(event, props?)
//     - SSR-safe: no-ops when there is no window.
//     - Calls window.plausible?.(event, { props }) when present.
//     - Always pushes { event, ...props } to window.dataLayer (GTM / Vercel).
//     - Auto-merges utm_source / utm_campaign / utm_medium from the current
//       location.search into props (URL values win over caller-supplied ones
//       only when the caller did not provide that key).
//     - Never throws and never blocks.
//
// Props values are PRIMITIVES (string | number | boolean). When passing a list
// of kit ids, join them into a comma-separated string before calling track.
// ─────────────────────────────────────────────────────────────

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean> },
    ) => void;
    dataLayer?: Array<Record<string, unknown>>;
  }
}

type AnalyticsProps = Record<string, string | number | boolean>;

const UTM_KEYS = ["utm_source", "utm_campaign", "utm_medium"] as const;

/** Read whitelisted UTM params from the current URL. Never throws. */
function readUtmParams(): AnalyticsProps {
  const utm: AnalyticsProps = {};
  try {
    const search = window.location.search;
    if (!search) return utm;
    const params = new URLSearchParams(search);
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) utm[key] = value;
    }
  } catch {
    // Malformed URL or unavailable location: ignore, return what we have.
  }
  return utm;
}

/**
 * Fire an analytics event. SSR-safe, provider-agnostic, never throws.
 *
 * @param event Event name (see the standard events documented in the project).
 * @param props Primitive-valued properties. UTM params from the URL are merged
 *              in automatically (only for keys the caller did not set).
 */
export function track(event: string, props?: AnalyticsProps): void {
  if (typeof window === "undefined") return;

  try {
    // Caller-supplied props take precedence over URL-derived UTM values.
    const merged: AnalyticsProps = { ...readUtmParams(), ...(props ?? {}) };

    // Plausible (if a script attached it).
    window.plausible?.(event, { props: merged });

    // GTM / Vercel dataLayer (create if absent).
    if (!Array.isArray(window.dataLayer)) {
      window.dataLayer = [];
    }
    window.dataLayer.push({ event, ...merged });
  } catch {
    // Analytics must never break the funnel.
  }
}
