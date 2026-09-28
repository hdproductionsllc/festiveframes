import { MSF_PRIVACY_PATH, MSF_TERMS_PATH, MSF_WARRANTY_PATH } from "../content/msf-pages";

/**
 * Is the Festive Frames holiday shop open? The ONE switch.
 *
 * CLOSED since 2026-09-26 (Henry: "Festive Frames is defunct"). While false:
 *   - /api/checkout refuses holiday orders ("custom-frame", "cart") with 410,
 *   - /api/order/draft (the holiday checkout's first step) refuses with 410,
 *   - every address in HOLIDAY_ONLY_PATHS redirects (next.config.ts) and is left
 *     out of the sitemap (app/sitemap.ts).
 * The holiday code stays in the project, so reopening is this one line. School
 * checkout has its own switch (config/school-checkout.ts) and is unaffected.
 */
export const HOLIDAY_SHOP_OPEN: boolean = false;

/**
 * Every address that only means something while the holiday shop is open, and
 * where it sends a visitor while it is closed.
 *
 * ONE list, read by both the redirects and the sitemap. The first closing
 * (2026-09-26) redirected only the checkout path; the six patriotic landing pages,
 * the gift guides, the blog and the holiday legal pages kept serving on
 * myschoolframe.com with a $39 price and the Festive Frames brand, and the sitemap
 * still submitted them to Google (found in the readiness pass, 2026-09-28). A list
 * the sitemap does not read is a list the sitemap forgets.
 *
 * The holiday legal pages go to MySchoolFrame's own, so a link in an old email
 * still lands on terms that apply. ":path*" covers a whole section.
 */
export const HOLIDAY_ONLY_PATHS: Readonly<Record<string, string>> = {
  "/build": "/school",
  "/cart": "/school",
  "/checkout": "/school",
  "/buy": "/school",
  "/classic": "/school",
  "/america-250-license-plate-frame": "/school",
  "/patriotic-license-plate-frame": "/school",
  "/veteran-license-plate-frame": "/school",
  "/made-in-usa-license-plate-frame": "/school",
  "/4th-of-july-license-plate-frame": "/school",
  "/red-white-and-blue-license-plate-frame": "/school",
  "/gifts/:path*": "/school",
  "/blog/:path*": "/school",
  "/returns": MSF_WARRANTY_PATH,
  "/privacy": MSF_PRIVACY_PATH,
  "/terms": MSF_TERMS_PATH,
  // The holiday order page. A school checkout returns to /school/thanks already;
  // the query string (a Stripe session id) rides along on the redirect.
  "/thanks": "/school/thanks",
};

/** Is this path one of the holiday-only addresses (a section counts)? */
export function isHolidayOnlyPath(path: string): boolean {
  return Object.keys(HOLIDAY_ONLY_PATHS).some((source) =>
    source.endsWith("/:path*") ? path.startsWith(source.slice(0, -":path*".length)) : path === source,
  );
}
