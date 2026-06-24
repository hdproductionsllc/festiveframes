import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { copy } from "@/content/copy";
import { SITE_URL } from "@/config/season";
import { getFoundingCounts } from "@/lib/founding-status";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";

const INK = "#1e1b17";
const PAGE_PATH = "/america-250-license-plate-frame";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

// Flagship long-tail landing page targeting "america 250 license plate frame"
// and "1776 2026 license plate frame" (near-zero competition, ownable now).
// Lives in the (home) route group so it inherits the sticker theme + fonts; it
// brings its own Header/Footer (same as the homepage) for full chrome.
const META_TITLE = "America 250 License Plate Frame (1776-2026) | $39";
const META_DESCRIPTION =
  "Celebrate America's 250th with a custom 1776-2026 license plate frame. Snap on a \"250\" tile, the flag, an eagle & your own phrase. $39, handmade in St. Louis, ships fast.";

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

// Three FAQs reused from the homepage set (visible text matches the JSON-LD).
const PAGE_FAQ = [
  {
    question: "What is an America 250 license plate frame?",
    answer:
      "It's a patriotic license plate frame celebrating the United States' 250th anniversary (the semiquincentennial, 1776-2026). At Festive Frames you design your own with snap-on tiles like \"250,\" \"1776-2026,\" the flag, and a landing eagle, plus a custom phrase along the bottom.",
  },
  {
    question: "How much does a custom America 250 license plate frame cost?",
    answer:
      "$39 for a fully customized, made-to-order frame - a giftable price point under $40 that includes your choice of snap-on tiles and a custom bottom-bar phrase.",
  },
  {
    question: "Where are Festive Frames made?",
    answer:
      "Every frame is handmade in the USA, in St. Louis, Missouri. Made-in-USA patriotic buyers can order with confidence.",
  },
];

const TILES = [
  { src: "/tiles/july4/250.png", alt: "\"250\" anniversary tile for an America 250 license plate frame" },
  { src: "/tiles/july4/1776-2026.png", alt: "\"1776-2026\" semiquincentennial tile for a patriotic license plate frame" },
  { src: "/tiles/july4/american-flag.png", alt: "American flag snap-on license plate frame tile" },
  { src: "/tiles/july4/eagle.png", alt: "Landing bald eagle tile for a patriotic license plate frame" },
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
      { "@type": "ListItem", position: 2, name: "America 250 License Plate Frame", item: PAGE_URL },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [faqPage, breadcrumbList],
  };
}

export default async function America250Page() {
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
            <span className="text-[#1e1b17]">America 250 License Plate Frame</span>
          </nav>

          <div className="mb-3 text-[15px] font-extrabold tracking-[1.5px] text-[#ed5aa0]">
            ONCE IN A LIFETIME · 1776-2026
          </div>
          <h1 className="m-0 text-[clamp(34px,6vw,56px)] font-bold leading-[1.02] tracking-[-1px]">
            Your America 250 License Plate Frame (1776-2026)
          </h1>
          <p className="mx-auto mt-5 max-w-[680px] text-[18px] font-semibold leading-[1.55] text-[#3a352c]">
            Mark the United States&apos; 250th birthday with a frame you design yourself:
            snap on the &quot;250&quot; tile, the &quot;1776-2026&quot; tile, the flag, and a
            landing eagle, then write your own phrase along the bottom. $39, made to order by
            hand in St. Louis, ships fast, backed by a 30-day guarantee.
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
              Design your America 250 frame
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
            The tiles that make it America 250
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
              A once-in-a-lifetime keepsake for the semiquincentennial
            </h2>
            <div className="mt-5 flex flex-col gap-5 text-[17px] font-medium leading-[1.6] text-[#3a352c]">
              <p>
                The United States turns 250 in 2026, and it only happens once. An America 250
                license plate frame turns your car into a rolling tribute to the
                semiquincentennial - the 1776-2026 milestone that your kids and grandkids will
                only ever read about. Festive Frames lets you design your own 1776-2026 license
                plate frame online, so it says exactly what you want it to say for the country&apos;s
                250th birthday.
              </p>
              <p>
                Start in our builder and snap on the tiles that tell the story: a bold &quot;250&quot;
                tile, the &quot;1776-2026&quot; tile, the American flag, and a landing bald eagle, plus
                stars, stripes, the Liberty Bell, and firework bursts. Then write your own phrase
                along the bottom bar - a name, your town, a military branch, or a 4th of July
                message. Every tile snaps into the border by hand, so the frame never covers your
                plate numbers, your registration sticker, or your state name.
              </p>
              <p>
                Every America 250 frame is made to order, by hand, in St. Louis, Missouri. Nothing
                sits in a warehouse: once you design it and order, your frame is UV printed fresh
                for you and ships fast - fast enough to make it a last-minute 4th of July gift for
                a parade, a cookout, or a birthday. At $39 it lands under $40, a giftable price for
                a genuinely unique, made-in-USA keepsake.
              </p>
              <p>
                It&apos;s a standout patriotic gift for the car guy, the car lover, the veteran, the
                military family, or the dad who already has everything. Because it celebrates a
                once-in-a-lifetime anniversary, an America 250 license plate frame stays meaningful
                all year and well beyond the Fourth. We stand behind every frame with a 30-day
                guarantee, so you can order with confidence. Design yours today and roll into
                America&apos;s 250th in style.
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
                Design your America 250 frame
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
              America 250, answered
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
