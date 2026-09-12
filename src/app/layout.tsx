import type { Metadata } from "next";
import { Oswald, Libre_Franklin } from "next/font/google";
import { SITE_URL } from "@/config/season";
import { copy } from "@/content/copy";
import "./globals.css";

// ─── Marketing typography — DECLARED HERE, PRELOADED IN THE ROUTE GROUPS ─────
//
// Display: Oswald. Body: Libre Franklin. Self-hosted at build time by next/font,
// exposed as CSS variables so a marketing surface can opt in without touching the
// dark builder (which keeps its own --font-display / --font-sans).
//
// THE PRELOAD MOVED. A font declared in the ROOT layout is in every route's
// graph, so next/font emitted `<link rel="preload" as="font">` for BOTH faces on
// EVERY page — including all 27 `/s/<slug>` school builders, which paint not one
// glyph of either. That is ~50 KB fetched at the highest priority the browser
// has, ahead of the school's own artwork, on a phone on cell data in a car park.
// Worse for Oswald: the school banners' tagline IS Oswald, but the SELF-HOSTED
// one (self-hosted-fonts.css, family name "Oswald"), so the school pages were
// paying for two different copies of the same face and rendering only ours.
//
// The faces the MARKETING pages actually paint are now declared again in the
// (home) and (site) group layouts, where they preload for the pages that use
// them and for nobody else. These two stay because they are also the only source
// of --font-display-marketing / --font-body-marketing for `/school` and
// `/s/<slug>/raised`, which read them through school-landing.css and sit outside
// both groups — but with `preload: false`, so a page that paints no glyph of
// them fetches no bytes for them. A page that does paint them fetches on CSS
// match instead of on preload, one hop later, with `display: swap` covering it.
const displayFont = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-display-marketing",
});

const bodyFont = Libre_Franklin({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-body-marketing",
});

export const metadata: Metadata = {
  // Absolute base so file-convention images (opengraph-image) and any relative
  // metadata URLs resolve to fully-qualified canonical URLs.
  metadataBase: new URL(SITE_URL),
  title: {
    // Brand entity is locked to "Festive Frames – Custom License Plate Frames"
    // so Google/AI resolve THIS brand (a UK firm owns festiveframes.co.uk, making
    // bare "Festive Frames" ambiguous). The default is the full entity string; the
    // template keeps the brand short ("| Festive Frames") because every per-page
    // title already carries "License Plate Frame(s)", so brand + category always
    // co-occur in the rendered <title> without bloating it.
    default: "Festive Frames – Custom License Plate Frames",
    template: "%s | Festive Frames",
  },
  description:
    "Design your own custom license plate frame: pick a theme, snap on the tiles you want, and add your phrase. Made to order by hand in the USA, $39.",
  // Site-wide brand-entity defaults. Pages that set their own openGraph/twitter
  // inherit siteName from here, so the locked entity string is consistent across
  // every shareable surface without repeating it in each route.
  openGraph: {
    siteName: copy.site.brandEntity,
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${displayFont.variable} ${bodyFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
