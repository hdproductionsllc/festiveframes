const INK = "#1e1b17";

const STEPS = [
  {
    num: "1",
    title: "Install the frame once",
    body: "Bolt the rail onto your plate with your existing screws. No drilling, no new hardware.",
    accent: "#ed5aa0",
  },
  {
    num: "2",
    title: "Snap in your tiles",
    body: "Tiles click into the border by hand — no tools, no adhesive. Spell a phrase on the bottom bar.",
    accent: "#3fb0e6",
  },
  {
    num: "3",
    title: "Swap whenever",
    body: "New season, new holiday, new mood? Restyle the whole look in about ten seconds.",
    accent: "#f8c53b",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-[1240px] px-5 py-16 sm:px-7">
      <div className="mb-12 text-center">
        <div className="mb-1.5 text-[15px] font-extrabold tracking-[1.5px] text-[#3fb0e6]">
          THREE SNAPS AND DONE
        </div>
        <h2 className="m-0 text-[clamp(34px,6vw,46px)] font-bold leading-none tracking-[-1px]">
          How it works
        </h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {STEPS.map((s) => (
          <div
            key={s.num}
            className="relative rounded-[20px] border-[3px] border-[#1e1b17] bg-[#fff9ec] px-[26px] py-[30px]"
            style={{ boxShadow: `6px 6px 0 ${INK}` }}
          >
            <div
              className="s-display absolute -top-[22px] left-[26px] flex h-[50px] w-[50px] items-center justify-center rounded-full border-[3px] border-[#1e1b17] text-2xl font-bold text-[#fff9ec]"
              style={{ background: s.accent, boxShadow: `3px 3px 0 ${INK}`, textShadow: `1.5px 1.5px 0 ${INK}` }}
            >
              {s.num}
            </div>
            <h3 className="s-display mb-2.5 mt-[22px] text-2xl font-semibold">{s.title}</h3>
            <p className="m-0 text-base font-semibold leading-[1.5] text-[#6a6354]">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
