// POST /api/admin/logout — end this device's staff session.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, endSession } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const jar = await cookies();
  await endSession(jar.get(ADMIN_COOKIE)?.value).catch(() => {});
  const res = NextResponse.redirect(new URL("/admin/login", request.url), { status: 303 });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
