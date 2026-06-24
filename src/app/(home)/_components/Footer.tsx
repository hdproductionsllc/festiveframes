import Link from "next/link";
import Image from "next/image";
import { EmailForm } from "./EmailForm";

const SOCIALS = [
  { label: "Facebook", glyph: "f", bg: "#ed5aa0", fg: "#fff9ec" },
  { label: "LinkedIn", glyph: "in", bg: "#3fb0e6", fg: "#fff9ec" },
  { label: "Instagram", glyph: "ig", bg: "#f8c53b", fg: "#1e1b17" },
];

const SHOP = [
  { label: "Freedom Frame Set", href: "/build" },
  { label: "Two-Set Bundle", href: "/build" },
  { label: "Browse looks", href: "#looks" },
  { label: "Custom orders", href: "#custom" },
];

const HELP = [
  { label: "How it works", href: "#how" },
  { label: "Shipping & returns", href: "/returns" },
  { label: "FAQ", href: "#kit" },
  { label: "hello@festiveframes.co", href: "mailto:hello@festiveframes.co" },
];

export function Footer({ year }: { year: number }) {
  return (
    <footer className="bg-[#1e1b17] text-[#faf0d6]">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-5 pb-9 pt-[54px] sm:px-7 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.1fr]">
        <div>
          <Image
            src="/redesign/logo.png"
            alt="Festive Frames"
            width={1408}
            height={1425}
            className="mb-3.5 h-[132px] w-auto"
          />
          <p className="m-0 mb-[18px] max-w-[300px] text-[15px] font-semibold leading-[1.5] text-[#c8c1ad]">
            Customizable snap-on license plate frame kits. Install the frame once,
            then swap decorative tiles to dress up your plate for any season. Made
            in St. Louis, USA.
          </p>
          <div className="flex gap-2.5">
            {SOCIALS.map((s) => (
              <span
                key={s.label}
                aria-hidden
                className="s-display flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border-2 border-[#faf0d6] text-sm font-bold"
                style={{ background: s.bg, color: s.fg }}
              >
                {s.glyph}
              </span>
            ))}
          </div>
        </div>

        <FooterColumn title="Shop" links={SHOP} />
        <FooterColumn title="Help" links={HELP} />

        <div>
          <div className="s-display mb-3.5 text-base font-semibold text-[#f8c53b]">Get the tile drops</div>
          <p className="m-0 mb-3 text-sm font-semibold text-[#c8c1ad]">
            New tiles + seasonal sets. First access for the list. No spam, ever.
          </p>
          <EmailForm />
        </div>
      </div>

      <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-2.5 border-t-2 border-[#3a352c] px-5 py-[18px] text-[13px] font-semibold text-[#8f8975] sm:px-7">
        <span>© {year} Festive Frames · Proudly made in St. Louis, Missouri</span>
        <span>
          <Link href="/privacy" className="text-[#8f8975] no-underline hover:text-[#faf0d6]">Privacy</Link>
          {" · "}
          <Link href="/returns" className="text-[#8f8975] no-underline hover:text-[#faf0d6]">Returns</Link>
          {" · "}
          <Link href="/terms" className="text-[#8f8975] no-underline hover:text-[#faf0d6]">Terms</Link>
        </span>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <div className="s-display mb-3.5 text-base font-semibold text-[#f8c53b]">{title}</div>
      <div className="flex flex-col gap-2.5 text-[15px] font-semibold text-[#c8c1ad]">
        {links.map((l) => (
          <Link key={l.label} href={l.href} className="text-[#c8c1ad] no-underline transition-colors hover:text-[#faf0d6]">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
