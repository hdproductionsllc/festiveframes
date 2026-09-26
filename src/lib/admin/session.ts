// The one gate every /admin page and admin API route goes through.
// SERVER ONLY.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, sessionEmail } from "./auth";

/** The signed-in staff address, or null. */
export async function currentAdmin(): Promise<string | null> {
  const jar = await cookies();
  return sessionEmail(jar.get(ADMIN_COOKIE)?.value);
}

/** For pages: the signed-in staff address, or off to the sign-in page. */
export async function requireAdmin(): Promise<string> {
  const email = await currentAdmin();
  if (!email) redirect("/admin/login");
  return email;
}
