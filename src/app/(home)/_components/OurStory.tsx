import { copy } from "@/content/copy";

const INK = "#1e1b17";
const ACCENTS = ["#ed5aa0", "#3fb0e6", "#f8c53b", "#9b5fd0"];

// The honest "why we built this" maker story + the small St. Louis crew behind
// it (attributed maker quotes, never fake customer reviews). Same copy.home
// .story + copy.home.testimonials source as the classic site.
export function OurStory() {
  const { story, testimonials } = copy.home;

  return (
    <section className="mx-auto max-w-[1240px] px-5 py-[72px] sm:px-7" aria-labelledby="story-heading">
      <div className="mx-auto mb-11 max-w-[760px] text-center">
        <div className="mb-1.5 text-[15px] font-extrabold tracking-[1.5px] text-[#3fb0e6]">
          MADE IN ST. LOUIS
        </div>
        <h2 id="story-heading" className="m-0 text-[clamp(30px,5vw,44px)] font-bold leading-[1.05] tracking-[-1px]">
          {story.heading}
        </h2>
        <p className="mt-5 text-lg font-medium leading-[1.6] text-[#3a352c]">{story.body}</p>
      </div>

      {/* the four reasons */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {story.reasons.map((r, i) => (
          <div
            key={r.title}
            className="rounded-[18px] border-[3px] border-[#1e1b17] bg-[#fff9ec] p-6"
            style={{ boxShadow: `5px 5px 0 ${INK}` }}
          >
            <div
              className="s-display mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-[12px] border-[3px] border-[#1e1b17] text-[22px] font-bold text-[#fff9ec]"
              style={{ background: ACCENTS[i % ACCENTS.length], textShadow: `1.5px 1.5px 0 ${INK}` }}
            >
              {i + 1}
            </div>
            <h3 className="s-display m-0 mb-2 text-lg font-semibold leading-[1.15]">{r.title}</h3>
            <p className="m-0 text-[15px] font-semibold leading-[1.45] text-[#6a6354]">{r.body}</p>
          </div>
        ))}
      </div>

      {/* the crew (attributed maker quotes) */}
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <div
            key={t.name}
            className="rounded-[18px] border-[3px] border-[#1e1b17] bg-[#fff9ec] p-[26px]"
            style={{ boxShadow: `5px 5px 0 ${INK}` }}
          >
            <p className="m-0 mb-[18px] text-[15px] font-medium italic leading-[1.55] text-[#3a352c]">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div
                className="s-display flex h-10 w-10 flex-none items-center justify-center rounded-full border-[3px] border-[#1e1b17] font-bold text-[#fff9ec]"
                style={{ background: ACCENTS[i % ACCENTS.length], textShadow: `1px 1px 0 ${INK}` }}
              >
                {t.name.charAt(0)}
              </div>
              <div>
                <div className="s-display text-base font-semibold leading-tight">{t.name}</div>
                <div className="text-[13px] font-bold leading-tight text-[#6a6354]">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
