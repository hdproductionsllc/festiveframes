import Link from "next/link";
import Image from "next/image";
import { FindMySchool } from "@/components/school/FindMySchool";
import { allSchoolKits } from "@/data/school-kits";
import { schoolOffer } from "@/config/offers";

const INK = "#1e1b17";

// ─── Schools & booster clubs, on the Festive Frames homepage ─────────────────
//
// MySchoolFrame has its own front door at /school, but a large share of the
// people who need it arrive here first — a parent following a link from a team
// group chat, or an athletic director who was given the company name rather than
// the product name. Until now the homepage said nothing to either of them.
//
// It speaks to BOTH audiences deliberately, because they arrive through the same
// door and want opposite things. The parent wants to see their own school; the
// booster president wants to know what it costs the club (nothing) and what it
// pays (a set amount per frame). The search box handles the first in one tap and
// the panel beside it answers the second without either having to read the
// other's copy.

const SCHOOLS = allSchoolKits().map((k) => ({
  slug: k.slug,
  schoolName: k.schoolName,
  shortName: k.shortName,
  mascot: k.mascot,
  city: k.city,
}));

const DONATION = `$${Math.round(schoolOffer.schoolDonationCents / 100)}`;

/** Real print artwork, straight from the badge library. */
const BADGES = ["football", "band", "cheer", "robotics", "drama", "medal"] as const;

export function SchoolSpotlight() {
  return (
    <section id="schools" className="mx-auto max-w-[1240px] px-5 pb-[72px] pt-2 sm:px-7">
      <div
        className="relative grid gap-9 overflow-hidden rounded-[28px] border-[4px] border-[#1e1b17] bg-[#1b2a4a] p-8 sm:p-12 lg:grid-cols-[1fr_1fr] lg:items-start"
        style={{ boxShadow: `10px 10px 0 ${INK}` }}
      >
        {/* ── Parent side ── */}
        <div className="relative z-[1]">
          <div className="mb-2.5 text-sm font-extrabold tracking-[1.5px] text-[#f8c53b]">
            SCHOOLS · TEAMS · BOOSTER CLUBS
          </div>
          <h2
            className="m-0 mb-3.5 text-[clamp(32px,5vw,42px)] font-bold leading-none tracking-[-1px] text-[#fff9ec]"
            style={{ textShadow: `3px 3px 0 ${INK}` }}
          >
            Their school.
            <br />
            Their name on it.
          </h2>
          <p className="m-0 mb-1 max-w-[440px] text-lg font-bold leading-[1.5] text-[#c9d0e2]">
            A frame in your school&apos;s colors with your student&apos;s last
            name in varsity chenille, and a badge for everything they actually
            do. Every one sends {DONATION} back to the school.
          </p>

          <FindMySchool schools={SCHOOLS} tone="dark" />

          <div className="flex flex-wrap gap-2.5">
            {BADGES.map((slug) => (
              <span
                key={slug}
                className="inline-flex h-14 w-14 items-center justify-center rounded-[10px] border-2 border-[#f8c53b]/45 bg-[#16233d]"
              >
                <Image
                  src={`/tiles/high-school/${slug}.png`}
                  alt=""
                  aria-hidden="true"
                  width={44}
                  height={44}
                />
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm font-bold text-[#c9d0e2]">
            60+ activity badges, from football to ceramics.
          </p>
        </div>

        {/* ── Booster side ── */}
        <div
          className="relative z-[1] rounded-[18px] border-[3px] border-[#f8c53b]/45 bg-[#16233d] p-6 sm:p-7"
        >
          <h3 className="m-0 mb-3 text-[26px] font-bold leading-tight tracking-[-0.5px] text-[#fff9ec]">
            Running a fundraiser?
          </h3>
          <p className="m-0 mb-5 text-base font-bold leading-[1.55] text-[#c9d0e2]">
            No minimums, no inventory, nothing to front. Every frame is printed
            after a parent orders it, so there is no case pack to buy and nothing
            left over at the end of the season.
          </p>
          <ul className="m-0 mb-6 list-none space-y-3 p-0">
            {[
              [`${DONATION} per frame`, "A set dollar amount, not a percentage of profit after costs."],
              ["A live running total", "Your club gets its own page, plus the figure by email every month."],
              ["You approve the design", "Your colors and crest, used with your written permission."],
            ].map(([title, body]) => (
              <li key={title} className="text-[#c9d0e2]">
                <strong className="block text-[15px] font-extrabold text-[#f8c53b]">
                  {title}
                </strong>
                <span className="text-[15px] font-bold leading-[1.5]">{body}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/school#fundraise"
              className="inline-flex min-h-[44px] items-center rounded-full border-[3px] border-[#1e1b17] bg-[#f8c53b] px-5 py-2.5 text-base font-extrabold text-[#1e1b17]"
              style={{ boxShadow: `3px 3px 0 ${INK}` }}
            >
              How the fundraiser works
            </Link>
            <a
              href="mailto:hello@festiveframes.co?subject=School%20fundraiser%20%E2%80%94%20MySchoolFrame"
              className="inline-flex min-h-[44px] items-center rounded-full border-[3px] border-[#f8c53b]/60 px-5 py-2.5 text-base font-extrabold text-[#fff9ec]"
            >
              Talk to us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
