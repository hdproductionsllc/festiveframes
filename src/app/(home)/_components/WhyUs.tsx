const INK = "#1e1b17";

const FEATURES = [
  { glyph: "⚑", title: "Install once", body: "Bolt on with your existing plate screws a single time. Never touch tools again.", accent: "#ed5aa0" },
  { glyph: "◈", title: "Snap-on tiles", body: "Tiles click in by hand and pop off in seconds. Endless combinations from one kit.", accent: "#3fb0e6" },
  { glyph: "★", title: "Made in St. Louis", body: "Every frame and tile designed and made in the USA. UV printed so colors stay bright.", accent: "#f8c53b" },
  { glyph: "☂", title: "Built for the road", body: "Vetted for highway speeds, automatic car washes, and the full swing of weather.", accent: "#9b5fd0" },
];

// Full-bleed purple band. White heading with a 3px ink text-shadow; four cream
// feature cards each with a rounded accent glyph chip.
export function WhyUs() {
  return (
    <section id="why" className="border-y-[3px] border-[#1e1b17] bg-[#9b5fd0]">
      <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-7">
        <div className="mb-11 text-center">
          <div className="mb-1.5 text-[15px] font-extrabold tracking-[1.5px] text-[#f8c53b]">
            WHY YOU&apos;LL LOVE IT
          </div>
          <h2
            className="m-0 text-[clamp(34px,6vw,46px)] font-bold leading-none tracking-[-1px] text-[#fff9ec]"
            style={{ textShadow: `3px 3px 0 ${INK}` }}
          >
            Why Festive Frames
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-[18px] border-[3px] border-[#1e1b17] bg-[#fff9ec] p-6"
              style={{ boxShadow: `5px 5px 0 ${INK}` }}
            >
              <div
                className="s-display mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-[12px] border-[3px] border-[#1e1b17] text-[22px] font-bold text-[#fff9ec]"
                style={{ background: f.accent, textShadow: `1.5px 1.5px 0 ${INK}` }}
              >
                {f.glyph}
              </div>
              <h3 className="s-display m-0 mb-2 text-xl font-semibold">{f.title}</h3>
              <p className="m-0 text-[15px] font-semibold leading-[1.45] text-[#6a6354]">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
