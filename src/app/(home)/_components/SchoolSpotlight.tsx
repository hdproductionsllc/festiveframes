import Link from "next/link";
import { SCHOOL_CHECKOUT_OPEN } from "@/config/school-checkout";
import { SCHOOL_CONTACT_EMAIL } from "@/content/school-contact";
import Image from "next/image";
import { FindMySchool } from "@/components/school/FindMySchool";
import { finderSchools, SCHOOL_FINDER_SCOPE } from "@/data/school-pilot";
import { ACTIVITY_COUNT_LABEL } from "@/content/school-activity-count";

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

const SCHOOLS = finderSchools();
const NATIONAL = SCHOOL_FINDER_SCOPE === "national";

// NO PRICE, NO PER-FRAME FIGURE. The pilot price is owner-confirmed (config/
// offers.ts), but checkout stays parked until one end-to-end test payment has
// run, and school surfaces show no figure until it opens — see
// no-school-pricing.test.ts.
/** Real print artwork, straight from the badge library. */
const BADGES = ["orchestra", "science", "drama", "marching-band", "soccer", "football"] as const;

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
            A letterman jacket
            <br />
            for the car.
          </h2>
          <p className="m-0 mb-1 max-w-[440px] text-lg font-bold leading-[1.5] text-[#c9d0e2]">
            Their school. Their class year. The things they actually did there,
            from orchestra to varsity soccer.
          </p>

          <FindMySchool schools={SCHOOLS} tone="dark" national={NATIONAL} />

          {/* Even rows: three by two on a phone, one row of six from sm up. A
              flex-wrap broke 4 + 2 at 390px. */}
          <div className="grid w-fit grid-cols-3 gap-2.5 sm:grid-cols-6">
            {BADGES.map((slug) => (
              <span
                key={slug}
                className="inline-flex h-14 w-14 items-center justify-center rounded-[10px] border-2 border-[#f8c53b]/45 bg-[#16233d]"
              >
                {/* Sized by class, not just by attribute: the global
                    `img { height: auto }` let the tall orchestra art (395 x 1000)
                    render ~111px high and spill out of its 56px tile. */}
                <Image
                  src={`/tiles/high-school/${slug}.png`}
                  alt=""
                  aria-hidden="true"
                  width={44}
                  height={44}
                  className="h-11 w-11 object-contain"
                />
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm font-bold text-[#c9d0e2]">
            {ACTIVITY_COUNT_LABEL} activity badges, from football to orchestra.
          </p>
        </div>

        {/* ── Booster side ── */}
        <div
          className="relative z-[1] rounded-[18px] border-[3px] border-[#f8c53b]/45 bg-[#16233d] p-6 sm:p-7"
        >
          <h3 className="m-0 mb-3 text-[26px] font-bold leading-tight tracking-[-0.5px] text-[#fff9ec]">
            For PTOs and booster clubs
          </h3>
          <p className="m-0 mb-5 text-base font-bold leading-[1.55] text-[#c9d0e2]">
            A fundraiser with nothing to buy and nothing to run.
          </p>
          {/* The same three facts, in the same order, as /school#fundraise. */}
          <ul className="m-0 mb-6 list-none space-y-3 p-0">
            {[
              ["Parents order directly", "Families design their own frame, and we print and ship it straight to their door."],
              ["The school buys no inventory", "Every frame is printed after it's ordered: no minimum, nothing up front, nothing left over."],
              // The club page only counts orders paid through checkout, so the
              // "running total" claim waits for checkout to open.
              [
                "A fixed amount on every frame",
                SCHOOL_CHECKOUT_OPEN
                  ? "A set dollar amount, not a percentage after costs, with a club page that keeps a running total."
                  : "A set dollar amount, not a percentage after costs, with the total sent to you in writing at each payout.",
              ],
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
              href={`mailto:${SCHOOL_CONTACT_EMAIL}?subject=School%20fundraiser%20%E2%80%94%20MySchoolFrame`}
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
