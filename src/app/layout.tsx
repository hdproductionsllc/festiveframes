import type { Metadata } from "next";
import { Oswald, Libre_Franklin } from "next/font/google";
import { SITE_URL } from "@/config/season";
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
  // The ROOT brand is MySchoolFrame (2026-09-28). It was the holiday storefront's
  // (its title template, a $39 description, its brand entity as siteName), and every
  // page that did not override it — the 404, anything new — wore the defunct brand
  // on myschoolframe.com. The holiday shop is closed (config/holiday-shop.ts) and
  // its pages redirect, so the fallback is the brand that is actually live.
  title: {
    default: "Custom School Spirit License Plate Frames | MySchoolFrame",
    template: "%s | MySchoolFrame",
  },
  description:
    "A custom school license plate frame in your school's colors, with badges for their sport, band or club. Free to design, made in St. Louis, USA.",
  openGraph: {
    siteName: "MySchoolFrame",
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
