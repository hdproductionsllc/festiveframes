import Link from "next/link";
import Image from "next/image";
import { offer, formatUsd } from "@/config/offers";
import { BuyButton } from "./BuyButton";

const INK = "#1e1b17";

const INCLUDED = [
  "A design-your-own frame rail that fits all standard US plates",
  "A goodie bag of surprise extra tiles in every order",
  "Ready-made bottom-bar phrases to start from, or write your own: USA, LAND OF THE FREE, HOME OF THE BRAVE, LET FREEDOM RING",
  "Quick-start card — installs in seconds with your existing screws",
];

// Pricing comes from the single source of truth (config/offers); the server
// re-derives the authoritative amount at checkout. CTAs route to /buy → Stripe.
const TIERS = [
  {
    name: "Freedom Frame Set",
    which: "single" as const,
    price: formatUsd(offer.singlePrice),
    note: "/ kit",
    popular: false,
    accent: "#3fb0e6",
    cta: "Choose this set",
    bullets: ["Design-your-own frame rail", "A goodie bag of surprise extra tiles", "Bottom-bar phrases to start from, or make your own", "Quick-start card"],
  },
  {
    name: "Two-Set Bundle",
    which: "bundle" as const,
    price: formatUsd(offer.bundlePrice),
    note: "/ 2 sets",
    popular: true,
    accent: "#ed5aa0",
    cta: "Claim the bundle",
    bullets: ["Everything in the set, ×2", "One for you, one to gift", "Save $9 vs. two singles", "30-day guarantee"],
  },
];

export function TheKit({ remaining, cap }: { remaining: number; cap: number }) {
  return (
    <section id="kit" className="mx-auto max-w-[1240px] px-5 py-[72px] sm:px-7">
      <div className="mb-3.5 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#1e1b17] px-4 py-[7px] text-[13px] font-extrabold tracking-[1px] text-[#faf0d6]">
          FOUNDING EDITION · {remaining} OF {cap} LEFT
        </span>
      </div>
      <h2 className="m-0 mb-3 text-center text-[clamp(34px,6vw,48px)] font-bold leading-none tracking-[-1px]">
        Meet the Freedom Frame Set
      </h2>
      <p className="mx-auto mb-11 max-w-[560px] text-center text-lg font-semibold text-[#6a6354]">
        Our launch kit for America&apos;s 250th. Design your own frame, then make
        it yours — every order ships with a goodie bag of surprise extra tiles.
        Restyle it for the Fourth, a parade, or game day — as often as you like.
      </p>

      <div className="grid items-stretch gap-7 lg:grid-cols-[1fr_1.15fr]">
        {/* what's inside */}
        <div
          className="relative overflow-hidden rounded-[24px] border-[4px] border-[#1e1b17] bg-[#f8c53b] p-[34px]"
          style={{ boxShadow: `8px 8px 0 ${INK}` }}
        >
          <h3 className="s-display m-0 mb-[18px] text-[26px] font-bold">What&apos;s in every kit</h3>
          <div className="flex flex-col gap-3.5">
            {INCLUDED.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <span className="mt-px flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-[#1e1b17] text-[15px] font-extrabold text-[#f8c53b]">
                  ★
                </span>
                <span className="text-base font-bold leading-[1.4] text-[#3a2f0c]">{item}</span>
              </div>
            ))}
          </div>
          <Image
            src="/redesign/tiles/popsicle.png"
            alt=""
            aria-hidden
            width={268}
            height={268}
            className="pointer-events-none absolute -bottom-6 -right-6 h-auto w-[120px] opacity-90"
            style={{ transform: "rotate(-10deg)", filter: "drop-shadow(4px 5px 0 rgba(30,27,23,0.18))" }}
          />
        </div>

        {/* pricing */}
        <div className="grid gap-5 sm:grid-cols-2">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className="relative flex flex-col rounded-[24px] border-[4px] border-[#1e1b17] bg-[#fff9ec] px-6 py-7"
              style={{ boxShadow: `8px 8px 0 ${INK}` }}
            >
              {t.popular && (
                <span
                  className="s-display absolute -top-[15px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-[3px] border-[#1e1b17] bg-[#ed5aa0] px-3.5 py-1 text-[13px] font-semibold text-[#fff9ec]"
                  style={{ boxShadow: `2px 2px 0 ${INK}` }}
                >
                  MOST POPULAR
                </span>
              )}
              <div className="s-display mb-1 text-[21px] font-semibold">{t.name}</div>
              <div className="mb-4 flex items-baseline gap-1.5">
                <span className="s-display text-[42px] font-bold leading-none" style={{ color: t.accent }}>
                  {t.price}
                </span>
                <span className="text-sm font-bold text-[#6a6354]">{t.note}</span>
              </div>
              <div className="mb-5 flex flex-1 flex-col gap-2.5">
                {t.bullets.map((b) => (
                  <div key={b} className="flex items-start gap-2.5">
                    <span className="mt-px flex-none text-[15px] font-extrabold text-[#1e1b17]">✓</span>
                    <span className="text-sm font-semibold leading-[1.4] text-[#3a352c]">{b}</span>
                  </div>
                ))}
              </div>
              <BuyButton
                selection={t.which}
                label={t.cta}
                className="s-display s-press w-full cursor-pointer rounded-full border-[3px] border-[#1e1b17] p-3 text-center text-base font-semibold text-[#fff9ec] disabled:opacity-70"
                style={{
                  background: t.accent,
                  boxShadow: `4px 4px 0 ${INK}`,
                  ["--press-shadow-lift" as string]: `6px 6px 0 ${INK}`,
                  ["--press-shadow-press" as string]: `1px 1px 0 ${INK}`,
                }}
              />
            </div>
          ))}
          <div className="text-center text-sm font-bold text-[#6a6354] sm:col-span-2">
            $5 flat shipping · 30-day guarantee · order by June 28 to get it before the Fourth
            <br />
            <Link href="/buy?kit=american-classic" className="font-bold text-[#ed5aa0] underline underline-offset-2">
              Need a different quantity or to mix sets? Open full checkout →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
