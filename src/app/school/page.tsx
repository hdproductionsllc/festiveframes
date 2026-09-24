import type { Metadata } from "next";
import { FindMySchool } from "@/components/school/FindMySchool";
import { finderSchools, pilotSchoolKits, SCHOOL_FINDER_SCOPE } from "@/data/school-pilot";
import { ACTIVITY_COUNT_LABEL } from "@/content/school-activity-count";
import { SITE_URL } from "@/config/season";
import { SCHOOL_SHIPPING_VARIANT, schoolVariant } from "@/data/school-variants";
import { getRenderHeightInches, getTotalWidthInches } from "@/lib/constants/frame";
import { badgeSpots } from "@/lib/utils/snappet";
import { SCHOOL_CONTACT_EMAIL } from "@/content/school-contact";
import { SCHOOL_CHECKOUT_OPEN } from "@/config/school-checkout";
import { MSF_PRIVACY_PATH, MSF_TERMS_PATH, MSF_WARRANTY_PATH, NOTHING_PRINTS_UNTIL_YES } from "@/content/msf-pages";
import Image from "next/image";
import "./school-landing.css";

// ─── MySchoolFrame landing page ───────────────────────────────────────────────
//
// The school product's front door: myschoolframe.com rewrites here (next.config),
// and it also lives at /school on the main site. Copy was drafted by two
// specialist passes — a parent-emotional angle and a conversion angle — and
// synthesized. The v2 edit (owner-approved, 2026-09-24) made "A letterman jacket
// for the car." the headline, replacing "Your school. Your story. Your frame.",
// and says the customization ONCE (the "all on one frame" section). Keep it that
// way: the page sells the finished frame, and the mechanics only support it.
// "Nothing prints until you've seen it and said yes" appears twice at most (hero
// and how-it-works). Before/after: MySchoolFrame Pilot Kit/landing-copy-v2.md.
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
  // 57 chars: "& Graduation" was dropped to clear the ~60-char SERP truncation
  // (the old one was 69 and lost the brand); the graduate plate keeps its own
  // section and its own H2 on the page.
  title: {
    absolute: "Custom School Spirit License Plate Frames | MySchoolFrame",
  },
  // 143 chars. The old 189-char version led with the graduate-plate sentence and
  // was cut off before it said what the product is.
  description:
    "A custom school license plate frame in your school's colors, with badges for their sport, band or club. Free to design, made in St. Louis, USA.",
  // Canonical is the ROOT, not /school: next.config rewrites "/" on the
  // myschoolframe hosts to this page, so the root is the URL that serves this
  // content and the one we want indexed. SITE_URL is also the root layout's
  // metadataBase, so the two agree.
  alternates: { canonical: SITE_URL },
  // The root layout sets siteName to the holiday storefront's brand entity, which
  // is right for that product and wrong here: this page IS myschoolframe.com,
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
      logo: "https://www.myschoolframe.com/brand/msf-logo.png",
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
        "A personalized license plate frame in your school's colors with badge tiles for your student's sports, band, clubs, and achievements. Designed by you in an online builder, UV-printed and assembled in St. Louis, USA. A set donation from every frame goes back to the school.",
      image: "https://www.myschoolframe.com/school/opengraph-image",
      brand: { "@type": "Brand", name: "MySchoolFrame" },
      // No Offer/price on purpose. The price is owner-confirmed ($24.95, see
      // config/offers.ts) but checkout stays parked until one end-to-end test
      // payment has run, and school surfaces show no figure until it opens —
      // schema price must match what the page displays. Ordering is
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
  ["orchestra", "Orchestra"],
  ["science", "Science"],
  ["drama", "Theater"],
  ["marching-band", "Marching band"],
  ["yearbook", "Yearbook"],
  ["soccer", "Soccer"],
  ["robotics", "Robotics"],
  ["football", "Football"],
] as const;

