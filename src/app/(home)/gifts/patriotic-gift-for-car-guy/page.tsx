import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { copy } from "@/content/copy";
import { SITE_URL } from "@/config/season";
import { Header } from "../../_components/Header";
import { Footer } from "../../_components/Footer";

const INK = "#1e1b17";
const PAGE_PATH = "/gifts/patriotic-gift-for-car-guy";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

// Cross-cluster gift long-tail landing page targeting "patriotic gift for car
// guy". Funnels gift shoppers straight into the builder. Lives in the (home)
// route group so it inherits the sticker theme + fonts; brings its own
// Header/Footer for full home chrome.
// Gift-intent title; append the locked brand entity so the brand and its
// "License Plate Frames" category co-occur in the <title> (this page's headline
// targets the gift keyword, not the category).
const META_TITLE =
  "Patriotic Gift for the Car Guy Who Has Everything | Festive Frames – Custom License Plate Frames";
const META_DESCRIPTION =
  "The patriotic gift for the car guy who has everything: a custom America's 250th license plate frame he designs himself. $39, handmade in St. Louis, ships fast.";

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
    question: "Why is a custom license plate frame the patriotic gift for the car guy who has everything?",
    answer:
      "Because he picks every piece of it. Instead of another gadget he already owns, he designs his own patriotic license plate frame: snap on the flag, an eagle, a \"250\" tile, and his own bottom-bar phrase. It's personal, it's American, and it lives on the car he loves.",
  },
  {
    question: "How much does it cost and how fast does it ship?",
    answer:
      "It's $39, a giftable price under $40. Every frame is made to order by hand in St. Louis, Missouri and ships fast, so it works even as a last-minute 4th of July or birthday gift.",
  },
  {
    question: "What if he doesn't like it?",
    answer:
      "He designs it himself, so it says exactly what he wants. And every Festive Frames order is backed by a 30-day guarantee, so you can give it with confidence.",
  },
];

const TILES = [
  { src: "/tiles/july4/american-flag.png", alt: "American flag snap-on tile for a patriotic gift for a car guy" },
  { src: "/tiles/july4/eagle.png", alt: "Landing bald eagle tile for a car guy's patriotic license plate frame" },
  { src: "/tiles/july4/250.png", alt: "\"250\" America anniversary tile to gift a car enthusiast" },
  { src: "/tiles/july4/firecracker.png", alt: "Firecracker tile for a 4th of July car gift" },
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
      { "@type": "ListItem", position: 2, name: "Gifts", item: `${SITE_URL}/gifts/patriotic-gift-for-car-guy` },
      { "@type": "ListItem", position: 3, name: "Patriotic Gift for the Car Guy", item: PAGE_URL },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [faqPage, breadcrumbList],
  };
}

export default async function PatrioticGiftForCarGuyPage() {
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
            <span className="text-[#6a6354]">Gifts</span>
            <span aria-hidden> › </span>
            <span className="text-[#1e1b17]">Patriotic Gift for the Car Guy</span>
          </nav>

          <div className="mb-3 text-[15px] font-extrabold tracking-[1.5px] text-[#ed5aa0]">
            THE ONE HE DOESN&apos;T ALREADY OWN
          </div>
          <h1 className="m-0 text-[clamp(34px,6vw,56px)] font-bold leading-[1.02] tracking-[-1px]">
            The Patriotic Gift for the Car Guy Who Has Everything
          </h1>
          <p className="mx-auto mt-5 max-w-[680px] text-[18px] font-semibold leading-[1.55] text-[#3a352c]">
            He has the tools, the detailing kit, the floor mats. He does not have a
            patriotic license plate frame he designed himself. Snap on the flag, an
            eagle, a &quot;250&quot; tile and his own phrase. $39, made to order by hand in
            St. Louis, ships fast, backed by a 30-day guarantee.
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
              Design his frame in the builder
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
            Snap-on tiles he&apos;ll actually pick
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
              Why this is the patriotic gift for a car guy who has everything
            </h2>
            <div className="mt-5 flex flex-col gap-5 text-[17px] font-medium leading-[1.6] text-[#3a352c]">
              <p>
                Shopping for the car guy is hard. He buys his own parts the moment he
                wants them, so by the time a birthday or the Fourth of July rolls around,
                the obvious gifts are already in his garage. The trick is not to outspend
                him - it is to give him something he can make his own. A patriotic license
                plate frame he designs himself does exactly that. It is personal, it is
                American, and it goes right on the car he is proudest of.
              </p>
              <p>
                Instead of guessing, you hand him the builder. He snaps on the tiles that
                fit his ride: the American flag, a landing bald eagle, the Liberty Bell,
                stars and stripes, a firework burst, and the &quot;250&quot; and &quot;1776-2026&quot;
                tiles for America&apos;s 250th. Then he writes his own phrase along the bottom
                bar - his last name, his town, his branch of service, or an inside joke
                only he and his buddies will get. No two frames come out the same.
              </p>
              <p>
                Every frame is made to order, by hand, in St. Louis, Missouri. Nothing
                sits in a warehouse waiting. Once the design is set and the order is in,
                his frame is printed fresh and ships fast - fast enough to land as a
                last-minute 4th of July gift before the parade or the cookout. At $39 it
                comes in under $40, a giftable price for something he will not find
                anywhere else and did not already buy himself.
              </p>
              <p>
                Whether he is into trucks, muscle cars, weekend project builds, or just
                proud to fly the flag, this is the patriotic gift for the car guy who has
                everything. It celebrates a once-in-a-lifetime anniversary, so it stays
                meaningful long after the Fourth. And because every order is backed by a
                30-day guarantee, you can give it with total confidence. Start his design
                today.
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
                Build the perfect car-guy gift
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
              Gifting it, answered
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
