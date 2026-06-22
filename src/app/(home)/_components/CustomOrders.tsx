import Image from "next/image";

const INK = "#1e1b17";

// Blue panel. Custom orders / bulk (teams, events, fleets) — NOT a bespoke
// "we'll illustrate your idea" service. CTA opens an email to hello@.
export function CustomOrders() {
  return (
    <section id="custom" className="mx-auto max-w-[1240px] px-5 pb-[72px] pt-2 sm:px-7">
      <div
        className="relative grid items-center gap-8 overflow-hidden rounded-[28px] border-[4px] border-[#1e1b17] bg-[#3fb0e6] p-8 sm:p-12 lg:grid-cols-[1.2fr_0.8fr]"
        style={{ boxShadow: `10px 10px 0 ${INK}` }}
      >
        <div className="relative z-[1]">
          <div className="mb-2.5 text-sm font-extrabold tracking-[1.5px] text-[#1e1b17]">
            TEAMS · EVENTS · BULK
          </div>
          <h2
            className="m-0 mb-3.5 text-[clamp(32px,5vw,42px)] font-bold leading-none tracking-[-1px] text-[#fff9ec]"
            style={{ textShadow: `3px 3px 0 ${INK}` }}
          >
            Custom orders
            <br />
            for your crew.
          </h2>
          <p className="m-0 mb-[26px] max-w-[440px] text-lg font-bold leading-[1.5] text-[#0d3a52]">
            Outfitting a car club, a dealership, a wedding party, or a company
            fleet? Tell us what you&apos;re celebrating and we&apos;ll put together a
            custom tile run with bulk pricing.
          </p>
          <a
            href="mailto:hello@festiveframes.co?subject=Custom%20order%20%E2%80%94%20Festive%20Frames"
            className="s-display s-press inline-block rounded-full border-[3px] border-[#1e1b17] bg-[#f8c53b] px-[30px] py-[14px] text-lg font-semibold text-[#1e1b17] no-underline"
            style={{
              boxShadow: `5px 5px 0 ${INK}`,
              ["--press-shadow-lift" as string]: `7px 7px 0 ${INK}`,
              ["--press-shadow-press" as string]: `2px 2px 0 ${INK}`,
            }}
          >
            Talk custom orders
          </a>
        </div>
        <div className="relative z-[1] flex justify-center">
          <Image
            src="/redesign/tiles/popsicle.png"
            alt=""
            aria-hidden
            width={268}
            height={268}
            className="ff-float-slow h-auto w-[190px]"
            style={{ ["--r" as string]: "-8deg", filter: "drop-shadow(6px 8px 0 rgba(30,27,23,0.18))" }}
          />
        </div>
      </div>
    </section>
  );
}
