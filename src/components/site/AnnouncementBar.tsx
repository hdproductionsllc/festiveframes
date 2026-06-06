import Link from "next/link";
import { FOUNDING } from "@/config/founding";
import { getFoundingCounts } from "@/lib/founding-status";

// Thin sitewide urgency bar (above the header on all marketing pages). The
// count is live from the real cap + kits sold (lib/founding-status).
export async function AnnouncementBar() {
  const { claimed, remaining, cap } = await getFoundingCounts();
  const countLine = claimed > 0 ? `${remaining} of ${cap} left` : `Only ${cap} made`;

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
