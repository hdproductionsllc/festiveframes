// POST /api/admin/logout — end this device's staff session.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, endSession } from "@/lib/admin/auth";
import { msfOrigin } from "@/lib/msf-origin";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  const jar = await cookies();
  await endSession(jar.get(ADMIN_COOKIE)?.value).catch(() => {});
  // msfOrigin(), never request.url: behind the proxy the app believes it is localhost.
  const res = NextResponse.redirect(`${msfOrigin()}/admin/login`, { status: 303 });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
