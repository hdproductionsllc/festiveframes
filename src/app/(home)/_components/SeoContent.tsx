import { copy } from "@/content/copy";

// Long-form, search-intent content (SEO + answer-engine optimization). Plain
// semantic h2/h3 + paragraphs so crawlers and AI answer engines extract clear,
// quotable statements. Same copy.home.seo source as the classic site.
export function SeoContent() {
  const { seo } = copy.home;

  return (
    <section className="border-t-[3px] border-[#1e1b17] bg-[#fff9ec]" aria-labelledby="seo-heading">
      <div className="mx-auto max-w-[820px] px-5 py-16 sm:px-7">
        <h2 id="seo-heading" className="m-0 text-[clamp(28px,4.5vw,38px)] font-bold leading-[1.05] tracking-[-0.5px]">
          {seo.heading}
        </h2>
        <p className="mt-5 text-lg font-medium leading-[1.6] text-[#3a352c]">{seo.intro}</p>

        <div className="mt-10 flex flex-col gap-8">
          {seo.sections.map((s) => (
            <div key={s.heading}>
              <h3 className="s-display m-0 text-xl font-semibold text-[#1e1b17]">{s.heading}</h3>
              <p className="mt-2.5 text-base font-medium leading-[1.6] text-[#3a352c]">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
