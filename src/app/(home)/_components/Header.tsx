import Link from "next/link";
import Image from "next/image";

const INK = "#1e1b17";

// Sticky header: ink announcement bar (live Founding scarcity) over a cream nav
// with the badge logo, in-page anchor links, and a yellow "Shop" pill that
// routes to the real /buy → Stripe flow. Server component (no interactivity).
export function Header({ remaining, cap }: { remaining: number; cap: number }) {
  return (
    <header className="sticky top-0 z-50">
      {/* announcement bar */}
      <Link
        href="/buy"
        className="block border-b-[3px] border-[#1e1b17] bg-[#1e1b17] px-4 py-[9px] text-center text-[13px] font-bold leading-snug text-[#faf0d6] no-underline sm:text-sm"
      >
        <span className="text-[#f8c53b]">★</span> America&apos;s 250th · Founding
        Edition — only{" "}
        <span className="text-[#3fb0e6]">
          {remaining} of {cap}
        </span>{" "}
        kits left ·{" "}
        <span className="text-[#ed5aa0] underline underline-offset-[3px]">
          Claim yours →
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
              className="h-[60px] w-auto sm:h-[84px]"
            />
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-6">
            <Link href="#looks" className="hidden text-base font-bold text-[#1e1b17] no-underline lg:inline">
              Looks
            </Link>
            <Link href="#how" className="hidden text-base font-bold text-[#1e1b17] no-underline lg:inline">
              How It Works
            </Link>
            <Link href="#kit" className="hidden text-base font-bold text-[#1e1b17] no-underline lg:inline">
              The Kit
            </Link>
            <Link href="#custom" className="hidden text-base font-bold text-[#1e1b17] no-underline lg:inline">
              Custom Orders
            </Link>
            <Link
              href="/buy"
              className="s-display s-press inline-flex items-center gap-2 rounded-full border-[3px] border-[#1e1b17] bg-[#f8c53b] px-5 py-[9px] text-base font-semibold text-[#1e1b17] no-underline"
              style={{
                boxShadow: `3px 3px 0 ${INK}`,
                ["--press-shadow-lift" as string]: `5px 5px 0 ${INK}`,
                ["--press-shadow-press" as string]: `1px 1px 0 ${INK}`,
              }}
            >
              Shop the kit
              <span aria-hidden className="text-lg leading-none">→</span>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