// The frame every /s/<slug> builder ships, and what the page reads off it — its
// size, how far it reaches over the plate, and how many square badges it seats —
// so the copy cannot promise a frame we don't make.
const SHIP_CONFIG = schoolVariant(SCHOOL_SHIPPING_VARIANT).config;
const FRAME_SIZE = `${getTotalWidthInches(SHIP_CONFIG)} x ${getRenderHeightInches(SHIP_CONFIG)} inches`;
const TOP_COVER = `${SHIP_CONFIG.plateTopCoverInches ?? 0} inch`;
const BADGE_COUNT = badgeSpots(SHIP_CONFIG, { slots: {}, sections: {}, textBars: [] }).length;
const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const BADGE_COUNT_WORD = COUNT_WORDS[BADGE_COUNT] ?? String(BADGE_COUNT);

// Class year, number and activity lead; a name is optional. Pilot feedback
// (2026-09-23): a frame led by a student's full name is the one a parent hesitates
// over, and "Class of 2027 · #12 · Orchestra" says as much about the kid without
// putting their name on a car.
//
// Every promise here is read off the builder as it is (2026-09-24): the badge
// count is the shipping frame's own square badge positions, the one-tap lines
// are BANNER_LINES (data/frame-buyers.ts), and an uploaded photo is cropped
// square like every badge.
//
// ANATOMY is the ONE place the page explains what goes on the frame. It is
// written as the finished object, not as builder steps; STEPS below only says
// how you get there. The banner used to be pitched as "their last name"; it now
// defaults to the mascot and a name is the family's choice, not the pitch.
const ANATOMY = [
  {
    title: "The badges: what they did",
    body: `Friday-night football, early-morning band, orchestra, robotics, yearbook. There's room for ${BADGE_COUNT_WORD} square badges, chosen from ${ACTIVITY_COUNT_LABEL} activities, or from a favorite photo of your own, cropped square to match.`,
  },
  {
    title: "The line: their year, their number",
    body: "CLASS OF 2027, #12, SENIOR, PROUD PARENT, PROUD GRANDPARENT, ALUMNI or FACULTY & STAFF, each one tap away.",
  },
  {
    title: "The banners: their school and its mascot",
    body: "The school's name runs across the top and the mascot across the bottom, in chenille-style lettering. A name there is optional, and entirely up to you.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Find your school",
    body: "Their frame opens already in your school's colors, on your phone or computer.",
  },
  {
    n: "2",
    title: "Make it theirs",
    body: "Tap in the things they did and the line they'd want. What you see is the frame we print, not a template.",
  },
  {
    n: "3",
    title: "Send it when it's right",
    body: `Change or undo anything, as often as you like. ${NOTHING_PRINTS_UNTIL_YES}`,
  },
];

