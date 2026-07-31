import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Graduate } from "next/font/google";
import "./school-landing.css";

// The wordmark face. Graduate is the collegiate slab the school builder itself
// leads with (and what most schools' own marks map to), so the company brand
// speaks the product's language. Its lowercase renders as small caps, which is
// what makes the CamelCase "MySchoolFrame" read as three words.
const graduate = Graduate({ weight: "400", subsets: ["latin"] });

// ─── MySchoolFrame landing page ───────────────────────────────────────────────
//
// The school product's front door: myschoolframe.com rewrites here (next.config),
// and it also lives at /school on the main site. Copy was drafted by two
// specialist passes — a parent-emotional angle and a conversion angle — and
// synthesized; the four locked lines (headline, supporting, fundraising, brand)
// are the owner's, verbatim.
//
// Every claim on this page is checked against what the product actually does:
// the builder DOES pull colors/crest from a school URL, nothing DOES print
// without the design being submitted and reviewed, and the badges shown below
// are the real print artwork — not renders made for marketing. One claim was cut
// from the drafts on those grounds ("tracked and paid out": no tracking exists).

export const metadata: Metadata = {
  // absolute: opt out of the root layout's "| Festive Frames" title template —
  // on myschoolframe.com this page IS the brand. Title targets the two most
  // winnable buying queries from the July 2026 SERP research ("custom school
  // license plate frame", "school spirit license plate frame") — both SERPs are
  // Etsy aggregation pages and dated vendors, with no dedicated brand.
  title: {
    absolute: "Custom School Spirit License Plate Frames | MySchoolFrame",
  },
  description:
    "Design a custom license plate frame in your high school's colors — badges for football, band, robotics, and 30+ activities. Printed in St. Louis, USA. Every frame sends a donation to your school's booster club.",
};

// Structured data. Product+Offer earns merchant snippets with zero reviews;
// NO aggregateRating until real customer reviews render on-page (Google issues
// manual actions for invisible ratings), and no FAQPage — FAQ rich results were
// fully deprecated May 2026; the Q&A below stays for readers and AI answers.
// Price mirrors the live builder's buy button (schema price must match what
// the product page displays).
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.myschoolframe.com/#org",
      name: "MySchoolFrame",
      url: "https://www.myschoolframe.com",
      logo: "https://www.myschoolframe.com/brand/msf-mark.png",
      parentOrganization: { "@type": "Organization", name: "Festive Frames" },
    },
    {
      "@type": "WebSite",
      name: "MySchoolFrame",
      url: "https://www.myschoolframe.com",
    },
    {
      "@type": "Product",
      name: "Custom School Spirit License Plate Frame",
      description:
        "A personalized license plate frame in your school's colors with badge tiles for your student's sports, band, clubs, and achievements. Designed by you in an online builder, UV-printed and assembled in St. Louis, USA. A set donation from every frame goes to the school's booster club.",
      image: "https://www.myschoolframe.com/school/opengraph-image",
      brand: { "@type": "Brand", name: "MySchoolFrame" },
      // No Offer/price until pricing is owner-confirmed — ordering is
      // design-and-send, and we follow up with ordering info.
    },
  ],
};

/** Real print artwork from the badge library — the product sells itself. */
const BADGES = [
  ["football-patch", "Football"],
  ["band", "Band"],
  ["robotics", "Robotics"],
  ["cheer", "Cheer"],
  ["drama", "Drama"],
  ["medal", "Achievements"],
  ["soccer-patch", "Soccer"],
  ["science", "Science"],
] as const;

const STEPS = [
  {
    n: "1",
    title: "Paste your school's website",
    body: "The builder pulls your school's colors and crest straight from its own site, so your frame starts out looking like your school — not a blank template.",
  },
  {
    n: "2",
    title: "Add what your student actually does",
    body: "Drag in badges for sports, band, drama, robotics, honors — or upload your own photos. Set the banners: HOME OF THE WILDCATS, your school's name, their class year.",
  },
  {
    n: "3",
    title: "We print it and ship it",
    body: "Chenille lettering, brass rims, bevelled badges — UV-printed in St. Louis at automotive quality and mailed ready to mount.",
  },
];

