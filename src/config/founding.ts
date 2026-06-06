// Founding Edition: a genuinely capped launch run tied to America's 250th
// (the U.S. Semiquincentennial, July 4, 2026). The cap is real, so the scarcity
// is honest.
//
// `claimed` MUST reflect the TRUE number of Founding kits actually sold/
// committed. Keep it honest — bump it as real orders come in, or wire it to
// Stripe later. Never inflate it; fake scarcity is an FTC violation and burns
// the trust the rest of the site is built on.
export const FOUNDING = {
  cap: 250,
  claimed: 0,
  edition: "Founding Edition",
  occasion: "America's 250th",
} as const;

export function foundingRemaining(): number {
  return Math.max(0, FOUNDING.cap - FOUNDING.claimed);
}
