import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/season";

// Site-wide crawl directives, served at /robots.txt.
// Allow all user agents to crawl the public marketing surface, but keep the
// post-purchase confirmation, the internal design tool, and internal API
// routes out of the index. (/build is also noindex via its page metadata;
// this is the belt-and-suspenders crawl directive.)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/thanks", "/checkout", "/confirmation", "/build", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