const VIGNETTES = [
  {
    title: "The Friday night kid.",
    body: "Helmet badge up top, jersey number below, HOME OF THE WILDCATS in varsity chenille across the banner. You'll spot it from the bleachers.",
  },
  {
    title: "The band kid.",
    body: "Marimba at 6 a.m., bus at dawn, state finals in November. A band badge, a gold laurel, and the year it all happened.",
  },
  {
    title: "The honor-roll kid.",
    body: "Four years of quiet 4.0s that never got a stadium. An honor-society badge, a medal, a star, and CLASS OF 2027 in brass.",
  },
  {
    title: "The kid who does everything.",
    body: "Soccer, robotics, debate, drama, DECA. Load the whole lineup on. That's the point — nobody fits on one badge.",
  },
];

const ANSWERS = [
  {
    q: "Will it look cheap?",
    a: "It's built to letterman-jacket standards — chenille lettering, brass rims, bevelled badges — then UV-printed to live outdoors on a car.",
  },
  {
    q: "Will it fit my car?",
    a: "It's a standard US license-plate frame. It mounts with the hardware already on your car.",
  },
  {
    q: "What if I mess up the design?",
    a: "You can't. Undo, rearrange, or start over as many times as you like — nothing prints until you send us a finished design.",
  },
  {
    q: "Is my school on it?",
    a: "Every school is. Paste your school's website and the builder themes itself in your colors — no waiting for us to add you.",
  },
  {
    q: "Are license plate frames legal in my state?",
    a: "Frames are legal everywhere; what states regulate is covering the plate's numbers, stickers, or state name. The builder shows you exactly what your frame covers before anything prints, so you can keep your state's markings clear.",
  },
  {
    q: "How much does the school actually get?",
    a: "A set dollar amount from every frame — not a percentage of profit after costs. Your booster club sees exactly what a season of frames earned it.",
  },
  {
    q: "Which activities have badges?",
    a: "Football, soccer, basketball, volleyball, baseball, softball, track, tennis, golf, cheer, band, marching band, drama, robotics, debate, chess, science, honor society, student council, yearbook and more — plus your own photos.",
  },
];

