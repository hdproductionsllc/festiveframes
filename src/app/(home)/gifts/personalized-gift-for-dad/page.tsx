import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { copy } from "@/content/copy";
import { SITE_URL } from "@/config/season";
import { Header } from "../../_components/Header";
import { Footer } from "../../_components/Footer";

const INK = "#1e1b17";
const PAGE_PATH = "/gifts/personalized-gift-for-dad";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

// Gift landing page targeting "personalized license plate frame gift for dad".
// Leans on the Father's Day -> July 4 dual gift window and the "car dad" angle.
const META_TITLE = "Personalized License Plate Frame Gift for Dad | $39";
const META_DESCRIPTION =
  "A personalized license plate frame gift for dad he designs himself: flag, eagle, his own phrase. $39, handmade in St. Louis, ships fast for Father's Day or July 4.";

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
    question: "What makes a personalized license plate frame gift for dad special?",
    answer:
      "It's personal in a way most dad gifts aren't. You (or he) pick the tiles - the flag, an eagle, a \"250\" tile - and write a phrase along the bottom: his name, his town, a kid's nickname, or a military branch. Then it goes on the car the car dad already loves and sees every single day.",
  },
  {
    question: "Is it a Father's Day gift or a 4th of July gift?",
    answer:
      "Both. It lands perfectly in the Father's Day to July 4 window. Order it as a personalized Father's Day gift, or as a patriotic 4th of July gift for dad. Either way it's $39, made to order by hand in St. Louis, and ships fast.",
  },
  {
    question: "What if I'm not sure what he'd want on it?",
    answer:
      "Let him design it, or keep it simple with his last name plus a flag and an eagle. Every order is backed by a 30-day guarantee, so a personalized gift for dad is a safe bet either way.",
  },
];

const TILES = [
  { src: "/tiles/july4/american-flag.png", alt: "American flag tile for a personalized license plate frame gift for dad" },
  { src: "/tiles/july4/eagle.png", alt: "Bald eagle tile for a car dad's personalized frame" },
  { src: "/tiles/july4/usa.png", alt: "\"USA\" tile for a patriotic Father's Day license plate frame" },
  { src: "/tiles/july4/liberty-bell.png", alt: "Liberty Bell tile for a personalized gift for dad" },
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
      { "@type": "ListItem", position: 2, name: "Gifts", item: `${SITE_URL}/gifts/personalized-gift-for-dad` },
      { "@type": "ListItem", position: 3, name: "Personalized Gift for Dad", item: PAGE_URL },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [faqPage, breadcrumbList],
  };
}

export default async function PersonalizedGiftForDadPage() {
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
            <span className="text-[#1e1b17]">Personalized Gift for Dad</span>
          </nav>

          <div className="mb-3 text-[15px] font-extrabold tracking-[1.5px] text-[#ed5aa0]">
            FATHER&apos;S DAY · JULY 4
          </div>
          <h1 className="m-0 text-[clamp(34px,6vw,56px)] font-bold leading-[1.02] tracking-[-1px]">
            A Personalized License Plate Frame Gift for Dad
          </h1>
          <p className="mx-auto mt-5 max-w-[680px] text-[18px] font-semibold leading-[1.55] text-[#3a352c]">
            For the car dad who washes it on Saturdays and notices every detail: a
            personalized license plate frame he helps design. Snap on the flag, an eagle,
            a &quot;250&quot; tile, and write his name along the bottom. $39, made to order by
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
              Personalize dad&apos;s frame
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
            Make it his
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
              Why a personalized license plate frame is the gift for dad this year
            </h2>
            <div className="mt-5 flex flex-col gap-5 text-[17px] font-medium leading-[1.6] text-[#3a352c]">
              <p>
                Some dads are easy to shop for. The car dad is not. He keeps his ride
                spotless, knows the tire pressure off the top of his head, and quietly
                replaces anything he actually needs before you can buy it for him. A
                personalized license plate frame gift for dad sidesteps all of that. It is
                not another mug or another tie - it is something made specifically for him
                that lives on the car he is proud of.
              </p>
              <p>
                You design it together, or surprise him. Snap on the American flag, a
                landing bald eagle, the Liberty Bell, stars and stripes, and the &quot;250&quot;
                and &quot;1776-2026&quot; tiles for America&apos;s 250th. Then write his phrase along the
                bottom bar: his last name, his hometown, his branch of service, or a
                nickname the grandkids gave him. The frame snaps together by hand and never
                covers his plate, his sticker, or his state name.
              </p>
              <p>
                The timing could not be better. Father&apos;s Day and the Fourth of July fall
                just weeks apart, which makes this a dual-window gift: a personalized
                Father&apos;s Day present that doubles as a patriotic 4th of July gift for dad.
                Every frame is made to order, by hand, in St. Louis, Missouri and ships
                fast - fast enough to make it under the wire for either occasion. At $39 it
                is a giftable price under $40 for something genuinely one of a kind.
              </p>
              <p>
                It is a standout gift for the car dad, the veteran dad, the granddad, or
                the new dad with his first family hauler. Because it marks a once-in-a-
                lifetime anniversary, a personalized America&apos;s 250th frame stays meaningful long
                after the holiday weekend. And with a 30-day guarantee behind every order,
                you can give it with confidence. Start his design today and give dad
                something he will actually keep.
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
                Build dad&apos;s personalized frame
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
              A gift for dad, answered
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
