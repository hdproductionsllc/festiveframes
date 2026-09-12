import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/season";

// XML sitemap served at /sitemap.xml. Indexable marketing + SEO landing pages.
// The order page (/thanks), the redirected /buy, and API routes are excluded.
//
// LAST-MODIFIED DATES ARE CONSTANTS, NOT `new Date()`. A sitemap built at
// request time stamps every URL with today, so every page claims to have
// changed on every crawl, and the signal is worth nothing. Each entry carries
// the date its own CONTENT last changed — BUMP THE DATE BELOW WHEN YOU EDIT
// THE PAGE, and leave it alone otherwise.
const LAST_MODIFIED: Record<string, string> = {
  // The root serves the /school landing (next.config rewrites it), so this is
  // that page's date.
  "/": "2026-09-12",
  "/america-250-license-plate-frame": "2026-09-12",
  "/patriotic-license-plate-frame": "2026-09-12",
  "/veteran-license-plate-frame": "2026-09-12",
  "/made-in-usa-license-plate-frame": "2026-09-12",
  "/4th-of-july-license-plate-frame": "2026-09-12",
  "/red-white-and-blue-license-plate-frame": "2026-09-12",
  "/gifts/patriotic-gift-for-car-guy": "2026-09-12",
  "/gifts/car-guy-gifts-under-50": "2026-09-12",
  "/gifts/personalized-gift-for-dad": "2026-09-12",
  "/blog/license-plate-frame-sayings": "2026-09-12",
  "/privacy": "2026-09-12",
  "/returns": "2026-09-12",
  "/terms": "2026-09-12",
};

const LANDING_PAGES: { path: string; priority: number }[] = [
  { path: "/america-250-license-plate-frame", priority: 0.9 },
  { path: "/patriotic-license-plate-frame", priority: 0.8 },
  { path: "/veteran-license-plate-frame", priority: 0.8 },
  { path: "/made-in-usa-license-plate-frame", priority: 0.8 },
  { path: "/4th-of-july-license-plate-frame", priority: 0.8 },
  { path: "/red-white-and-blue-license-plate-frame", priority: 0.8 },
  { path: "/gifts/patriotic-gift-for-car-guy", priority: 0.7 },
  { path: "/gifts/car-guy-gifts-under-50", priority: 0.7 },
  { path: "/gifts/personalized-gift-for-dad", priority: 0.7 },
  { path: "/blog/license-plate-frame-sayings", priority: 0.6 },
];

/** Legal / policy pages. Low priority, but they belong in the index. */
const POLICY_PAGES = ["/privacy", "/returns", "/terms"];

function lastModified(path: string): Date {
  return new Date(`${LAST_MODIFIED[path]}T00:00:00.000Z`);
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // The homepage entry IS the MySchoolFrame landing: next.config rewrites "/"
    // on the myschoolframe hosts to /school, so this URL serves that content.
    { url: SITE_URL, lastModified: lastModified("/"), changeFrequency: "weekly", priority: 1 },
    ...LANDING_PAGES.map((p) => ({
      url: `${SITE_URL}${p.path}`,
      lastModified: lastModified(p.path),
      changeFrequency: "weekly" as const,
      priority: p.priority,
    })),
    ...POLICY_PAGES.map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: lastModified(path),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