// "Is my school on it?" names the pilot schools from the same list the finder
// offers, so the answer cannot drift from what the finder actually shows.
const PILOT_NAMES = (() => {
  const names = pilotSchoolKits().map((k) => k.shortName);
  return `${names.length === 6 ? "six" : names.length} St. Louis-area schools: ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
})();

const ANSWERS = [
  {
    q: "Will it look cheap?",
    a: "We print it to look like a letterman jacket, with chenille-style lettering, brass-look rims and bevelled badges, and it's UV-printed so it holds up outdoors on a car.",
  },
  // Size, not "standard". The shipping frame is bigger than a dealer frame and
  // has been shown NOT to fit at least one tight recess (the Honda Pilot, taped
  // 2026-09-02). How it mounts is still being settled on the part, so this makes
  // no hardware promise until it is.
  {
    q: "Will it fit my car?",
    a: `It fits a standard 12 x 6 inch US plate. It is bigger than a dealer frame, though, at ${FRAME_SIZE}, so if your plate sits in a tight recess it's worth measuring the space around it first.`,
  },
  // Durability. The school frame is a different part from the holiday
  // snap-tile kit and has not itself been through a winter, so this claims the
  // PROCESS (the same UV print) and lets the warranty carry the promise, rather
  // than "we've vetted these", which nobody has yet for this part.
  {
    q: "How long will it last outside?",
    a: "The artwork is UV printed: the ink is cured hard by UV light the moment it's printed, so it stands up to sun, rain and road grit rather than fading out over a season. It's the same print process as the snap-on frame kits we've made before, which we've tested through car washes and at highway speeds.",
  },
  {
    q: "Will it fade, rust or peel in a car wash?",
    a: (
      <>
        It shouldn&apos;t, and if it does, it&apos;s covered: every frame
        carries a <a href={MSF_WARRANTY_PATH}>one-year warranty</a>.
        If something goes wrong in that year, tell us and we&apos;ll make it
        right.
      </>
    ),
  },
  {
    q: "What if I change my mind while I'm designing?",
    a: "That's no problem at all. You can undo, rearrange or start over as many times as you like.",
  },
  {
    q: "Is my school on it?",
    a: `We're starting with ${PILOT_NAMES}. If you don't see yours, type it into the school finder and let us know which school. Requests help us decide which schools come next.`,
  },
  {
    q: "What if what I type is long?",
    a: `You'll see it on the banner as you type, and the frame in front of you is the frame we print. If it doesn't sit quite right, you can shorten it or use their number or SENIOR instead.`,
  },
  // The builder asks who the frame is for and rewords itself accordingly
  // (frame-buyers.ts). The page used to speak only to parents, which contradicted
  // it and quietly told four other buyers this was not for them.
  {
    q: "Can I get one for my grandchild?",
    a: "Yes. When you tell the builder it's for your grandchild, the banner says PROUD GRANDPARENT with their class year, so it reads as your car rather than a second copy of their parents'. If you'd rather it said PROUD GRANDMA or PROUD GRANDPA, you can type your own words instead.",
  },
  {
    q: "I graduated years ago. Can I get my own class year?",
    a: "Yes. If you tell the builder you went there, the year picker goes back sixty years instead of forward four, so you can put your own class year on it.",
  },
  {
    q: "I teach there. Is this only for students?",
    a: "Not at all. If you tell the builder you work there, the class-year field steps aside and you get the school's colors, a badge for whatever you coach or teach, and your own words on the banner if you'd like some.",
  },
  {
    q: "Do I need to put a name on it?",
    a: "No. If you leave it off, the school's mascot stays on the banner. If you'd like something there, it can be their number, a nickname or a line of your own, whatever feels right to you.",
  },
  {
    q: "Are license plate frames legal in my state?",
    a: `It depends on the state and on what a frame covers: states regulate hiding the plate's numbers, registration stickers or state name. This frame's top edge sits over the top ${TOP_COVER} of the plate, where many plates carry the state name, and some states restrict covering it, so it's worth checking your state's rule before you order.`,
  },
  {
    q: "How much does the school actually get?",
    a: "A set dollar amount from every frame, rather than a percentage of profit after costs, so your booster club can see exactly what a season of frames earned.",
  },
  {
    q: "Is there a minimum order for our school?",
    a: "No. Every frame is printed after it's ordered, so there's no minimum and nothing to buy ahead. If one parent orders one frame all season, that works just fine.",
  },
  {
    q: "What does our booster club have to do?",
    a: "Just approve the design and share the link with your families. We take care of the printing and shipping, and if anything goes wrong with an order, we sort it out directly with the parent.",
  },
  {
    q: "Which activities have badges?",
    a: "Orchestra, marching band, choir, drama, science, robotics, debate, chess, yearbook, journalism, student government, honor roll, soccer, football, volleyball, track and more. You can also upload your own photos, which are cropped square to match the badges.",
  },
];

