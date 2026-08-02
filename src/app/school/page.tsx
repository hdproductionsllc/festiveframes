import type { Metadata } from "next";
import Link from "next/link";
import { FindMySchool } from "@/components/school/FindMySchool";
import { allSchoolKits } from "@/data/school-kits";
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
    absolute: "Custom School Spirit & Graduation License Plate Frames | MySchoolFrame",
  },
  description:
    "The graduate plate takes two fields: their last name and their class year. A custom school license plate frame in your school's colors, with badges for their sport, band or club. Made in USA.",
  // The root layout sets siteName to the Festive Frames brand entity, which is
  // correct for festiveframes.co and wrong here: this page IS myschoolframe.com,
  // and every share of it carried the other brand's name under the card.
  openGraph: { siteName: "MySchoolFrame" },
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

/** Real print artwork from the badge library — the product sells itself.
 *  FILENAMES, not piece ids: the pieces kept their `hs:football-patch` ids so
 *  saved designs would resolve, but the enamel rebuild renamed the FILES to
 *  football.png and soccer.png. This list pointed at the old names and both
 *  images had been 404ing on the live marketing page since that commit, which
 *  `school-badges.test.ts` now makes impossible to repeat. */
const BADGES = [
  ["football", "Football"],
  ["band", "Band"],
  ["robotics", "Robotics"],
  ["cheer", "Cheer"],
  ["drama", "Drama"],
  ["medal", "Achievements"],
  ["soccer", "Soccer"],
  ["science", "Science"],
] as const;

const STEPS = [
  {
    n: "1",
    title: "Type their last name",
    body: "It comes up in varsity chenille on the bottom banner immediately. That's the frame, not a preview of a template.",
  },
  {
    n: "2",
    title: "Tap what they do",
    body: "Football, soccer, band, robotics, cheer, drama, honors — 30+ activities, or upload your own photo. The badges land in place.",
  },
  {
    n: "3",
    title: "Pick their class year",
    body: "CLASS OF 2027 sets in brass and you're looking at a finished frame. Change anything from there — colors pull from your school's own website, and you can undo anything.",
  },
];

