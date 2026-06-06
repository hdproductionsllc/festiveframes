import Link from "next/link";
import { FOUNDING, foundingRemaining } from "@/config/founding";

// Thin sitewide urgency bar (above the header on all marketing pages). Honest:
// the count comes from the real FOUNDING cap/claimed.
export function AnnouncementBar() {
  const remaining = foundingRemaining();
  const countLine = FOUNDING.claimed > 0 ? `${remaining} of ${FOUNDING.cap} left` : `Only ${FOUNDING.cap} made`;

  return (
    <Link
      href="/buy"
      className="block bg-brand-red px-4 py-2 text-center text-xs font-semibold text-brand-white transition-colors hover:bg-brand-red/90 sm:text-sm"
    >
      <span className="font-mkt-display uppercase tracking-wide">
        {FOUNDING.occasion} · {FOUNDING.edition}
      </span>
      <span className="px-2 opacity-50">·</span>
      {countLine}
      <span className="px-2 opacity-50">·</span>
      <span className="underline underline-offset-2">Claim yours</span>
    </Link>
  );
}
