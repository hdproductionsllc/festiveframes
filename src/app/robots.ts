import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/season";

// Site-wide crawl directives, served at /robots.txt.
// Allow all user agents to crawl the public marketing surface, but keep the
// post-purchase confirmation and internal API routes out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/thanks", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