// Anatomy of the frame, name-first: the school is the setting, the kid is the
// star. (Replaced the four "kinds of kid" vignettes — this sells recognition,
// not variety. Also fixed a real copy defect: the old Friday-night vignette
// promised a "helmet badge up top", which the 1-row text-only top panel cannot
// do.)
const ANATOMY = [
  {
    title: "The big bottom banner — their last name.",
    body: "Varsity chenille, jersey-style, across the widest panel on the frame. It's the first thing anyone reads in a parking lot, and it says MILLER, not \"Go Wildcats.\"",
  },
  {
    title: "The badges — what they actually did.",
    body: "Football, marching band, robotics, cheer, drama, honor society, student council. Pick one or load the whole lineup. Nobody fits on one badge.",
  },
  {
    title: "The details — their year, their number, their title.",
    body: "CLASS OF 2027. CAPTAIN. SENIOR. #12. One tap each.",
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
  // Durability. These are the claims Festive Frames already makes and stands
  // behind on the main site (see content/copy.ts) — carried over rather than
  // re-invented, so the two products cannot end up promising different things.
  // NOT carried over: "the tiles pop off in seconds". That is the modular
  // snap-in product; a school frame is printed as one piece.
  {
    q: "How long will it last outside?",
    a: "It's built for the weather your car already lives in — highway speeds, automatic car washes, and the full swing from icy winters to summer heat, sun and rain. The artwork is UV printed, so the colors stay bright rather than fading out over a season.",
  },
  {
    q: "Will it fade, rust or peel in a car wash?",
    a: "No. UV printing cures the ink into the surface instead of laying it on top, which is why it holds up to brushes, grit and sun. We've vetted these for everyday driving, and we stand behind every frame for 30 days — if something goes wrong, tell us and we'll make it right.",
  },
  {
    q: "What if I mess up the design?",
    a: "You can't. Undo, rearrange, or start over as many times as you like — nothing prints until you send us a finished design.",
  },
  {
    q: "Is my school on it?",
    a: "Every school is. The builder themes itself from your school's own website — no waiting for us to add you.",
  },
  {
    q: "What if our last name is long?",
    a: "You'll see it on the banner as you type — the frame in front of you is the frame we print. If it doesn't sit right, shorten it, switch to their first name, or drop to their number. Nothing prints until you send it.",
  },
  // The builder asks who the frame is for and rewords itself accordingly
  // (frame-buyers.ts). The page used to speak only to parents, which contradicted
  // it and quietly told four other buyers this was not for them.
  {
    q: "Can I get one for my grandchild?",
    a: "Yes, and it's one of the most common ones we make. Tell the builder it's for your grandchild and the banner says PROUD GRANDPARENT under their name and year, so it reads as your car rather than a second copy of their parents'.",
  },
  {
    q: "I graduated years ago. Can I get my own class year?",
    a: "Yes. Say you went there and the year picker goes back sixty years instead of forward four, so you can put your actual class on it.",
  },
  {
    q: "I teach there. Is this only for students?",
    a: "No. Say you work there and the class-year field disappears — you get your name, the school's colors and a badge for whatever you coach or teach.",
  },
  {
    q: "Can I put their first name instead? Or a nickname?",
    a: "Anything you type. Most parents use the last name because that's how it reads jersey-style from a distance — but it's your frame.",
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
    q: "Is there a minimum order for our school?",
    a: "No. Every frame is printed after it's ordered, so there's no minimum order quantity, no case pack and no pre-buy. If one parent orders one frame all season, that works. Your club never fronts money and never has stock left over.",
  },
  {
    q: "What does our booster club have to do?",
    a: "Approve the design and share a link. That's the whole job. We print, ship, and handle any problem with an order directly with the parent.",
  },
  {
    q: "Which activities have badges?",
    a: "Football, soccer, basketball, volleyball, baseball, softball, track, tennis, golf, cheer, band, marching band, drama, robotics, debate, chess, science, honor society, student council, yearbook and more — plus your own photos.",
  },
];

// Derived from the kits so adding a school needs no edit here. Demo kits are
// included: a demo page is exactly what a parent from that school should land on,
// and `noindex` on the kit page is what keeps it out of search.
const FIND_SCHOOLS = allSchoolKits().map((k) => ({
  slug: k.slug,
  schoolName: k.schoolName,
  shortName: k.shortName,
  mascot: k.mascot,
  city: k.city,
}));

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
        <p className="msf-eyebrow">Their name. Their sport. Their year.</p>
        <h1>
          Your school. <span>Your story.</span> Your frame.
        </h1>
        <p className="msf-sub">
          Create a personalized frame in your school&apos;s colors, featuring the
          teams, clubs, activities and accomplishments that make your story
          yours.
        </p>
        <p className="msf-name-moment">
          Type your last name. Watch it come up in varsity chenille across the
          bottom banner — jersey-style, in your school&apos;s colors.
        </p>
        {/* The first thing a parent arriving from a group chat can act on. They
            know one fact — the name of their school — and everything the page
            offered before this was a builder with no school in it. */}
        <FindMySchool schools={FIND_SCHOOLS} tone="dark" />

        <div className="msf-ctas">
          <Link href="/lab/school" className="msf-btn msf-btn-primary">
            See Your Name On It
          </Link>
          <a href="#fundraise" className="msf-btn msf-btn-ghost">
            Fundraise for your school →
          </a>
        </div>
        <p className="msf-trust">
          Free to design. Nothing prints until you send it. UV-printed and
          assembled in St.&nbsp;Louis, USA.
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
        <p className="msf-badge-caption">
          Football, soccer, band, robotics, cheer, drama, honors — 30+
          activities.
        </p>
      </section>

      {/* ── How it works ── */}
      {/* ── The graduate plate ──
          Leads, because the builder leads with it and because it is the case
          that actually converts: it has a deadline, it is a gift, and it sells
          several frames per student rather than one. Two fields is not a
          simplification of the pitch — it is literally what the page it links to
          asks for. */}
      <section className="msf-band msf-band-navy">
        <p className="msf-eyebrow">Class of 2027 · 2028 · 2029</p>
        <h2>The graduate plate takes two fields.</h2>
        <p className="msf-lede">
          Their last name and their class year. That is the whole thing — the
          frame builds itself in their school&apos;s colors, with the cap, the
          diploma and the laurel already on it. Change anything you like, or
          change nothing and send it.
        </p>
        <ul className="msf-booster">
          <li>
            <strong>For the graduate, and for everyone buying them one.</strong>{" "}
            Parents, grandparents, and the graduate&apos;s own car. Tell us who
            it&apos;s from and the banner says so.
          </li>
          <li>
            <strong>It outlasts the day.</strong> The poster curls and the
            blanket goes in a bin. A frame rides the back of the car through
            graduation, through college, through the first job.
          </li>
          <li>
            <strong>Order by the ceremony, not the week of it.</strong> Every
            frame is printed to order, so give us a little room before the date
            and tell us when it is.
          </li>
        </ul>
        <div className="msf-ctas">
          <Link href="/lab/school" className="msf-btn msf-btn-brass">
            Get the graduate plate
          </Link>
        </div>
      </section>

      <section className="msf-band">
        <h2>Three taps. Then it&apos;s theirs.</h2>
        <p className="msf-lede">
          A custom school license plate frame you design yourself — from any
          phone, in your high school&apos;s real colors. Nothing prints until
          you send it to us.
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

      {/* ── Anatomy: name-first ── */}
      <section className="msf-band msf-band-paper">
        <h2>Their name is the whole point.</h2>
        <p className="msf-lede">The school is the setting. The person on it is the star.</p>
        <div className="msf-vignettes">
          {ANATOMY.map((v) => (
            <article key={v.title}>
              <h3>{v.title}</h3>
              <p>{v.body}</p>
            </article>
          ))}
        </div>
        <p className="msf-lede">
          Two kids at the same school never have the same four years. The
          Friday-night kid and the 6 a.m. marimba kid and the
          four-quiet-4.0s kid all get a different frame — because it&apos;s
          built from their name out, not the school&apos;s logo down.
        </p>
        <p className="msf-tagline">A letterman jacket for the car.</p>
      </section>

      {/* ── Senior night ── */}
      <section className="msf-band">
        <h2>The senior night gift that doesn&apos;t end up in a shadow box</h2>
        <p className="msf-lede">
          Senior night gifts for football players, band seniors, cheerleaders,
          soccer players — the poster curls, the blanket goes in a bin, the
          framed photo goes in a closet. A frame with their name, their number
          and their year rides the back of the car through graduation, through
          college, through the first job. This one is out where you see it,
          every single time you park.
        </p>
        <p className="msf-tagline">This is the one they keep.</p>
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

      {/* ── Fundraising ──
          Leads with the RISK, not the reward. A booster club is not afraid of a
          bad product, it is afraid of a closet full of unsold sweatshirts — so
          print-on-demand and no minimum order is the whole pitch, and it used to
          be a sub-clause in the middle of a bullet. */}
      <section id="fundraise" className="msf-band msf-band-navy">
        <h2>No minimums. No inventory. Nothing to front.</h2>
        <p className="msf-lede">
          Every frame is printed one at a time, after a parent orders it. There
          is no minimum order quantity, no case pack, no pre-buy and no leftover
          stock — because nothing is made until somebody has already paid for it.
          Your club never touches a box.
        </p>
        <ul className="msf-booster">
          <li>
            <strong>Printed on demand, one frame at a time.</strong> No minimum
            order, no bulk buy, no size runs to guess at. Order one or order
            three hundred; it works the same either way, and there is nothing
            left over at the end of the season.
          </li>
          <li>
            <strong>Nothing to front and nothing to run.</strong> No order
            forms, no envelopes of cash, no sorting bags at practice. Parents
            order direct, we print and ship direct to their door.
          </li>
          <li>
            <strong>A set dollar amount per frame, not a percentage after
            costs.</strong>{" "}
            Fixed money back on every single frame, so the club can count what a
            season earned it instead of waiting for a settlement.
          </li>
          <li>
            <strong>You can see what you&apos;ve earned, any time.</strong> Your
            club gets its own page with a live running total: frames ordered,
            dollars raised, and the last 30 days. We email you the same figure
            at the start of every month, with the payout for the period.
          </li>
          <li>
            <strong>Your school controls its brand.</strong> Your official
            colors and crest, used with your school&apos;s written permission.
            You approve what carries your name before anything prints.
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
          Takes one conversation. No contract, no minimum, no upfront spend.
        </p>
      </section>

      {/* ── Close ── */}
      <section className="msf-band msf-close">
        <h2>Every student has a story. Frame yours.</h2>
        <p className="msf-lede">
          Senior year goes fast. The seasons end, the trophies go in a box,
          the driveway gets quiet. Their name on the back of the car
          doesn&apos;t.
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
