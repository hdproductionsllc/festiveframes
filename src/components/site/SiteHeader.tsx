import Link from "next/link";
import Image from "next/image";

const INK = "#1e1b17";

// Server Component. Marketing site header used by the (site) route group
// (the post-order /thanks page and the legal pages). Sticker design language to
// match the redesigned homepage: cream bar, thick ink outline, the badge logo,
// and a single yellow "Design your frame" pill that routes to the custom-first
// builder (/build). No in-page anchors — those only exist on the homepage.
export function SiteHeader() {
  return (
    <header className="border-b-[3px] border-[#1e1b17] bg-[#faf0d6]">
      <nav className="mx-auto flex max-w-[1240px] items-center gap-4 px-5 py-1.5 sm:px-7">
        <Link
          href="/"
          aria-label="Festive Frames home"
          className="flex flex-none items-center"
        >
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
      </nav>
    </header>
  );
}
