import Link from "next/link";
import Image from "next/image";

const INK = "#1e1b17";

// Confetti bars/dots scattered behind the hero. Decorative, non-interactive.
const CONFETTI: { style: React.CSSProperties }[] = [
  { style: { left: "4%", top: "18%", width: 34, height: 11, borderRadius: 99, background: "#3fb0e6", transform: "rotate(-24deg)" } },
  { style: { left: "14%", top: "8%", width: 13, height: 13, borderRadius: 99, background: "#f8c53b" } },
  { style: { left: "30%", top: "5%", width: 30, height: 10, borderRadius: 99, background: "#ed5aa0", transform: "rotate(32deg)" } },
  { style: { left: "46%", top: "11%", width: 12, height: 12, borderRadius: 3, background: "#9b5fd0", transform: "rotate(18deg)" } },
  { style: { right: "40%", top: "4%", width: 30, height: 10, borderRadius: 99, background: "#3fb0e6", transform: "rotate(-14deg)" } },
  { style: { left: "2%", top: "54%", width: 13, height: 13, borderRadius: 99, background: "#ed5aa0" } },
  { style: { left: "8%", top: "74%", width: 30, height: 10, borderRadius: 99, background: "#f8c53b", transform: "rotate(40deg)" } },
  { style: { left: "1%", top: "38%", width: 12, height: 12, borderRadius: 3, background: "#9b5fd0", transform: "rotate(24deg)" } },
  { style: { right: "2%", top: "64%", width: 34, height: 11, borderRadius: 99, background: "#ed5aa0", transform: "rotate(22deg)" } },
  { style: { right: "7%", top: "80%", width: 13, height: 13, borderRadius: 99, background: "#3fb0e6" } },
  { style: { right: "3%", top: "26%", width: 30, height: 10, borderRadius: 99, background: "#f8c53b", transform: "rotate(-32deg)" } },
];

export function Hero() {
  return (
    <section
      id="top"
      className="relative mx-auto grid max-w-[1240px] items-center gap-10 px-5 pb-9 pt-14 sm:px-7 lg:grid-cols-[1.05fr_0.95fr]"
    >
      {/* confetti field */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        {CONFETTI.map((c, i) => (
          <div key={i} className="absolute" style={c.style} />
        ))}
      </div>

      {/* copy column */}
      <div className="relative z-[1]">
        <div
          className="mb-[22px] inline-flex items-center gap-2 rounded-full border-[3px] border-[#1e1b17] bg-[#fff9ec] px-4 py-[7px] text-sm font-extrabold tracking-[0.3px]"
          style={{ boxShadow: `3px 3px 0 ${INK}` }}
        >
          <span className="inline-block h-[11px] w-[11px] rounded-full bg-[#ed5aa0]" />
          Made to order, by hand, in the USA
        </div>

        <h1 className="m-0 mb-[18px] text-[clamp(44px,8vw,66px)] font-bold leading-[0.96] tracking-[-1.5px]">
          Park with
          <br />
          <span className="text-[#ed5aa0]">personality.</span>
        </h1>

        <p className="m-0 mb-[30px] max-w-[460px] text-[20px] font-medium leading-[1.5] text-[#3a352c]">
          Design your own frame, then make it yours — plus a goodie bag of
          surprise extra tiles and zero tools. Restyle your plate for the Fourth,
          game day, or just because, in about ten seconds flat. Every kit is made
          to order, by hand, in the USA.
        </p>

        <div className="flex flex-wrap items-center gap-[14px]">
          <Link
            href="/buy?kit=american-classic"
            className="s-display s-press rounded-full border-[3px] border-[#1e1b17] bg-[#ed5aa0] px-7 py-[14px] text-lg font-semibold text-[#fff9ec] no-underline"
            style={{
              boxShadow: `5px 5px 0 ${INK}`,
              ["--press-shadow-lift" as string]: `7px 7px 0 ${INK}`,
              ["--press-shadow-press" as string]: `2px 2px 0 ${INK}`,
            }}
          >
            Claim your kit
          </Link>
          <Link
            href="#looks"
            className="s-display s-press rounded-full border-[3px] border-[#1e1b17] bg-[#fff9ec] px-7 py-[14px] text-lg font-semibold text-[#1e1b17] no-underline"
            style={{
              boxShadow: `5px 5px 0 ${INK}`,
              ["--press-shadow-lift" as string]: `7px 7px 0 ${INK}`,
              ["--press-shadow-press" as string]: `2px 2px 0 ${INK}`,
            }}
          >
            Browse the looks
          </Link>
        </div>

        <div className="mt-[34px] flex flex-wrap gap-[26px]">
          <Stat value="You" label="design every frame" />
          <Divider />
          <Stat value="5.0★" label="from real drivers" />
          <Divider />
          <Stat value="USA" label="made in St. Louis" />
        </div>
      </div>

      {/* product photo */}
      <div className="relative z-[1] flex justify-center">
        <div className="ff-float relative" style={{ ["--r" as string]: "-3deg" }}>
          <div
            className="w-[480px] max-w-full overflow-hidden rounded-[18px] border-[6px] border-[#1e1b17] bg-[#fffdf6]"
            style={{ boxShadow: `12px 12px 0 ${INK}` }}
          >
            <Image
              src="/redesign/looks/years250.png"
              alt="Festive Frames — the 250 Years look on a Missouri plate"
              width={1600}
              height={862}
              priority
              className="block h-auto w-full"
            />
          </div>
          <Image
            src="/redesign/tiles/popsicle.png"
            alt=""
            aria-hidden
            width={268}
            height={268}
            className="ff-wiggle absolute -bottom-10 -right-11 h-auto w-[160px]"
            style={{ filter: "drop-shadow(5px 6px 0 rgba(30,27,23,0.18))" }}
          />
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="s-display text-[30px] font-bold leading-none">{value}</div>
      <div className="text-sm font-bold text-[#6a6354]">{label}</div>
    </div>
  );
}

function Divider() {
  return <div className="w-[3px] rounded-full bg-[#1e1b17]" />;
}