export default function MySchoolFramePage() {
  return (
    <main className="msf">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
      {/* ── Hero ── */}
      <section className="msf-hero">
        <p className="msf-brand">
          {/* The mark: a plate frame in profile — thin rails, the product's
              signature thick bottom banner, brass bar where the school name
              goes. Body inherits currentColor so the same SVG works on any
              ground; only the brass is fixed. Same geometry as icon.svg. */}
          <svg className="msf-brand-mark" viewBox="0 0 64 64" aria-hidden="true">
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M10 13 h44 a7 7 0 0 1 7 7 v24 a7 7 0 0 1 -7 7 h-44 a7 7 0 0 1 -7 -7 v-24 a7 7 0 0 1 7 -7 Z
                 M11 18 a3 3 0 0 0 -3 3 v14 a3 3 0 0 0 3 3 h42 a3 3 0 0 0 3 -3 v-14 a3 3 0 0 0 -3 -3 Z
                 M24.5 42 h15 a2.5 2.5 0 0 1 0 5 h-15 a2.5 2.5 0 0 1 0 -5 Z"
            />
          </svg>
          <span className={graduate.className}>MySchoolFrame</span>
        </p>
        <h1>
          Your school. <span>Your story.</span> Your frame.
        </h1>
        <p className="msf-sub">
          Create a personalized frame in your school&apos;s colors, featuring the
          teams, clubs, activities and accomplishments that make your story
          yours.
        </p>
        <div className="msf-ctas">
          <Link href="/lab/school" className="msf-btn msf-btn-primary">
            Build Your Frame
          </Link>
          <a href="#fundraise" className="msf-btn msf-btn-ghost">
            Fundraise for your school →
          </a>
        </div>
        <p className="msf-trust">
          Designed by you. UV-printed at automotive quality in St.&nbsp;Louis.
        </p>

        {/* Real badge artwork on school-navy tiles — the actual print files. */}
        <div className="msf-badges">
          {BADGES.map(([slug, alt]) => (
            <span key={slug} className="msf-badge">
              <Image
                src={`/tiles/high-school/${slug}.png`}
                alt={`${alt} badge tile for a custom school license plate frame`}
                width={96}
                height={96}
              />
            </span>
          ))}
        </div>
        <p className="msf-tagline">A letterman jacket for the car.</p>
      </section>

      {/* ── How it works ── */}
      <section className="msf-band">
        <h2>Three steps. About five minutes.</h2>
        <p className="msf-lede">
          A custom school license plate frame you design yourself — from any
          phone, in your high school&apos;s real colors.
        </p>
        <div className="msf-steps">
          {STEPS.map((s) => (
            <article key={s.n}>
              <span className="msf-step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Make it yours ── */}
      <section className="msf-band msf-band-paper">
        <h2>Two kids at the same school never have the same four years.</h2>
        <p className="msf-lede">Your frame shouldn&apos;t look like anyone else&apos;s either.</p>
        <div className="msf-vignettes">
          {VIGNETTES.map((v) => (
            <article key={v.title}>
              <h3>{v.title}</h3>
              <p>{v.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Senior night ── */}
      <section className="msf-band">
        <h2>The senior night gift that stays out of the box</h2>
        <p className="msf-lede">
          Senior night gifts for football players, band seniors, cheerleaders,
          soccer players — most end up on a shelf by January. A frame in their
          school&apos;s colors, with their activities and their year, rides the
          back of the car through college and gets kept. Their name, their
          number, their four years — not another blanket with a stock logo.
        </p>
      </section>

      {/* ── Straight answers ── */}
      <section className="msf-band msf-band-paper">
        <h2>Straight answers</h2>
        <dl className="msf-qa">
          {ANSWERS.map((x) => (
            <div key={x.q}>
              <dt>{x.q}</dt>
              <dd>{x.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Fundraising ── */}
      <section id="fundraise" className="msf-band msf-band-navy">
        <h2>Build yours. Give back to your school.</h2>
        <p className="msf-lede">
          Every frame designed for your school sends a set donation back to your
          booster club. Parents were going to buy team gear anyway — this turns
          that into funding, with nothing for the club to run.
        </p>
        <ul className="msf-booster">
          <li>
            <strong>A set donation on every frame.</strong> A fixed per-frame
            amount back to the club — no percentage math, no minimums to hit.
          </li>
          <li>
            <strong>Zero inventory, zero cost, zero risk.</strong> No order
            forms, no sorting at practice, no minimums to hit, nothing to front.
            Parents order direct; we print and ship direct — it runs itself.
          </li>
          <li>
            <strong>Your school controls its brand.</strong> Your official
            colors and crest, used with your school&apos;s permission — you
            approve what carries your name.
          </li>
        </ul>
        <div className="msf-ctas">
          <a
            className="msf-btn msf-btn-brass"
            href="mailto:hello@festiveframes.co?subject=School%20fundraiser%20%E2%80%94%20MySchoolFrame"
          >
            Start a Fundraiser
          </a>
        </div>
        <p className="msf-trust msf-trust-light">
          Takes one conversation. No contract, no upfront spend.
        </p>
      </section>

      {/* ── Close ── */}
      <section className="msf-band msf-close">
        <h2>Every student has a story. Frame yours.</h2>
        <p className="msf-lede">
          Senior year goes fast. The seasons end, the trophies go in a box, and
          the driveway gets quiet. This one stays right where you&apos;ll see it
          — every single time you park.
        </p>
        <div className="msf-ctas">
          <Link href="/lab/school" className="msf-btn msf-btn-primary">
            Build Your Frame
          </Link>
        </div>
        <p className="msf-trust">
          Free to design. Nothing prints until you approve it.
        </p>
        <p className="msf-fineprint">
          MySchoolFrame is a Festive Frames product, made in St.&nbsp;Louis ·{" "}
          <a href="mailto:hello@festiveframes.co">hello@festiveframes.co</a>
        </p>
      </section>
    </main>
  );
}
