"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const INK = "#1e1b17";

type Category = "All" | "Patriotic" | "Stars" | "Fireworks" | "Mixed";
const CATEGORIES: Category[] = ["All", "Patriotic", "Stars", "Fireworks", "Mixed"];

const LOOKS = [
  { img: "years250", name: "250 Years", phrase: "250 YEARS top bar", category: "Patriotic", accent: "#ed5aa0", accentSoft: "#f7c2dd" },
  { img: "spirit76", name: "Spirit of '76", phrase: "1776 · USA", category: "Patriotic", accent: "#3fb0e6", accentSoft: "#bfe6f7" },
  { img: "burst", name: "Freedom Burst", phrase: "LET FREEDOM RING", category: "Fireworks", accent: "#9b5fd0", accentSoft: "#d8c2f0" },
  { img: "brave", name: "Home of the Brave", phrase: "HOME OF THE BRAVE", category: "Stars", accent: "#ed5aa0", accentSoft: "#f7c2dd" },
  { img: "pinwheel", name: "Pinwheel Parade", phrase: "LET FREEDOM RING", category: "Stars", accent: "#3fb0e6", accentSoft: "#bfe6f7" },
  { img: "sampler", name: "The Sampler", phrase: "a little of everything", category: "Mixed", accent: "#f8c53b", accentSoft: "#fbe7a6" },
] as const;

const TILES = [
  { img: "eagle", label: "Eagle" },
  { img: "flag", label: "Old Glory" },
  { img: "waving-flag", label: "Waving Flag" },
  { img: "usa", label: "USA" },
  { img: "uncle-sam", label: "Top Hat" },
  { img: "liberty-bell", label: "Liberty Bell" },
  { img: "250", label: "250" },
  { img: "firecracker", label: "Firecracker" },
  { img: "star-red", label: "Red Star" },
  { img: "star-blue", label: "Blue Star" },
  { img: "popsicle", label: "Bomb Pop" },
];

export function Looks() {
  const [active, setActive] = useState<Category>("All");
  const shown = active === "All" ? LOOKS : LOOKS.filter((l) => l.category === active);

  return (
    <section id="looks" className="mx-auto max-w-[1240px] px-5 pb-6 pt-[72px] sm:px-7">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="mb-1.5 text-[15px] font-extrabold tracking-[1.5px] text-[#ed5aa0]">
            ONE FRAME, ENDLESS LOOKS
          </div>
          <h2 className="m-0 text-[clamp(34px,6vw,46px)] font-bold leading-none tracking-[-1px]">
            Find your flair
          </h2>
        </div>
        <p className="m-0 max-w-[360px] text-[17px] font-semibold text-[#6a6354]">
          Real kits, real frames. The tiles snap around the border — never over
          your plate — so your bumper goes from boring to block-party in seconds.
        </p>
      </div>

      {/* filter pills */}
      <div className="mb-[30px] flex flex-wrap gap-2.5">
        {CATEGORIES.map((cat) => {
          const on = cat === active;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActive(cat)}
              aria-pressed={on}
              className="s-display s-press cursor-pointer rounded-full border-[3px] border-[#1e1b17] px-[18px] py-[9px] text-[15px] font-semibold"
              style={{
                color: on ? "#fff9ec" : "#1e1b17",
                background: on ? "#1e1b17" : "#fff9ec",
                boxShadow: on ? "3px 3px 0 #ed5aa0" : `3px 3px 0 ${INK}`,
                ["--press-shadow-lift" as string]: on ? "5px 5px 0 #ed5aa0" : `5px 5px 0 ${INK}`,
                ["--press-shadow-press" as string]: on ? "1px 1px 0 #ed5aa0" : `1px 1px 0 ${INK}`,
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* look grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((d) => (
          <div
            key={d.name}
            className="flex flex-col rounded-[20px] border-[3px] border-[#1e1b17] bg-[#fff9ec] p-3.5"
            style={{ boxShadow: `5px 5px 0 ${INK}` }}
          >
            <div className="relative aspect-[1600/862] overflow-hidden rounded-[12px] border-[4px] border-[#1e1b17] bg-[#fffdf6]">
              <Image
                src={`/redesign/looks/${d.img}.png`}
                alt={`${d.name} look`}
                fill
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 380px"
                className="object-cover"
              />
            </div>
            <div className="mt-3.5 flex items-center justify-between gap-2">
              <div>
                <div className="s-display text-[19px] font-semibold leading-[1.05]">{d.name}</div>
                <div className="text-[13px] font-bold text-[#6a6354]">{d.phrase}</div>
              </div>
              <span
                className="whitespace-nowrap rounded-full border-2 border-[#1e1b17] px-2.5 py-[3px] text-[11px] font-extrabold tracking-[0.5px] text-[#1e1b17]"
                style={{ background: d.accentSoft }}
              >
                {d.category}
              </span>
            </div>
            <Link
              href="#kit"
              className="s-display s-press mt-3 rounded-full border-[3px] border-[#1e1b17] p-2.5 text-center text-[15px] font-semibold text-[#1e1b17] no-underline"
              style={{
                background: d.accent,
                boxShadow: `3px 3px 0 ${INK}`,
                ["--press-shadow-lift" as string]: `5px 5px 0 ${INK}`,
                ["--press-shadow-press" as string]: `1px 1px 0 ${INK}`,
              }}
            >
              Build this look
            </Link>
          </div>
        ))}
      </div>
      <p className="m-0 mt-[26px] text-center text-[15px] font-bold text-[#6a6354]">
        Same frame, same plate — just snap on a different set of tiles. No tools,
        no extra purchase.
      </p>

      {/* tile library */}
      <div
        className="mt-12 rounded-[24px] border-[3px] border-[#1e1b17] bg-[#fff9ec] p-8"
        style={{ boxShadow: `6px 6px 0 ${INK}` }}
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-1.5 text-[15px] font-extrabold tracking-[1.5px] text-[#3fb0e6]">
              50+ TILES, MIX &amp; MATCH
            </div>
            <h3 className="s-display m-0 text-[32px] font-bold leading-none tracking-[-0.5px]">
              The tile library
            </h3>
          </div>
          <p className="m-0 max-w-[380px] text-base font-semibold text-[#6a6354]">
            Every kit comes loaded with snap-on tiles. Here&apos;s a peek — pop any
            of them onto the frame in seconds.
          </p>
        </div>
        <div className="flex flex-wrap gap-3.5">
          {TILES.map((t) => (
            <div key={t.img} className="w-[92px]">
              <div
                className="flex h-[92px] items-center justify-center overflow-hidden rounded-[14px] border-[3px] border-[#1e1b17] bg-[#fffdf6] p-[7px]"
                style={{ boxShadow: `3px 3px 0 ${INK}` }}
              >
                <Image
                  src={`/redesign/tiles/${t.img}.png`}
                  alt={`${t.label} tile`}
                  width={268}
                  height={268}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="mt-[7px] text-center text-[11px] font-bold text-[#6a6354]">{t.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
