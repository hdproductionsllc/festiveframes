import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/season";

// XML sitemap served at /sitemap.xml. Only the indexable marketing pages
// belong here: the home page and the privacy policy. The conversion page
// (/buy), the order page (/thanks), the builder (/build, unlinked for launch),
// and API routes are intentionally excluded.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
