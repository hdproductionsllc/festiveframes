import Link from "next/link";
import Image from "next/image";

// Server Component. Marketing site footer used by the (site) route group.
// No props. Sticker design language to match the redesigned homepage footer:
// dark ink surface, cream text, gold column headings, the badge logo, and one
// natural, SEO-friendly product paragraph. Same links as before
// (Shop / Privacy / Returns / Terms / contact email).

const SHOP = [
  { label: "Design your frame", href: "/build" },
  { label: "Privacy", href: "/privacy" },
  { label: "Returns & Refunds", href: "/returns" },
  { label: "Terms", href: "/terms" },
  { label: "hello@festiveframes.co", href: "mailto:hello@festiveframes.co" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#1e1b17] text-[#faf0d6]">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-5 pb-9 pt-[54px] sm:px-7 md:grid-cols-[1.6fr_1fr]">
        <div>
          <Image
            src="/redesign/logo.png"
            alt="Festive Frames"
            width={1408}
            height={1425}
            className="mb-3.5 h-[132px] w-auto"
          />
          <p className="m-0 max-w-[340px] text-[15px] font-semibold leading-[1.5] text-[#c8c1ad]">
            Festive Frames makes customizable snap-on license plate frame kits.
            Each kit comes with decorative snap-on tiles you press into the frame
            to dress up your plate for the season, the road trip, or the everyday
            drive. Made in St. Louis, USA.
          </p>
        </div>

        <nav aria-label="Footer">
          <div className="s-display mb-3.5 text-base font-semibold text-[#f8c53b]">
            Explore
          </div>
          <ul className="flex flex-col gap-2.5 text-[15px] font-semibold text-[#c8c1ad]">
            {SHOP.map((l) => {
              const isMail = l.href.startsWith("mailto:");
              return (
                <li key={l.label}>
                  {isMail ? (
                    <a
                      href={l.href}
                      className="text-[#c8c1ad] no-underline transition-colors hover:text-[#faf0d6]"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      href={l.href}
                      className="text-[#c8c1ad] no-underline transition-colors hover:text-[#faf0d6]"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-2.5 border-t-2 border-[#3a352c] px-5 py-[18px] text-[13px] font-semibold text-[#8f8975] sm:px-7">
        <span>
          &copy; {year} Festive Frames &middot; Proudly made in St. Louis,
          Missouri. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
