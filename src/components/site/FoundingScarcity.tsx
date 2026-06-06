import { FOUNDING } from "@/config/founding";
import { getFoundingCounts } from "@/lib/founding-status";
import { copy } from "@/content/copy";

// Honest, LIVE scarcity. The count comes from the real cap + base offset + kits
// sold through Stripe (see lib/founding-status). Shows "X claimed · Y of 250
// left" with a progress bar once any are claimed.
export async function FoundingScarcity({ dark = false, center = false }: { dark?: boolean; center?: boolean }) {
  const { claimed, remaining, cap } = await getFoundingCounts();
  const counting = claimed > 0;
  const pct = Math.min(100, Math.max(2, Math.round((claimed / cap) * 100)));

  return (
    <div className={`flex w-full max-w-sm flex-col gap-2 ${center ? "mx-auto items-center text-center" : "items-start"}`}>
      <span className="w-fit rounded-full bg-brand-red px-3 py-1 font-mkt-display text-xs font-bold uppercase tracking-widest text-brand-white">
        {FOUNDING.occasion} · {FOUNDING.edition}
      </span>

      {counting ? (
        <div className="w-full">
          <p className={`text-sm font-bold ${dark ? "text-brand-gold" : "text-brand-red"}`}>
            {claimed} claimed
            <span className={`font-medium ${dark ? "text-brand-cream/85" : "text-brand-ink/75"}`}>
              {" "}· {remaining} of {cap} left
            </span>
          </p>
          <div
            className={`mt-1.5 h-2 w-full overflow-hidden rounded-full ${dark ? "bg-brand-cream/15" : "bg-brand-navy-soft/20"}`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={cap}
            aria-valuenow={claimed}
            aria-label={`${claimed} of ${cap} Founding kits claimed`}
          >
            <div className="h-full rounded-full bg-brand-red" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : (
        <p className={`text-sm font-semibold ${dark ? "text-brand-gold" : "text-brand-red"}`}>
          Only {cap} will ever be made
        </p>
      )}

      <p className={`text-xs ${dark ? "text-brand-cream/75" : "text-brand-ink/65"}`}>
        {copy.home.founding.scarcityLine}
      </p>
    </div>
  );
}
