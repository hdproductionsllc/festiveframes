import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { copy } from "@/content/copy";
import { SITE_URL } from "@/config/season";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";

const INK = "#1e1b17";
const PAGE_PATH = "/veteran-license-plate-frame";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

// Targets "veteran license plate frame". Emotional military-family gifting angle;
// the custom bottom bar = branch / unit / name. Made-in-USA trust.
const META_TITLE = "Personalized Veteran License Plate Frames | $39";
const META_DESCRIPTION =
  "Honor a veteran with a personalized license plate frame: add their branch, unit or name on a custom bar with flags & eagles. $39, handmade in the USA, ships fast.";

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
    question: "Can I put a veteran's branch, unit, or name on the frame?",
    answer:
      "Yes. The bottom bar of a veteran license plate frame is yours to write - add a branch like \"U.S. Army,\" a unit, a name, years of service, or a short tribute. You type the exact words in the builder before you order.",
  },
  {
    question: "Is a veteran license plate frame a good military gift?",
    answer:
      "It's one of the most personal car gifts you can give a veteran or a military family. At $39 it's giftable, it's made in the USA, and the custom phrase makes it about their service specifically - not a generic sticker.",
  },
  {
    question: "Where is the veteran license plate frame made?",
    answer:
      "Every frame is made to order by hand in the USA, in St. Louis, Missouri, then UV printed fresh and shipped fast. It's an American-made tribute, backed by a 30-day guarantee.",
  },
];

const TILES = [
  { src: "/tiles/july4/eagle.png", alt: "Bald eagle tile for a personalized veteran license plate frame" },
  { src: "/tiles/july4/american-flag.png", alt: "American flag tile for a veteran license plate frame" },
  { src: "/tiles/july4/star-blue.png", alt: "Blue star tile for a military veteran license plate frame" },
  { src: "/tiles/july4/usa.png", alt: "\"USA\" tile for a personalized veteran license plate frame" },
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
      { "@type": "ListItem", position: 2, name: "Veteran License Plate Frame", item: PAGE_URL },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [faqPage, breadcrumbList],
  };
}

export default async function VeteranPage() {
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
            <span className="text-[#1e1b17]">Veteran License Plate Frame</span>
          </nav>

          <div className="mb-3 text-[15px] font-extrabold tracking-[1.5px] text-[#ed5aa0]">
            THEIR BRANCH · THEIR NAME · THEIR SERVICE
          </div>
          <h1 className="m-0 text-[clamp(34px,6vw,56px)] font-bold leading-[1.02] tracking-[-1px]">
            Personalized Veteran License Plate Frames
          </h1>
          <p className="mx-auto mt-5 max-w-[680px] text-[18px] font-semibold leading-[1.55] text-[#3a352c]">
            Build a personalized veteran license plate frame around their service: snap on the
            flag and a landing eagle, then write their branch, unit, or name along the bottom
            bar. $39, made to order by hand in the USA, ships fast, backed by a 30-day guarantee.
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
              Design a veteran&apos;s frame
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
            Tiles to honor their service
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
              A veteran license plate frame that names their service
            </h2>
            <div className="mt-5 flex flex-col gap-5 text-[17px] font-medium leading-[1.6] text-[#3a352c]">
              <p>
                A veteran&apos;s service is personal, and the gift should be too. A personalized
                veteran license plate frame from Festive Frames is built around the one thing a
                generic decal can never capture: their own words. The bottom bar is yours to fill
                in - a branch, a unit, a rank, years of service, a name, or a short line of thanks
                - so the frame speaks to that specific person every time they pull into the driveway.
              </p>
              <p>
                Start in the online builder and snap on the tiles that carry the most meaning: the
                American flag, a landing bald eagle, blue and red stars, and the &quot;USA&quot;
                tile. Then type the bottom-bar phrase exactly how you want it - &quot;U.S. Army
                Veteran,&quot; &quot;Proud Marine,&quot; &quot;Vietnam Vet,&quot; or simply a
                last name and a date. Every tile snaps into the border by hand and never covers
                the plate numbers, the sticker, or the state name.
              </p>
              <p>
                For a military family, this is the rare gift that lands. A spouse can put a
                deployment year on it; a daughter can write &quot;Dad - 22 years of service&quot;;
                a son can mark a grandfather&apos;s branch and unit. It works for Veterans Day,
                Memorial Day, a homecoming, a retirement, or a birthday - any moment when
                &quot;thank you for your service&quot; deserves something they&apos;ll keep.
              </p>
              <p>
                Every veteran license plate frame is made to order, by hand, in the USA, in St.
                Louis, Missouri, then printed fresh and shipped fast. At $39 it&apos;s a giftable,
                American-made tribute under $40, and it&apos;s backed by a 30-day guarantee. Open
                the builder, write their service into the bottom bar, and give a veteran a frame
                that&apos;s truly about them.
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
                Design a veteran&apos;s frame
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
              Veteran frames, answered
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
