import Link from "next/link";
import Image from "next/image";

const INK = "#1e1b17";

// Sticky header: ink announcement bar (Founding Edition / America's 250th moment)
// over a cream nav with the badge logo, in-page anchor links, and a yellow "Shop"
// pill that routes to the custom-first builder (/build). Server component.
export function Header() {
  return (
    <header className="sticky top-0 z-50">
      {/* announcement bar */}
      <Link
        href="/build"
        className="block border-b-[3px] border-[#1e1b17] bg-[#1e1b17] px-4 py-[9px] text-center text-[13px] font-bold leading-snug text-[#faf0d6] no-underline sm:text-sm"
      >
        <span className="text-[#f8c53b]">★</span> Founding Edition · America&apos;s
        250th ·{" "}
        <span className="text-[#3fb0e6]">1776-2026</span> ·{" "}
        <span className="text-[#ed5aa0] underline underline-offset-[3px]">
          Design your frame →
        </span>
      </Link>

      {/* nav */}
      <div className="border-b-[3px] border-[#1e1b17] bg-[#faf0d6]">
        <nav className="mx-auto flex max-w-[1240px] items-center gap-6 px-5 py-1.5 sm:px-7">
          <Link href="/" aria-label="Festive Frames home" className="flex flex-none items-center">
            <Image
              src="/redesign/logo.png"
              alt="Festive Frames"
              width={1408}
              height={1425}
              priority
              className="h-[84px] w-auto sm:h-[116px]"
            />
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-6">
            <Link href="#looks" className="hidden text-base font-bold text-[#1e1b17] no-underline lg:inline">
              Themes
            </Link>
            <Link href="#how" className="hidden text-base font-bold text-[#1e1b17] no-underline lg:inline">
              How It Works
            </Link>
            <Link href="#kit" className="hidden text-base font-bold text-[#1e1b17] no-underline lg:inline">
              Design Yours
            </Link>
            <Link href="#custom" className="hidden text-base font-bold text-[#1e1b17] no-underline lg:inline">
              Custom Orders
            </Link>
            <Link
              href="/build"
              className="s-display s-press inline-flex items-center gap-2 rounded-full border-[3px] border-[#1e1b17] bg-[#f8c53b] px-5 py-[9px] text-base font-semibold text-[#1e1b17] no-underline"
              style={{
                boxShadow: `3px 3px 0 ${INK}`,
                ["--press-shadow-lift" as string]: `5px 5px 0 ${INK}`,
                ["--press-shadow-press" as string]: `1px 1px 0 ${INK}`,
              }}
            >
              Design your frame
              <span aria-hidden className="text-lg leading-none">→</span>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
