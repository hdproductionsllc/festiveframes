import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { copy } from "@/content/copy";
import { SITE_URL } from "@/config/season";
import { getFoundingCounts } from "@/lib/founding-status";
import { Header } from "../../_components/Header";
import { Footer } from "../../_components/Footer";

const INK = "#1e1b17";
const PAGE_PATH = "/gifts/car-guy-gifts-under-50";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

// Price-qualified gift listicle targeting "car guy gifts under $50". Anchors the
// $39 custom frame as the hero pick alongside honest, general gift categories.
const META_TITLE = "Car Guy Gifts Under $50 They'll Actually Use";
const META_DESCRIPTION =
  "Car guy gifts under $50 he'll actually use, led by a $39 custom patriotic license plate frame he designs himself. Handmade in St. Louis, ships fast.";

export const metadata: Metadata = {
  title: { absolute: META_TITLE },
  description: META_DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: copy.site.brandName,
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
  twitter: {
    card: "summary_large_image",
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
};

const PAGE_FAQ = [
  {
    question: "What's the best car guy gift under $50?",
    answer:
      "Our pick is a custom patriotic license plate frame at $39. He designs it himself in the builder, snapping on the flag, an eagle, and his own bottom-bar phrase, so it's personal in a way most gifts under $50 never are. It goes right on the car he already cares about.",
  },
  {
    question: "Is $39 the full price?",
    answer:
      "Yes. $39 covers the fully customized, made-to-order frame with your choice of snap-on tiles and a custom phrase. It comes in under $50 with room to spare, and every frame is handmade in St. Louis, Missouri and ships fast.",
  },
  {
    question: "Will it arrive in time for a birthday or the 4th of July?",
    answer:
      "Frames are made to order and ship fast, so they work even for last-minute occasions. Every order is backed by a 30-day guarantee, so you can give it with confidence.",
  },
];

const TILES = [
  { src: "/tiles/july4/american-flag.png", alt: "American flag tile, a car guy gift under $50" },
  { src: "/tiles/july4/eagle.png", alt: "Bald eagle tile for an affordable patriotic car gift" },
  { src: "/tiles/july4/bomb-pop.png", alt: "Bomb pop tile for a fun car guy gift under $50" },
  { src: "/tiles/july4/star-red.png", alt: "Red star tile for a budget patriotic license plate frame gift" },
];

const PICKS = [
  {
    title: "Our pick: a custom $39 patriotic license plate frame",
    body:
      "The standout gift on this list. He designs it himself - flag, eagle, a \"250\" tile, his own phrase - and it goes on the car he already loves. Personal, American, and a true one-of-a-kind for $39.",
  },
  {
    title: "Detailing supplies and a good wash kit",
    body:
      "Microfiber towels, a foam cannon, quality soap, and tire shine sit comfortably under $50 and never go to waste. Useful, but he probably already restocks these himself.",
  },
  {
    title: "A quality tool he reaches for",
    body:
      "A torque wrench, a magnetic tray, or a solid set of trim tools earns a spot in any garage. Practical - though the car guy who has everything likely owns the basics already.",
  },
  {
    title: "Garage and car-care upgrades",
    body:
      "An air freshener he'll actually keep, a phone mount, or a tidy trunk organizer round out a gift basket under $50 without breaking the budget.",
  },
];

function buildJsonLd() {
  const faqPage = {
    "@type": "FAQPage",
    mainEntity: PAGE_FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  const breadcrumbList = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Gifts", item: `${SITE_URL}/gifts/car-guy-gifts-under-50` },
      { "@type": "ListItem", position: 3, name: "Car Guy Gifts Under $50", item: PAGE_URL },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [faqPage, breadcrumbList],
  };
}

export default async function CarGuyGiftsUnder50Page() {
  const jsonLd = buildJsonLd();
  const { remaining, cap } = await getFoundingCounts();
  const year = new Date().getFullYear();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header remaining={remaining} cap={cap} />
      <main id="main" tabIndex={-1} className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-[920px] px-5 pb-6 pt-[64px] text-center sm:px-7">
          <nav aria-label="Breadcrumb" className="mb-6 text-[13px] font-bold text-[#6a6354]">
            <Link href="/" className="text-[#6a6354] no-underline hover:text-[#1e1b17]">
              Home
            </Link>
            <span aria-hidden> › </span>
            <span className="text-[#6a6354]">Gifts</span>
            <span aria-hidden> › </span>
            <span className="text-[#1e1b17]">Car Guy Gifts Under $50</span>
          </nav>

          <div className="mb-3 text-[15px] font-extrabold tracking-[1.5px] text-[#ed5aa0]">
            ALL UNDER $50
          </div>
          <h1 className="m-0 text-[clamp(34px,6vw,56px)] font-bold leading-[1.02] tracking-[-1px]">
            Car Guy Gifts Under $50 They&apos;ll Actually Use
          </h1>
          <p className="mx-auto mt-5 max-w-[680px] text-[18px] font-semibold leading-[1.55] text-[#3a352c]">
            The trouble with car guy gifts under $50 is they usually end up in a drawer.
            Our hero pick does not: a $39 custom patriotic license plate frame he designs
            himself and bolts right onto the car. Made to order by hand in St. Louis,
            ships fast, backed by a 30-day guarantee.
          </p>

          <div className="mt-8">
            <Link
              href="/build"
              className="s-display s-press inline-flex items-center gap-2 rounded-full border-[3px] border-[#1e1b17] bg-[#f8c53b] px-7 py-3.5 text-[19px] font-semibold text-[#1e1b17] no-underline"
              style={{
                boxShadow: `4px 4px 0 ${INK}`,
                ["--press-shadow-lift" as string]: `6px 6px 0 ${INK}`,
                ["--press-shadow-press" as string]: `2px 2px 0 ${INK}`,
              }}
            >
              Build the $39 frame
              <span aria-hidden className="text-xl leading-none">→</span>
            </Link>
          </div>
        </section>

        {/* Tile gallery */}
        <section className="mx-auto max-w-[920px] px-5 pb-2 pt-10 sm:px-7" aria-labelledby="tiles-heading">
          <h2
            id="tiles-heading"
            className="m-0 text-center text-[clamp(26px,4.5vw,36px)] font-bold leading-none tracking-[-0.5px]"
          >
            What $39 actually gets him
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {TILES.map((tile) => (
              <div
                key={tile.src}
                className="flex aspect-square items-center justify-center rounded-[18px] border-[3px] border-[#1e1b17] bg-[#fff9ec] p-4"
                style={{ boxShadow: `4px 4px 0 ${INK}` }}
              >
                <Image
                  src={tile.src}
                  alt={tile.alt}
                  width={300}
                  height={300}
                  sizes="(max-width: 640px) 45vw, 200px"
                  className="h-full w-full object-contain"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Listicle */}
        <section className="border-t-[3px] border-[#1e1b17] bg-[#fff9ec]" aria-labelledby="picks-heading">
          <div className="mx-auto max-w-[820px] px-5 py-16 sm:px-7">
            <h2
              id="picks-heading"
              className="m-0 text-[clamp(26px,4.5vw,38px)] font-bold leading-[1.05] tracking-[-0.5px]"
            >
              Car guy gifts under $50, ranked by how much he&apos;ll use it
            </h2>
            <div className="mt-5 flex flex-col gap-5 text-[17px] font-medium leading-[1.6] text-[#3a352c]">
              <p>
                A great gift under $50 is not about the number on the tag - it is about
                whether he keeps it. The car guy who has everything restocks his own
                detailing kit and buys his own tools, so the gifts that stick are the ones
                he cannot simply order for himself. That is exactly why a custom frame he
                designs tops this list, with a few honest backups below it.
              </p>
            </div>

            <ol className="mt-7 flex list-none flex-col gap-4 p-0">
              {PICKS.map((pick, i) => (
                <li
                  key={pick.title}
                  className="rounded-[16px] border-[3px] border-[#1e1b17] bg-white px-5 py-4"
                  style={{ boxShadow: `4px 4px 0 ${INK}` }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="s-display mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 border-[#1e1b17] bg-[#f8c53b] text-[15px] font-bold leading-none"
                    >
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="m-0 text-[18px] font-bold leading-[1.2] text-[#1e1b17]">
                        {pick.title}
                      </h3>
                      <p className="mt-2 text-base font-medium leading-[1.55] text-[#3a352c]">
                        {pick.body}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-7 text-[17px] font-medium leading-[1.6] text-[#3a352c]">
              The pattern is clear: most car guy gifts under $50 are things he could buy
              himself in two clicks. The $39 custom patriotic license plate frame is the
              one he cannot, because it does not exist until he designs it. It celebrates
              America&apos;s 250th, it is made in the USA, and it is a genuine one-of-a-kind for
              well under fifty dollars.
            </p>

            <div className="mt-9">
              <Link
                href="/build"
                className="s-display s-press inline-flex items-center gap-2 rounded-full border-[3px] border-[#1e1b17] bg-[#ed5aa0] px-6 py-3 text-[17px] font-semibold text-[#fff9ec] no-underline"
                style={{
                  boxShadow: `4px 4px 0 ${INK}`,
                  ["--press-shadow-lift" as string]: `6px 6px 0 ${INK}`,
                  ["--press-shadow-press" as string]: `2px 2px 0 ${INK}`,
                }}
              >
                Design the $39 hero pick
                <span aria-hidden className="text-lg leading-none">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          className="mx-auto max-w-[860px] px-5 py-16 sm:px-7"
          aria-labelledby="faq-heading"
        >
          <div className="mb-9 text-center">
            <div className="mb-1.5 text-[15px] font-extrabold tracking-[1.5px] text-[#9b5fd0]">
              GOOD QUESTIONS
            </div>
            <h2
              id="faq-heading"
              className="m-0 text-[clamp(28px,5vw,40px)] font-bold leading-none tracking-[-1px]"
            >
              Gifts under $50, answered
            </h2>
          </div>

          <div className="flex flex-col gap-3.5">
            {PAGE_FAQ.map((item) => (
              <details
                key={item.question}
                className="group rounded-[16px] border-[3px] border-[#1e1b17] bg-[#fff9ec] px-5 py-4"
                style={{ boxShadow: `4px 4px 0 ${INK}` }}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-bold text-[#1e1b17]">
                  {item.question}
                  <span
                    aria-hidden
                    className="s-display flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 border-[#1e1b17] bg-[#f8c53b] text-lg leading-none transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-base font-medium leading-[1.55] text-[#3a352c]">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer year={year} />
    </>
  );
}
