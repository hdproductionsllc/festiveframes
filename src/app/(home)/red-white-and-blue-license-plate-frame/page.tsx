import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { copy } from "@/content/copy";
import { SITE_URL } from "@/config/season";
import { getFoundingCounts } from "@/lib/founding-status";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";

const INK = "#1e1b17";
const PAGE_PATH = "/red-white-and-blue-license-plate-frame";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

// Targets "red white and blue license plate frame". Color-first: showcase the
// palette across the tiles, then route into the builder.
const META_TITLE = "Red, White & Blue License Plate Frames | $39";
const META_DESCRIPTION =
  "Build a red, white and blue license plate frame from snap-on tiles - flags, stars, fireworks - plus your own phrase. $39, handmade in the USA, ships fast. 30-day guarantee.";

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
    question: "Is the whole frame red, white, and blue?",
    answer:
      "The palette runs through every tile - red stars, blue stars, the flag's red-white-blue, fireworks and a bomb pop. You mix and match the tiles you like, so your red, white and blue license plate frame leans whichever way you want.",
  },
  {
    question: "Can I add my own text to a red, white and blue license plate frame?",
    answer:
      "Yes. Below the tiles there's a custom bottom bar where you type your own phrase - a name, a town, or a short line - so the red-white-and-blue look is paired with words that are yours.",
  },
  {
    question: "How much is a red, white and blue license plate frame?",
    answer:
      "$39 for a fully customized, made-to-order frame, handmade in the USA, ships fast, and backed by a 30-day guarantee.",
  },
];

const TILES = [
  { src: "/tiles/july4/star-red.png", alt: "Red star tile for a red, white and blue license plate frame" },
  { src: "/tiles/july4/star-blue.png", alt: "Blue star tile for a red, white and blue license plate frame" },
  { src: "/tiles/july4/american-flag.png", alt: "Red-white-and-blue American flag license plate frame tile" },
  { src: "/tiles/july4/firecracker.png", alt: "Red, white and blue firework tile for a license plate frame" },
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
      { "@type": "ListItem", position: 2, name: "Red, White & Blue License Plate Frame", item: PAGE_URL },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [faqPage, breadcrumbList],
  };
}

export default async function RedWhiteBluePage() {
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
            <span className="text-[#1e1b17]">Red, White &amp; Blue License Plate Frame</span>
          </nav>

          <div className="mb-3 text-[15px] font-extrabold tracking-[1.5px] text-[#ed5aa0]">
            RED · WHITE · BLUE
          </div>
          <h1 className="m-0 text-[clamp(34px,6vw,56px)] font-bold leading-[1.02] tracking-[-1px]">
            Red, White &amp; Blue License Plate Frames
          </h1>
          <p className="mx-auto mt-5 max-w-[680px] text-[18px] font-semibold leading-[1.55] text-[#3a352c]">
            Build a red, white and blue license plate frame from a palette of snap-on tiles - red
            and blue stars, the flag, and fireworks - then add your own phrase. $39, made to order
            by hand in the USA, ships fast, backed by a 30-day guarantee.
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
              Build your red, white &amp; blue frame
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
            The red, white &amp; blue palette
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
              A red, white and blue license plate frame, mixed your way
            </h2>
            <div className="mt-5 flex flex-col gap-5 text-[17px] font-medium leading-[1.6] text-[#3a352c]">
              <p>
                Red, white, and blue is the whole brief here. Every tile in our builder is drawn in
                the national palette, so a red, white and blue license plate frame from Festive
                Frames comes together the moment you start snapping pieces in. The deep flag blue,
                the bright firework red, the clean white between them - it&apos;s a color story
                that reads instantly from across a parking lot.
              </p>
              <p>
                What makes it yours is the mix. Lean heavy on red with firework bursts and a bomb
                pop, or cool it down with blue stars and the field of the flag - then balance it
                with white space so it never looks busy. Snap on the American flag, red stars, blue
                stars, stripes, and sparks in any combination you like. Each tile clicks into the
                border by hand and frames your plate without covering the numbers, sticker, or
                state name.
              </p>
              <p>
                Then there&apos;s the bottom bar, where you add your own phrase in your own words -
                a name, a hometown, or a short line. That pairing of a strong red-white-and-blue
                look with personal text is what turns a color scheme into a frame that&apos;s
                actually about you. No two come out quite the same.
              </p>
              <p>
                It suits a daily driver, a show truck, a boat trailer, or a gift for anyone who
                flies the colors. Every frame is made to order, by hand, in the USA, then printed
                fresh and shipped fast. At $39 it&apos;s a giftable, under-$40 keepsake, backed by a
                30-day guarantee. Open the builder, play with the palette, and design a red, white
                and blue license plate frame that&apos;s unmistakably yours.
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
                Build your red, white &amp; blue frame
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
              Red, white &amp; blue, answered
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
