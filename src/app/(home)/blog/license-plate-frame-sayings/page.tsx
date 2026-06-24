import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { copy } from "@/content/copy";
import { SITE_URL } from "@/config/season";
import { getFoundingCounts } from "@/lib/founding-status";
import { Header } from "../../_components/Header";
import { Footer } from "../../_components/Footer";

const INK = "#1e1b17";
const PAGE_PATH = "/blog/license-plate-frame-sayings";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

// Useful list-post targeting "license plate frame sayings / ideas". Genuinely
// helpful phrase list that funnels into the builder.
const META_TITLE = "50 License Plate Frame Sayings (Build Your Own)";
const META_DESCRIPTION =
  "50 license plate frame sayings and bottom-bar phrase ideas - patriotic, funny, car, family, faith, veteran - then build your own custom frame for $39.";

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

const SAYINGS: { category: string; phrases: string[] }[] = [
  {
    category: "Patriotic",
    phrases: [
      "One Nation, On The Road",
      "Land Of The Free, Built For The Drive",
      "Stars, Stripes & Horsepower",
      "Proud To Fly It",
      "Red, White & Road-Ready",
      "Forged In 1776",
      "America At 250",
      "Born In The USA, Driven Everywhere",
      "Freedom Has A Throttle",
      "Old Glory Rides Along",
    ],
  },
  {
    category: "Funny",
    phrases: [
      "Not Lost, Just Exploring",
      "My Other Ride Is A Lawn Mower",
      "Brake For No One (Kidding, I Brake)",
      "Powered By Coffee & Bad Decisions",
      "Honk If Parts Are Falling Off",
      "Built, Not Bought (Mostly)",
      "Slow & Furious",
      "Caution: Driver Singing",
      "0 To 60 Eventually",
    ],
  },
  {
    category: "Car Enthusiast",
    phrases: [
      "Garage Built, Road Tested",
      "Weekend Warrior",
      "Eat. Sleep. Drive. Repeat.",
      "Saved By The Redline",
      "More Torque, Less Talk",
      "Project Car, Permanent Hobby",
      "Manual For Life",
      "It's Not A Phase, It's A Lifestyle",
    ],
  },
  {
    category: "Family",
    phrases: [
      "The Family Roadtrip Machine",
      "Adventure Awaits This Family",
      "Kids On Board, Snacks Ready",
      "Making Memories Mile By Mile",
      "Home Is Wherever We Park",
      "Our Crew, Our Ride",
      "Soccer Practice Survivor",
    ],
  },
  {
    category: "Faith",
    phrases: [
      "Blessed On Every Mile",
      "Faith Over Fear",
      "Grateful & Going",
      "Guided By Grace",
      "Pray. Drive. Repeat.",
      "Counting My Blessings",
      "Driven By Faith",
    ],
  },
  {
    category: "Veteran & Service",
    phrases: [
      "Veteran Owned & Operated",
      "Served With Honor",
      "Once A Soldier, Always Proud",
      "Freedom Isn't Free",
      "Thank A Vet Today",
      "Old Soldiers Still Roll",
      "Earned, Not Given",
      "Home Of The Free Because Of The Brave",
      "Still Serving In My Own Way",
    ],
  },
];

const TOTAL = SAYINGS.reduce((n, c) => n + c.phrases.length, 0);

const TILES = [
  { src: "/tiles/july4/usa.png", alt: "\"USA\" tile to pair with a patriotic license plate frame saying" },
  { src: "/tiles/july4/american-flag.png", alt: "American flag tile for a custom license plate frame phrase" },
];

