import { copy } from "@/content/copy";

const INK = "#1e1b17";

// Native, accessible <details>/<summary> disclosures (no client JS). Same
// copy.home.faq array that feeds the FAQPage JSON-LD, so the visible content and
// the structured data stay in sync. Sticker-styled cream cards with ink borders.
export function Faq() {
  const { faq } = copy.home;

  return (
    <section id="faq" className="mx-auto max-w-[860px] px-5 pb-[72px] sm:px-7" aria-labelledby="faq-heading">
      <div className="mb-9 text-center">
        <div className="mb-1.5 text-[15px] font-extrabold tracking-[1.5px] text-[#9b5fd0]">
          GOOD QUESTIONS
        </div>
        <h2 id="faq-heading" className="m-0 text-[clamp(32px,5vw,44px)] font-bold leading-none tracking-[-1px]">
          Questions, answered
        </h2>
      </div>

      <div className="flex flex-col gap-3.5">
        {faq.map((item) => (
          <details
            key={item.question}
            className="group rounded-[16px] border-[3px] border-[#1e1b17] bg-[#fff9ec] px-5 py-4"
            style={{ boxShadow: `4px 4px 0 ${INK}` }}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-bold text-[#1e1b17]">
              {item.question}
              <span
                aria-hidden
                className="s-display flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 border-[#1e1b17] bg-[#f8c53b] text-lg leading-none transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-base font-medium leading-[1.55] text-[#3a352c]">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
