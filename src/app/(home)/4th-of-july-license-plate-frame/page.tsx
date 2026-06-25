import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { copy } from "@/content/copy";
import { SITE_URL } from "@/config/season";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";

const INK = "#1e1b17";
const PAGE_PATH = "/4th-of-july-license-plate-frame";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

// Seasonal page targeting "4th of july license plate frame". Parade / party
// energy + "ships fast for last-minute gifts" for the late-June rush.
const META_TITLE = "4th of July License Plate Frames | Ships Fast";
const META_DESCRIPTION =
  "Roll into the 4th of July with a custom license plate frame: flags, fireworks & a bomb pop, plus your own phrase. $39, handmade in the USA, ships fast for last-minute gifts.";

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
    question: "Will a 4th of July license plate frame ship in time?",
    answer:
      "We make to order and ship fast, which is exactly why a custom 4th of July license plate frame works for last-minute gifts. Order early in the week of the holiday and there's real runway - but the sooner you design it, the safer the timing.",
  },
  {
    question: "What goes on a 4th of July license plate frame?",
    answer:
      "Whatever says summer and stars-and-stripes to you: the American flag, firework bursts, a bomb pop, an eagle, and stars. Then add your own bottom-bar phrase - your town, your last name, or a Fourth of July line.",
  },
  {
    question: "How much is a 4th of July license plate frame?",
    answer:
      "$39 for a fully customized, made-to-order frame, handmade in the USA and backed by a 30-day guarantee. It's a giftable, under-$40 way to deck out a car for the holiday.",
  },
];

const TILES = [
  { src: "/tiles/july4/american-flag.png", alt: "American flag tile for a 4th of July license plate frame" },
  { src: "/tiles/july4/firecracker.png", alt: "Firework tile for a 4th of July license plate frame" },
  { src: "/tiles/july4/bomb-pop.png", alt: "Red-white-and-blue bomb pop tile for a 4th of July license plate frame" },
  { src: "/tiles/july4/uncle-sam-hat.png", alt: "Uncle Sam hat tile for a Fourth of July license plate frame" },
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
      { "@type": "ListItem", position: 2, name: "4th of July License Plate Frame", item: PAGE_URL },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [faqPage, breadcrumbList],
  };
}

export default async function FourthOfJulyPage() {
  const jsonLd = buildJsonLd();
  const year = new Date().getFullYear();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main id="main" tabIndex={-1} className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-[920px] px-5 pb-6 pt-[64px] text-center sm:px-7">
          <nav aria-label="Breadcrumb" className="mb-6 text-[13px] font-bold text-[#6a6354]">
            <Link href="/" className="text-[#6a6354] no-underline hover:text-[#1e1b17]">
              Home
            </Link>
            <span aria-hidden> › </span>
            <span className="text-[#1e1b17]">4th of July License Plate Frame</span>
          </nav>

          <div className="mb-3 text-[15px] font-extrabold tracking-[1.5px] text-[#ed5aa0]">
            PARADE-READY · SHIPS FAST
          </div>
          <h1 className="m-0 text-[clamp(34px,6vw,56px)] font-bold leading-[1.02] tracking-[-1px]">
            4th of July License Plate Frames
          </h1>
          <p className="mx-auto mt-5 max-w-[680px] text-[18px] font-semibold leading-[1.55] text-[#3a352c]">
            Deck out the car for the holiday with a custom 4th of July license plate frame: snap on
            the flag, firework bursts, and a bomb pop, then add your own phrase. $39, made to order
            by hand in the USA, and it ships fast for last-minute gifts.
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
              Design your 4th of July frame
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
            Tiles built for the Fourth
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

        {/* Long-form, keyword-rich body */}
        <section className="border-t-[3px] border-[#1e1b17] bg-[#fff9ec]" aria-labelledby="about-heading">
          <div className="mx-auto max-w-[820px] px-5 py-16 sm:px-7">
            <h2
              id="about-heading"
              className="m-0 text-[clamp(26px,4.5vw,38px)] font-bold leading-[1.05] tracking-[-0.5px]"
            >
              A 4th of July license plate frame for the parade, the party, and the drive home
            </h2>
            <div className="mt-5 flex flex-col gap-5 text-[17px] font-medium leading-[1.6] text-[#3a352c]">
              <p>
                The Fourth is a car holiday. There&apos;s the parade lineup, the drive to the lake,
                the cookout caravan, and the slow roll home under the fireworks. A custom 4th of July
                license plate frame puts the holiday right on the bumper - flags, sparks, and a bomb
                pop framing your plate while you celebrate. It&apos;s the kind of detail people
                actually point at in a parking lot full of cars.
              </p>
              <p>
                You design it yourself in our builder, so it fits your celebration exactly. Snap on
                the American flag, firework bursts, a bomb pop, an Uncle Sam hat, stars, and stripes,
                then write your own phrase along the bottom - your town, a family name, &quot;Happy
                4th,&quot; or whatever your crew yells off the tailgate. Every tile clicks into the
                border by hand and never hides your plate numbers or sticker.
              </p>
              <p>
                Because Fourth of July gifts are famously last-minute, the timing question matters,
                and this is where made-to-order works in your favor: we print and build fast, then
                ship fast. Design it early in the holiday week and there&apos;s real runway to get it
                on the car before the parade. Even a same-week idea has a shot - the sooner you
                build, the better the odds.
              </p>
              <p>
                It makes a fun, useful gift, too - for the host, the truck owner, the car guy, or the
                dad manning the grill. At $39 it lands under $40, it&apos;s made to order by hand in
                the USA, and it&apos;s backed by a 30-day guarantee. Don&apos;t wait on this one:
                open the builder, design your 4th of July license plate frame, and roll into the
                holiday in style.
              </p>
            </div>

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
                Design your 4th of July frame
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
              The Fourth, answered
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