const PAGE_FAQ = [
  {
    question: "What are some good license plate frame sayings?",
    answer:
      "Good license plate frame sayings are short, readable at a glance, and personal - think \"Veteran Owned & Operated,\" \"Garage Built, Road Tested,\" \"Blessed On Every Mile,\" or \"America At 250.\" The list above has 50 ideas across patriotic, funny, car, family, faith, and veteran themes that all fit a frame's bottom bar.",
  },
  {
    question: "How long can a license plate frame saying be?",
    answer:
      "Keep it short enough to read from a car length away - a few words works best on the bottom bar. In the Festive Frames builder you type your phrase and see it on the frame before you order, so you can trim it until it fits and looks right.",
  },
  {
    question: "Can I make my own custom license plate frame with a saying?",
    answer:
      "Yes. Pick any phrase from this list or write your own, snap on patriotic tiles like the flag and an eagle, and order. It's $39, made to order by hand in St. Louis, ships fast, and is backed by a 30-day guarantee.",
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
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog/license-plate-frame-sayings` },
      { "@type": "ListItem", position: 3, name: "License Plate Frame Sayings", item: PAGE_URL },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [faqPage, breadcrumbList],
  };
}

export default async function LicensePlateFrameSayingsPage() {
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
            <span className="text-[#6a6354]">Blog</span>
            <span aria-hidden> › </span>
            <span className="text-[#1e1b17]">License Plate Frame Sayings</span>
          </nav>

          <div className="mb-3 text-[15px] font-extrabold tracking-[1.5px] text-[#ed5aa0]">
            {TOTAL} IDEAS · BUILD YOUR OWN
          </div>
          <h1 className="m-0 text-[clamp(34px,6vw,56px)] font-bold leading-[1.02] tracking-[-1px]">
            50 License Plate Frame Sayings (Build Your Own)
          </h1>
          <p className="mx-auto mt-5 max-w-[680px] text-[18px] font-semibold leading-[1.55] text-[#3a352c]">
            Stuck on what to put on the bottom bar? Here are {TOTAL} license plate frame
            sayings worth stealing - patriotic, funny, car-enthusiast, family, faith, and
            veteran. Find one you love, then make it yours in the builder for $39.
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
              Put your phrase on a frame
              <span aria-hidden className="text-xl leading-none">→</span>
            </Link>
          </div>
        </section>

        {/* Intro */}
        <section className="mx-auto max-w-[820px] px-5 pb-2 pt-8 sm:px-7">
          <div className="flex flex-col gap-5 text-[17px] font-medium leading-[1.6] text-[#3a352c]">
            <p>
              The bottom bar of a license plate frame is tiny real estate, which is exactly
              why the right saying matters. The best license plate frame sayings are short,
              easy to read from a car length back, and say something true about the driver -
              their country, their humor, their build, their family, or their faith. Below
              are {TOTAL} ideas grouped by theme so you can scan straight to your vibe.
            </p>
            <p>
              Use them as-is, mix two together, or let them spark your own. When you find
              the one, the Festive Frames builder lets you type it onto the frame, snap on
              patriotic tiles like the American flag and a landing eagle, and see the whole
              thing before you order.
            </p>
          </div>
        </section>

        {/* The list */}
        <section className="border-t-[3px] border-[#1e1b17] bg-[#fff9ec]" aria-labelledby="list-heading">
          <div className="mx-auto max-w-[860px] px-5 py-16 sm:px-7">
            <h2
              id="list-heading"
              className="m-0 text-[clamp(26px,4.5vw,38px)] font-bold leading-[1.05] tracking-[-0.5px]"
            >
              {TOTAL} license plate frame sayings, by theme
            </h2>

            <div className="mt-8 flex flex-col gap-9">
              {SAYINGS.map((group) => (
                <div key={group.category}>
                  <h3 className="m-0 mb-4 text-[20px] font-bold leading-none tracking-[-0.3px] text-[#1e1b17]">
                    {group.category}
                  </h3>
                  <ul className="flex flex-wrap gap-2.5 p-0">
                    {group.phrases.map((phrase) => (
                      <li
                        key={phrase}
                        className="list-none rounded-full border-[3px] border-[#1e1b17] bg-white px-4 py-2 text-[15px] font-bold text-[#1e1b17]"
                        style={{ boxShadow: `3px 3px 0 ${INK}` }}
                      >
                        {phrase}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-col items-center gap-6 rounded-[20px] border-[3px] border-[#1e1b17] bg-white px-6 py-10 text-center" style={{ boxShadow: `5px 5px 0 ${INK}` }}>
              <div className="flex gap-4">
                {TILES.map((tile) => (
                  <div
                    key={tile.src}
                    className="flex h-20 w-20 items-center justify-center rounded-[14px] border-[3px] border-[#1e1b17] bg-[#fff9ec] p-2"
                    style={{ boxShadow: `3px 3px 0 ${INK}` }}
                  >
                    <Image
                      src={tile.src}
                      alt={tile.alt}
                      width={120}
                      height={120}
                      sizes="80px"
                      className="h-full w-full object-contain"
                    />
                  </div>
                ))}
              </div>
              <h3 className="m-0 text-[clamp(24px,4vw,32px)] font-bold leading-[1.1] tracking-[-0.5px]">
                Make it yours in the builder
              </h3>
              <p className="m-0 max-w-[560px] text-[17px] font-medium leading-[1.55] text-[#3a352c]">
                Pick a saying above or write your own, snap on the flag, an eagle, and the
                &quot;250&quot; tile, and order your custom frame. $39, made to order by hand in
                St. Louis, ships fast, backed by a 30-day guarantee.
              </p>
              <Link
                href="/build"
                className="s-display s-press inline-flex items-center gap-2 rounded-full border-[3px] border-[#1e1b17] bg-[#ed5aa0] px-7 py-3.5 text-[18px] font-semibold text-[#fff9ec] no-underline"
                style={{
                  boxShadow: `4px 4px 0 ${INK}`,
                  ["--press-shadow-lift" as string]: `6px 6px 0 ${INK}`,
                  ["--press-shadow-press" as string]: `2px 2px 0 ${INK}`,
                }}
              >
                Build your frame
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
              License plate frame sayings, answered
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
