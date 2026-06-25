import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { copy } from "@/content/copy";
import { SITE_URL } from "@/config/season";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";

const INK = "#1e1b17";
const PAGE_PATH = "/made-in-usa-license-plate-frame";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

// Targets "made in USA license plate frame". Provenance / trust angle - the
// St. Louis hand-made story is the hero.
const META_TITLE = "License Plate Frames Made in the USA | $39";
const META_DESCRIPTION =
  "License plate frames made in the USA - designed by you, handmade to order in St. Louis, MO. Snap-on patriotic tiles, a custom phrase, $39, ships fast. 30-day guarantee.";

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
    question: "Are these license plate frames really made in the USA?",
    answer:
      "Yes. Every Festive Frames order is made to order by hand in the United States - in St. Louis, Missouri. Nothing is pre-stocked overseas; your frame is built and printed fresh after you design it.",
  },
  {
    question: "What does \"made to order\" mean for a made-in-USA license plate frame?",
    answer:
      "It means we don't print anything until you've designed it. Once you pick your snap-on tiles and custom phrase, your frame is UV printed and assembled by hand in St. Louis, then shipped fast straight to you.",
  },
  {
    question: "How much is a made-in-USA license plate frame, and is it guaranteed?",
    answer:
      "$39 for a fully customized, American-made frame, and it's backed by a 30-day guarantee. If you're not happy with it, we'll make it right.",
  },
];

const TILES = [
  { src: "/tiles/july4/usa.png", alt: "\"USA\" tile for a license plate frame made in the USA" },
  { src: "/tiles/july4/american-flag.png", alt: "American flag tile for a made-in-USA license plate frame" },
  { src: "/tiles/july4/eagle.png", alt: "Bald eagle tile for an American-made license plate frame" },
  { src: "/tiles/july4/liberty-bell.png", alt: "Liberty Bell tile for a license plate frame made in the USA" },
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
      { "@type": "ListItem", position: 2, name: "Made in USA License Plate Frame", item: PAGE_URL },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [faqPage, breadcrumbList],
  };
}

export default async function MadeInUsaPage() {
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
            <span className="text-[#1e1b17]">Made in USA License Plate Frame</span>
          </nav>

          <div className="mb-3 text-[15px] font-extrabold tracking-[1.5px] text-[#ed5aa0]">
            HANDMADE IN ST. LOUIS, MO · USA
          </div>
          <h1 className="m-0 text-[clamp(34px,6vw,56px)] font-bold leading-[1.02] tracking-[-1px]">
            License Plate Frames Made in the USA
          </h1>
          <p className="mx-auto mt-5 max-w-[680px] text-[18px] font-semibold leading-[1.55] text-[#3a352c]">
            Buy a license plate frame made in the USA - designed by you and built by hand in St.
            Louis, Missouri. Snap on patriotic tiles, add your own phrase, and we print it fresh.
            $39, ships fast, backed by a 30-day guarantee.
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
              Design your American-made frame
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
            American tiles, printed in America
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
              Made in the USA, by hand, in St. Louis
            </h2>
            <div className="mt-5 flex flex-col gap-5 text-[17px] font-medium leading-[1.6] text-[#3a352c]">
              <p>
                &quot;Made in the USA&quot; gets printed on a lot of packaging that was filled
                overseas. Ours isn&apos;t one of them. A Festive Frames license plate frame made in
                the USA is exactly that - designed in our online builder, then assembled and printed
                by hand in St. Louis, Missouri. There&apos;s no warehouse of finished frames waiting
                in another country; your frame doesn&apos;t exist until you create it.
              </p>
              <p>
                Here&apos;s how the American-made part actually works. You snap your tiles together
                online - the flag, an eagle, the &quot;USA&quot; tile, the Liberty Bell, stars and
                stripes - and write your custom phrase along the bottom. The moment you order, that
                exact design is UV printed and built by hand on a sturdy frame right here in
                Missouri. A real person makes the thing you designed, in the country it celebrates.
              </p>
              <p>
                Buying American-made matters more on a product like this, because the whole point is
                national pride. It would be a strange patriotic frame that was mass-produced abroad.
                When you choose a made-in-USA license plate frame from us, you&apos;re supporting a
                small US shop, keeping the work here, and getting a product whose story actually
                matches its design.
              </p>
              <p>
                Made-to-order also means quality you can trust: nothing sits on a shelf fading, and
                every frame is checked by the person who built it before it ships fast to your door.
                At $39 it&apos;s an honest, giftable price for an American-made keepsake under $40,
                and it&apos;s backed by a 30-day guarantee. Design yours today and own a license
                plate frame that was genuinely made in the USA.
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
                Design your American-made frame
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
              Made in the USA, answered
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
