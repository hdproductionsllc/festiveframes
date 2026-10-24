// GET /api/admin/qr/<school>/<placement>?format=svg|png — a school's QR code,
// for staff to hand a club (lib/school-qr). Staff only: a public QR mint would
// let anyone fill the funnel with placements that were never printed.

import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin/session";
import { resolveSchoolKit } from "@/data/school-resolve";
import { isPlacement } from "@/lib/school-designs/funnel";
import { schoolQrPng, schoolQrSvg } from "@/lib/school-qr";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ school: string; placement: string }> },
): Promise<NextResponse> {
  if (!(await currentAdmin())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { school, placement } = await params;
  const kit = /^[a-z0-9-]{1,60}$/.test(school) ? resolveSchoolKit(school) : undefined;
  if (!kit || kit.slug !== school) return NextResponse.json({ error: "Unknown school." }, { status: 404 });
  if (!isPlacement(placement)) {
    return NextResponse.json({ error: "A placement is lowercase letters, digits and dashes." }, { status: 400 });
  }
  const png = new URL(req.url).searchParams.get("format") === "png";
  const name = `${kit.slug}-${placement}.${png ? "png" : "svg"}`;
  const headers = {
    "Content-Type": png ? "image/png" : "image/svg+xml",
    "Content-Disposition": `attachment; filename="${name}"`,
    "Cache-Control": "private, no-store",
  };
  return png
    ? new NextResponse(new Uint8Array(await schoolQrPng(kit.slug, placement)), { headers })
    : new NextResponse(await schoolQrSvg(kit.slug, placement), { headers });
}
