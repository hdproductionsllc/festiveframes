import type { Metadata } from "next";
import { SITE_URL } from "@/config/season";
import { copy } from "@/content/copy";
import { Designer } from "@/components/designer/Designer";
import { BuildChrome } from "@/components/build/BuildChrome";
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
  title: copy.build.metaTitle,
  description: copy.build.metaDescription,
  robots: { index: false, follow: true },
  alternates: { canonical: `${SITE_URL}/build` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/build`,
    siteName: copy.site.brandName,
    title: copy.build.metaTitle,
    description: copy.build.metaDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: copy.build.metaTitle,
    description: copy.build.metaDescription,
  },
};

export default function BuildPage() {
  return (
    <div className="build-skin">
      <Designer />
      <BuildChrome />
    </div>
  );
}
