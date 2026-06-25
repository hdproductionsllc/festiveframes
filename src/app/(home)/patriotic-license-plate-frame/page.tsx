import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { copy } from "@/content/copy";
import { SITE_URL } from "@/config/season";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";

const INK = "#1e1b17";
const PAGE_PATH = "/patriotic-license-plate-frame";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

// Evergreen money page targeting "patriotic license plate frame". Leads with the
// design-your-own differentiator so it stays relevant long after the Fourth.
const META_TITLE = "Custom Patriotic License Plate Frames | $39";
const META_DESCRIPTION =
  "Design your own patriotic license plate frame: snap on flags, eagles & stars, then add a custom phrase. $39, made to order by hand in the USA, ships fast. 30-day guarantee.";

export const metadata: Metadata = {
  title: { absolute: META_TITLE },
  description: META_DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: copy.site.brandEntity,
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
    question: "What makes a Festive Frames patriotic license plate frame different?",
    answer:
      "You design it yourself. Instead of buying a fixed off-the-shelf design, you snap on the patriotic tiles you want - flags, eagles, stars and stripes - and write your own bottom-bar phrase, so no two frames are quite the same.",
  },
  {
    question: "How much does a custom patriotic license plate frame cost?",
    answer:
      "$39 for a fully customized, made-to-order frame. That includes your choice of snap-on tiles and a custom phrase along the bottom - a giftable price point under $40.",
  },
  {
    question: "Is a patriotic license plate frame only for the Fourth of July?",
    answer:
      "Not at all. Stars, stripes, flags and eagles are evergreen, so a patriotic frame looks right all year - on a daily driver, a truck, a veteran's car, or as a gift for any proud American. It's not tied to one holiday.",
  },
];

const TILES = [
  { src: "/tiles/july4/american-flag.png", alt: "American flag tile for a custom patriotic license plate frame" },
  { src: "/tiles/july4/eagle.png", alt: "Bald eagle tile for a patriotic license plate frame" },
  { src: "/tiles/july4/star-red.png", alt: "Red star tile for a stars-and-stripes patriotic license plate frame" },
  { src: "/tiles/july4/star-blue.png", alt: "Blue star tile for a patriotic license plate frame" },
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
      { "@type": "ListItem", position: 2, name: "Patriotic License Plate Frame", item: PAGE_URL },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [faqPage, breadcrumbList],
  };
}

export default async function PatrioticPage() {
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
            <span className="text-[#1e1b17]">Patriotic License Plate Frame</span>
          </nav>

          <div className="mb-3 text-[15px] font-extrabold tracking-[1.5px] text-[#ed5aa0]">
            DESIGN YOUR OWN · STARS & STRIPES
          </div>
          <h1 className="m-0 text-[clamp(34px,6vw,56px)] font-bold leading-[1.02] tracking-[-1px]">
            Custom Patriotic License Plate Frames
          </h1>
          <p className="mx-auto mt-5 max-w-[680px] text-[18px] font-semibold leading-[1.55] text-[#3a352c]">
            Build a patriotic license plate frame that&apos;s yours alone: snap on the American
            flag, a landing eagle, and red and blue stars, then write your own phrase along the
            bottom. $39, made to order by hand in the USA, ships fast, backed by a 30-day
            guarantee.
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
              Design your patriotic frame
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
            Snap-on tiles that make it patriotic
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
              A patriotic license plate frame you design, not one you settle for
            </h2>
            <div className="mt-5 flex flex-col gap-5 text-[17px] font-medium leading-[1.6] text-[#3a352c]">
              <p>
                Most patriotic license plate frames come one way: a fixed design, stamped out by
                the thousand, that everyone else already has on their bumper. Festive Frames works
                the opposite way. You open our online builder and assemble the frame yourself,
                tile by tile, so the finished piece says exactly what you want it to say about
                your country and your car.
              </p>
              <p>
                Snap on the patriotic pieces that speak to you - the American flag, a waving flag,
                a landing bald eagle, red and blue stars, stripes, the Liberty Bell, and firework
                bursts. Then add a custom phrase along the bottom bar: a name, a hometown, a unit,
                or a line you love. Every tile clicks into the border by hand, and nothing ever
                covers your plate numbers, your registration sticker, or your state name.
              </p>
              <p>
                Because stars and stripes never go out of season, a custom patriotic license plate
                frame works all year - on a daily commuter, a weekend truck, a classic, or a
                veteran&apos;s car. It&apos;s right for the Fourth of July, sure, but also for
                Memorial Day, Veterans Day, an election year, or simply for someone who flies the
                flag proudly every single day.
              </p>
              <p>
                Each frame is made to order, by hand, in the USA, then UV printed fresh and shipped
                fast. At $39 it&apos;s an easy gift for the car guy, the truck owner, the veteran,
                or the dad who has everything - a genuinely unique, made-in-USA keepsake under $40.
                We back every order with a 30-day guarantee, so you can design yours with full
                confidence. Start in the builder and make a patriotic frame that&apos;s unmistakably
                yours.
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
                Design your patriotic frame
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
              Patriotic frames, answered
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
