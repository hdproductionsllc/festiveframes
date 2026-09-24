import type { Metadata } from "next";
import { SITE_URL } from "@/config/season";
import { OG_IMAGE_ALT } from "@/content/copy";
import { copy } from "@/content/copy";
import { Designer } from "@/components/designer/Designer";
import { BuildChrome } from "@/components/build/BuildChrome";
import { BuilderFontsDeferred } from "../BuilderFontsDeferred";
// Builder-only web fonts. Imported here so they load ONLY on /build and never
// block rendering on the marketing pages (which use next/font instead).
import "../builder-fonts.css";
// Sticker visual skin for the builder chrome (scoped to .build-skin). Re-skins
// the surrounding UI to match the marketing site; does NOT change designer
// functionality or production output.
import "./build-skin.css";

// The interactive frame builder. Lives OUTSIDE the (site) marketing route
// group so it keeps the dark workbench theme and is NOT wrapped in
// SiteHeader / SiteFooter marketing chrome.
//
// The designer is a self-contained full-viewport app and MUST NOT be modified.
// Cross-sell chrome + first-visit onboarding are added via <BuildChrome/>, a
// sibling of <Designer/> that renders only fixed-position overlays — it never
// wraps or alters the designer's own layout.

// The builder is intentionally unlinked and kept out of the sitemap, so it is
// marked noindex (still follow). It carries a self-canonical plus a real
// title/description and Open Graph/Twitter tags. The OG image comes from the
// file-convention image, resolved absolutely via metadataBase.
export const metadata: Metadata = {
  // `absolute` so the exact SEO title renders without the root "| Festive Frames"
  // template suffix (the title already ends in a complete, branded phrase).
  title: { absolute: copy.build.metaTitle },
  description: copy.build.metaDescription,
  robots: { index: false, follow: true },
  alternates: { canonical: `${SITE_URL}/build` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/build`,
    siteName: copy.site.brandEntity,
    title: copy.build.metaTitle,
    description: copy.build.metaDescription,
    // Declaring `openGraph` at all suppresses the file-convention OG image, so
    // it has to be named here — this page shipped with no og:image while the
    // legal pages, which declare nothing, got the full set.
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: OG_IMAGE_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: copy.build.metaTitle,
    description: copy.build.metaDescription,
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: OG_IMAGE_ALT }],
  },
};

export default function BuildPage() {
  return (
    <div className="build-skin">
      <Designer />
      <BuildChrome />
      {/* The picker's faces load on first open of the font menu; this mounts the
          preconnects and the UI face after first paint, as the school pages do. */}
      <BuilderFontsDeferred />
    </div>
  );
}