// The pilot six (data/school-pilot.ts), or every authored kit once the national
// search reopens. Demo kits are included: a demo page is exactly what a parent
// from that school should land on, and `noindex` keeps it out of search.
const FIND_SCHOOLS = finderSchools();
const FIND_NATIONAL = SCHOOL_FINDER_SCOPE === "national";

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
          {/* The owner's logo, REVERSED for this dark hero (navy ink -> paper,
              brass kept): the navy original vanishes on navy. Every msf-logo*
              file is built from the owner's two source PNGs (MySchoolFrame
              Pilot Kit/brand-source, with the build script). */}
          <Image
            src="/brand/msf-logo-reverse.png"
            alt="MySchoolFrame"
            width={800}
            height={410}
            priority
            sizes="(max-width: 480px) 62vw, 280px"
            style={{ width: "min(280px, 62vw)", height: "auto" }}
          />
        </p>
        {/* Each separator is bound to the item AFTER it, so a wrapped line never
            ends on a dangling dot; "Proud Parent" never splits. */}
        <p className="msf-eyebrow">Class of 2027 ·&nbsp;#12 ·&nbsp;Orchestra ·&nbsp;Proud&nbsp;Parent</p>
        {/* The v2 headline (owner-approved 2026-09-24). It used to be the tagline
            at the foot of the anatomy section; it says what the object IS, which
            the old "Your school. Your story. Your frame." never did. */}
        <h1>
          A letterman jacket <span>for the car.</span>
        </h1>
        <p className="msf-sub">
          Their school. Their class year. The things they actually did there.
        </p>
        <p className="msf-name-moment">
          Choose their activities, number, year and school colors, then see the
          frame come together before you order.
        </p>
        {/* The first thing a parent arriving from a group chat can act on. They
            know one fact — the name of their school — and everything the page
            offered before this was a builder with no school in it. */}
        {/* The anchor every CTA on this page points at. Once the roster is
            national the finder IS the front door — a button that jumps past it
            into a blank builder skips the one step that makes the frame theirs. */}
        <div id="find-my-school">
          <FindMySchool schools={FIND_SCHOOLS} tone="dark" national={FIND_NATIONAL} />
        </div>

        {/* No "Find your school" button here: the finder is directly above,
            so the button only scrolled to what the parent was already looking
            at. The arrow is held to its last word so it never wraps alone. */}
        <div className="msf-ctas">
          <a href="#fundraise" className="msf-btn msf-btn-ghost">
            Raising money for your <span style={{ whiteSpace: "nowrap" }}>school? →</span>
          </a>
        </div>
        <p className="msf-trust">
          Free to design. {NOTHING_PRINTS_UNTIL_YES} UV-printed and
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
          Orchestra, science, theater, band, yearbook, soccer —{" "}
          {ACTIVITY_COUNT_LABEL} activities.
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
        {/* OWNER-APPROVED COPY (2026-09-23), ADAPTED in exactly two places for
            the minor-name rule (a name is optional and never the pitch):
              1. lede: "Start with their last name and class year" → "Start with
                 their school and class year"
              2. bullet 1: "Their name." dropped from "Their school. Their year.
                 Their name. The things they spent four years doing."
            Everything else is the owner's wording, verbatim. Change nothing here
            without the owner. */}
        <p className="msf-eyebrow">Class of 2027 · 2028 · 2029</p>
        <h2>Made for their graduation year.</h2>
        <p className="msf-lede">
          Start with their school and class year, and their graduation frame is
          already taking shape in their school colors.
        </p>
        <p className="msf-lede">
          From there, you can keep it simple or make it completely theirs — add
          the activities they were part of, their number, a favorite photo, or a
          message from Mom, Dad, Grandma or Grandpa.
        </p>
        <ul className="msf-booster">
          <li>
            <strong>A graduation gift that feels personal.</strong> Their
            school. Their year. The things they spent four years doing. It
            becomes something that could only belong to them.
          </li>
          <li>
            <strong>And one they&apos;ll actually use.</strong> Instead of
            disappearing after graduation weekend, it goes with them — on their
            car through senior year, college, and whatever comes next.
          </li>
          <li>
            <strong>Made one at a time for each graduate.</strong> Every frame
            is printed to order, so if you&apos;re giving one for graduation,
            ordering a little ahead of the ceremony gives us time to make it
            right.
          </li>
        </ul>
        <div className="msf-ctas">
          <a href="#find-my-school" className="msf-btn msf-btn-brass">
            Find your school and make theirs →
          </a>
        </div>
      </section>

      {/* ── Anatomy: the finished frame, and the ONE place the page says what
          goes on it ── */}
      <section className="msf-band msf-band-paper">
        <h2>Their four years, all on one frame</h2>
        <p className="msf-lede">
          Build it around the things that made high school theirs.
        </p>
        <div className="msf-vignettes">
          {ANATOMY.map((v) => (
            <article key={v.title}>
              <h3>{v.title}</h3>
              <p>{v.body}</p>
            </article>
          ))}
        </div>
        <p className="msf-lede">
          No two students spend their four years quite the same way, so no two
          frames come out the same either. It&apos;s built from what they did,
          not just from the school&apos;s logo.
        </p>
      </section>

      {/* ── How it works: three short steps, no mechanics the section above
          already told ── */}
      <section className="msf-band">
        <h2>Here&apos;s how it works</h2>
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

      {/* ── Senior night ── */}
      <section className="msf-band msf-band-paper">
        <h2>A senior night gift they can take with them</h2>
        <p className="msf-lede">
          If you&apos;re putting together something for senior night, for a
          football player, a band senior, a cheerleader or a soccer player, a
          frame with their number, their activity and their class year is a
          gift they&apos;ll keep using long after the night itself.
        </p>
      </section>

      {/* ── Questions ── */}
      <section className="msf-band">
        <h2>Questions families ask us</h2>
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
          A deliberate change of audience: everything above speaks to a parent,
          this speaks to the PTO or booster club. The eyebrow says so, and the
          section leads with the three facts that sell it — parents order
          directly, the school buys no inventory, the club earns a fixed amount
          per frame. No figure: school surfaces carry no price until checkout
          opens (no-school-pricing.test.ts). */}
      <section id="fundraise" className="msf-band msf-band-navy">
        <p className="msf-eyebrow">For PTOs and booster clubs</p>
        <h2>A fundraiser with nothing to buy and nothing to run</h2>
        <ul className="msf-booster">
          <li>
            <strong>Parents order directly.</strong> Families design their own
            frame and deal with us, and we print and ship it straight to their
            door.
          </li>
          <li>
            <strong>The school buys no inventory.</strong> Every frame is
            printed after it&apos;s ordered, so there&apos;s no minimum, nothing
            up front and nothing left over.
          </li>
          <li>
            <strong>Your club earns a fixed amount on every frame.</strong> A
            set dollar amount, not a percentage after costs, with the total sent
            to you in writing at each payout
            {SCHOOL_CHECKOUT_OPEN
              ? " and a club page that keeps a running total."
              : "."}
          </li>
          <li>
            <strong>Your school&apos;s marks stay yours.</strong> We only put
            your school&apos;s own logos and mascot art on frames with your
            written permission.
          </li>
        </ul>
        <p className="msf-lede">
          Interested? Tell us your school and booster club, and we&apos;ll show
          you how it would work.
        </p>
        <div className="msf-ctas">
          <a
            className="msf-btn msf-btn-brass"
            href={`mailto:${SCHOOL_CONTACT_EMAIL}?subject=School%20fundraiser%20%E2%80%94%20MySchoolFrame`}
          >
            Talk to us about a fundraiser
          </a>
        </div>
      </section>

      {/* ── Close ── */}
      <section className="msf-band msf-close">
        <h2>Start with their school</h2>
        <p className="msf-lede">
          It takes a few minutes to see their frame in your school&apos;s
          colors. Add the things they did, and if you like how it looks, send it
          to us and we&apos;ll take it from there.
        </p>
        <div className="msf-ctas">
          <a href="#find-my-school" className="msf-btn msf-btn-primary">
            {/* One line on a phone: the long form wrapped to two. */}
            Find your school<span className="msf-cta-more"> and start designing</span>
          </a>
        </div>
        <p className="msf-trust">
          Free to design, with a{" "}
          <a href={MSF_WARRANTY_PATH} className="msf-nowrap">one-year warranty</a> on every frame.
        </p>
        <p className="msf-fineprint">
          MySchoolFrame is made in St.&nbsp;Louis{" "}
          <span className="msf-nowrap">
            ·&nbsp;<a href={`mailto:${SCHOOL_CONTACT_EMAIL}`}>{SCHOOL_CONTACT_EMAIL}</a>
          </span>
        </p>
        <p className="msf-fineprint msf-fineprint-links">
          <a href={MSF_WARRANTY_PATH}>Warranty</a> ·{" "}
          <a href={MSF_TERMS_PATH}>Terms</a> ·{" "}
          <a href={MSF_PRIVACY_PATH}>Privacy</a>
        </p>
      </section>
    </main>
  );
}
