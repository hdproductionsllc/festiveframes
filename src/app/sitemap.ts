import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/season";

// XML sitemap served at /sitemap.xml. Indexable marketing + SEO landing pages.
// The order page (/thanks), the redirected /buy, and API routes are excluded.
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

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: SITE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    ...LANDING_PAGES.map((p) => ({
      url: `${SITE_URL}${p.path}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: p.priority,
    })),
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
