import { Fredoka, Nunito } from "next/font/google";
import "./sticker.css";

// Route-group layout for the redesigned homepage ("/"). The sticker design is a
// self-contained world: it brings its OWN header / marquee / footer inside the
// page and its OWN typography + theme here, so it deliberately does NOT use the
// navy (site) chrome. The old Americana homepage still lives at /classic under
// the (site) layout, fully intact.
//
// Display: Fredoka (rounded, chunky) for headings, buttons, prices, stats.
// Body/UI: Nunito. Both self-hosted at build time via next/font (no layout
// shift, no external request), exposed as CSS variables the sticker theme reads.
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

export default function HomeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${fredoka.variable} ${nunito.variable} sticker-theme flex min-h-screen flex-col`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:border-[3px] focus:border-[#1e1b17] focus:bg-[#f8c53b] focus:px-4 focus:py-2 focus:font-bold focus:text-[#1e1b17]"
      >
        Skip to content
      </a>
      {children}
    </div>
  );
}
