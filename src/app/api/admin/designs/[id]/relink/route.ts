// POST /api/admin/designs/<id>/relink — a fresh link for a parent who lost theirs.
//
// Staff only. The design's old link stops working at once, and the new one is
// returned to the staff member to send by hand (nothing is emailed from here).
// The link is built on MySchoolFrame's own origin, like every parent link.

import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin/session";
import { rotateDesignToken } from "@/lib/school-designs/store";
import { msfOrigin } from "@/lib/msf-origin";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const { id } = await params;
  const rotated = await rotateDesignToken(id).catch(() => null);
  if (!rotated) return NextResponse.json({ error: "Design not found." }, { status: 404 });
  if (!rotated.school) {
    return NextResponse.json({ error: "This design has no school page to open it on." }, { status: 409 });
  }
  console.log(`[admin] ${admin} issued a new link for design ${id}.`);
  return NextResponse.json({ ok: true, url: `${msfOrigin()}/s/${rotated.school}#d=${rotated.token}` });
}
