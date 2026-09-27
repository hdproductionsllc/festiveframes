// GET /q/<school>/<placement> — a TRACKABLE QR link (2026-09-27).
//
// Every printed QR code points here instead of straight at /s/<school>, with a
// placement naming where it was printed ("card", "bleachers", "newsletter"). The
// scan is counted (lib/school-designs/funnel), and the parent is forwarded to their
// school's builder with `?via=<placement>`, which the builder keeps so a later
// send or purchase is credited to that QR code. Nothing about the person is
// recorded here.
//
// The forward is built on msfOrigin(), never the request URL (behind Railway's
// proxy the app believes it is localhost). An unknown school goes to the finder.

import { NextResponse } from "next/server";
import { resolveSchoolKit } from "@/data/school-resolve";
import { isPlacement, recordEvent } from "@/lib/school-designs/funnel";
import { msfOrigin } from "@/lib/msf-origin";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ school: string; placement: string }> },
): Promise<NextResponse> {
  const { school, placement } = await params;
  const kit = /^[a-z0-9-]{1,60}$/.test(school) ? resolveSchoolKit(school) : undefined;
  if (!kit) return NextResponse.redirect(`${msfOrigin()}/school#find-my-school`, { status: 302 });
  const via = isPlacement(placement) ? placement : null;
  await recordEvent({ kind: "scan", school: kit.slug, placement: via });
  const target = `${msfOrigin()}/s/${kit.slug}${via ? `?via=${via}` : ""}`;
  // 302 and no-store: every scan must reach us, never a cached redirect.
  return NextResponse.redirect(target, { status: 302, headers: { "Cache-Control": "no-store" } });
}
