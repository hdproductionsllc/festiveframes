// Full-bleed pink marquee that scrolls infinitely. The phrase list is duplicated
// inline so the -50% translate loop is seamless. Decorative; reduced-motion is
// handled globally.
const PHRASES = [
  "★ SNAP IT ON",
  "★ SWAP ANY TIME",
  "★ 50+ TILES PER KIT",
  "★ ZERO TOOLS",
  "★ MADE IN ST. LOUIS",
  "★ UV PRINTED",
  "★ PARTY ON YOUR PLATE",
  "★ FITS ALL US PLATES",
];

export function Marquee() {
  return (
    <div className="overflow-hidden border-y-[3px] border-[#1e1b17] bg-[#ed5aa0] py-[13px]">
      <div className="ff-marquee flex w-max whitespace-nowrap">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            aria-hidden={copy === 1}
            className="s-display flex items-center gap-[30px] pr-[30px] text-lg font-semibold tracking-[0.5px] text-[#fff9ec]"
          >
            {PHRASES.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
