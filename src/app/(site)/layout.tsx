import { Fredoka, Nunito } from "next/font/google";
import "../(home)/sticker.css";
import { AnnouncementBar } from "@/components/site/AnnouncementBar";
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

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${fredoka.variable} ${nunito.variable} sticker-theme flex min-h-screen flex-col`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:border-[3px] focus:border-[#1e1b17] focus:bg-[#f8c53b] focus:px-4 focus:py-2 focus:font-bold focus:text-[#1e1b17]"
      >
        Skip to content
      </a>
      <AnnouncementBar />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
