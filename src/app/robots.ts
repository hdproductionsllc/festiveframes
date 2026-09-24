import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/season";

// Site-wide crawl directives, served at /robots.txt.
// Allow all user agents to crawl the public marketing surface, but keep the
// post-purchase confirmation, the lab routes, and internal API routes out of
// the index.
//
// /build is deliberately NOT disallowed. It carries `robots: { index: false,
// follow: true }` in its own page metadata and it is the target of every
// primary CTA on the site, so a crawl block would stop Google fetching the page
// and therefore stop it reading that noindex — leaving the URL indexable from
// its inbound links alone. Let the crawler in; the page tells it what to do.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/thanks", "/school/thanks", "/cart", "/checkout", "/confirmation", "/lab", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
