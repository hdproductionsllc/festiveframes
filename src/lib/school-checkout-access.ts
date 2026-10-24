// ─────────────────────────────────────────────────────────────
// Who may buy a school frame right now — the ONE answer the builder page (does it
// show Buy?) and the checkout route (does it take the order?) both ask, so the
// button and the lock cannot disagree.
//
//   "open"   — SCHOOL_CHECKOUT_OPEN is on: every parent.
//   "staff"  — checkout is parked, but this request carries a staff session
//              (/admin sign-in). Real, live Stripe, so the owner can run the
//              100%-off launch test on production without opening Buy to parents.
//   "closed" — everyone else while it is parked.
//
// Server only: it reads the httpOnly staff cookie. Public pages that only choose
// their WORDING (landing, raised, llms.txt) keep reading the bare switch — a
// staff test must never make the site tell parents they can order.
// ─────────────────────────────────────────────────────────────

import { SCHOOL_CHECKOUT_OPEN } from "@/config/school-checkout";
import { currentAdmin } from "@/lib/admin/session";

export type SchoolCheckoutAccess = "open" | "staff" | "closed";

export async function schoolCheckoutAccess(): Promise<SchoolCheckoutAccess> {
  if (SCHOOL_CHECKOUT_OPEN) return "open";
  // A database hiccup reading the session is "not staff" — the safe direction.
  const staff = await currentAdmin().catch(() => null);
  return staff ? "staff" : "closed";
}
