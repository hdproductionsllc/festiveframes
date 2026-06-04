import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/season";

// XML sitemap served at /sitemap.xml. Only the two indexable pages belong here:
// the marketing home and the interactive builder. The conversion page (/buy),
// the order page (/thanks), and API routes are intentionally excluded.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/build`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
