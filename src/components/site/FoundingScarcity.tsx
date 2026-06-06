import { FOUNDING, foundingRemaining } from "@/config/founding";
import { copy } from "@/content/copy";

// Honest scarcity: the 250-unit cap is real. Shows a live "X of 250 left" only
// once real orders exist (FOUNDING.claimed > 0); otherwise it states the cap.
export function FoundingScarcity({ dark = false, center = false }: { dark?: boolean; center?: boolean }) {
  const remaining = foundingRemaining();
  const counting = FOUNDING.claimed > 0;
  const headline = counting
    ? `${remaining} of ${FOUNDING.cap} left`
    : `Only ${FOUNDING.cap} will ever be made`;

  return (
    <div className={`flex flex-col gap-2 ${center ? "items-center text-center" : "items-start"}`}>
      <span className="w-fit rounded-full bg-brand-red px-3 py-1 font-mkt-display text-xs font-bold uppercase tracking-widest text-brand-white">
        {FOUNDING.occasion} · {FOUNDING.edition}
      </span>
      <p className={`text-sm font-semibold ${dark ? "text-brand-gold" : "text-brand-red"}`}>
        {headline}
        <span className={`font-normal ${dark ? "text-brand-cream/80" : "text-brand-ink/70"}`}>
          {" "}· {copy.home.founding.scarcityLine}
        </span>
      </p>
    </div>
  );
}
