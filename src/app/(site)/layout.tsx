import { Fredoka, Nunito, Oswald, Libre_Franklin } from "next/font/google";
import "../(home)/sticker.css";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Marketing route group layout. Wraps "/thanks" and the legal pages in the
// sticker (cartoon) theme plus shared header and footer chrome, matching the
// redesigned homepage. The builder at /build is OUTSIDE this group, so it keeps
// the dark workbench.
//
// The sticker design system (tokens, s-display / s-press utilities, fonts) is
// shared with the (home) route group: we reuse its sticker.css and the same
// Fredoka (display) + Nunito (body) self-hosted fonts so the look maps 1:1.
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-fredoka",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-nunito",
});

// The Americana marketing pair, PRELOADED HERE rather than in the root layout —
// /buy, /classic and the legal pages render the same `font-mkt-display` /
// `font-mkt-body` components the homepage does. Declaring them in the root layout
// preloaded them on all 27 school builders too, which paint neither face. See the
// root layout for the full note.
const displayFont = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-display-marketing",
});

const bodyFont = Libre_Franklin({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body-marketing",
});

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${fredoka.variable} ${nunito.variable} ${displayFont.variable} ${bodyFont.variable} sticker-theme flex min-h-screen flex-col`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:border-[3px] focus:border-[#1e1b17] focus:bg-[#f8c53b] focus:px-4 focus:py-2 focus:font-bold focus:text-[#1e1b17]"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
