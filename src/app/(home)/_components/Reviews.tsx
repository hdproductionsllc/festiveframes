const INK = "#1e1b17";

const REVIEWS = [
  { quote: "The frame feels solid and the tiles fit together really well. Several people have asked where I got it.", name: "Melissa C.", meta: "St. Charles, MO", initial: "M", accent: "#ed5aa0" },
  { quote: "I'm one of those people who puts up lights for every holiday. Now my truck gets decorated too.", name: "Jacob S.", meta: "Wentzville, MO", initial: "J", accent: "#3fb0e6" },
  { quote: "Spent twenty minutes trying different layouts before settling on one. Way more combinations than I expected.", name: "Nicole A.", meta: "Jefferson City, MO", initial: "N", accent: "#9b5fd0" },
];

export function Reviews() {
  return (
    <section className="mx-auto max-w-[1240px] px-5 pb-[72px] sm:px-7">
      <div className="mb-9 text-center">
        <div className="mb-1.5 text-[15px] font-extrabold tracking-[1.5px] text-[#ed5aa0]">
          EARLY FEEDBACK
        </div>
        <h2 className="m-0 text-[clamp(30px,5vw,40px)] font-bold leading-none tracking-[-1px]">
          What our early testers say
        </h2>
        <p className="mx-auto mt-3 max-w-[520px] text-sm font-bold text-[#6a6354]">
          Early feedback from our first testers. Verified buyer reviews coming soon.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {REVIEWS.map((r) => (
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
