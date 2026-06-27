const INK = "#1e1b17";

// The three makers behind Festive Frames, in their own words. These are REAL,
// attributed founder voices (mirrors copy.home.testimonials) — used instead of
// customer reviews until we have genuine verified-buyer feedback to show, so we
// never publish invented customer quotes (FTC).
const VOICES = [
  { quote: "I design every tile to read from a block away: big, bold, and unmistakably American. Seeing my artwork snap onto someone's car, and knowing they can restyle it any time, is the whole dream.", name: "Becky Newman", meta: "Tile artist & designer", initial: "B", accent: "#ed5aa0" },
  { quote: "I obsess over the fit and the snap. The frame installs once with your existing screws, and every tile locks in clean and pops off in seconds. We build and test these in St. Louis, and we stand behind every one for 30 days.", name: "Bill Laupan", meta: "Engineer & product designer", initial: "B", accent: "#3fb0e6" },
  { quote: "Your car becomes a little canvas you can restyle whenever you want. I love seeing what people come up with.", name: "Henry David", meta: "Photographer & product designer", initial: "H", accent: "#9b5fd0" },
];

export function Reviews() {
  return (
    <section className="mx-auto max-w-[1240px] px-5 pb-[72px] sm:px-7">
      <div className="mb-9 text-center">
        <div className="mb-1.5 text-[15px] font-extrabold tracking-[1.5px] text-[#ed5aa0]">
          MADE BY HAND IN ST. LOUIS
        </div>
        <h2 className="m-0 text-[clamp(30px,5vw,40px)] font-bold leading-none tracking-[-1px]">
          Meet the makers
        </h2>
        <p className="mx-auto mt-3 max-w-[520px] text-sm font-bold text-[#6a6354]">
          The three of us design, build, and ship every frame ourselves. Verified buyer reviews coming soon.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {VOICES.map((r) => (
          <div
            key={r.name}
            className="rounded-[18px] border-[3px] border-[#1e1b17] bg-[#fff9ec] p-[26px]"
            style={{ boxShadow: `5px 5px 0 ${INK}` }}
          >
            <p className="m-0 mb-[18px] text-[17px] font-semibold leading-[1.5]">
              &ldquo;{r.quote}&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div
                className="s-display flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[#1e1b17] font-bold text-[#fff9ec]"
                style={{ background: r.accent, textShadow: `1px 1px 0 ${INK}` }}
              >
                {r.initial}
              </div>
              <div>
                <div className="s-display text-base font-semibold">{r.name}</div>
                <div className="text-[13px] font-bold text-[#6a6354]">{r.meta}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
