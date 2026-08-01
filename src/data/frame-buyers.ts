// ─── Who is this frame for? ──────────────────────────────────────────────────
//
// The builder's intake was written in the third person throughout — "Their last
// name", "What they do", "Class year" — which quietly assumes the buyer is a
// parent and the frame is for somebody else. That is one real case out of
// several, and the wrong wording for the rest:
//
//   • a SENIOR buying one for the car they just got is not buying "their" frame
//   • a GRANDPARENT wants their relationship on it, not just the surname
//   • an ALUM wants a year that is in the PAST, and the year picker only ever
//     offered the next four — a graduate of 1994 could not enter 1994
//   • a TEACHER or COACH has no class year at all, and the field is noise
//
// So the wording, the year range and the default tagline all come from here.
// The FRAME does not change: it is a name, a year and badges either way. What
// changes is what we call them, which is the whole of the problem.
//
// Choosing also tells us who is actually buying, which nothing in the product
// could answer before.

export type BuyerId = "parent" | "self" | "grandparent" | "alum" | "staff";

export interface Buyer {
  id: BuyerId;
  /** Chip text. Written as the buyer would say it, not as a category. */
  chip: string;
  nameLabel: string;
  namePlaceholder: string;
  activityLabel: string;
  /** Null hides the year field entirely — staff have no class year. */
  yearLabel: string | null;
  /** How the year reads on the banner. `{y}` is the chosen year. */
  taglineFor: (year: string) => string;
  /** Which years to offer. See `yearsFor`. */
  yearRange: "upcoming" | "past";
}

export const BUYERS: Buyer[] = [
  {
    id: "parent",
    chip: "My student",
    nameLabel: "Their last name",
    namePlaceholder: "MILLER",
    activityLabel: "What they do",
    yearLabel: "Class year",
    taglineFor: (y) => `CLASS OF ${y}`,
    yearRange: "upcoming",
  },
  {
    id: "self",
    chip: "Me",
    nameLabel: "Your last name",
    namePlaceholder: "MILLER",
    activityLabel: "What you do",
    yearLabel: "Class year",
    taglineFor: (y) => `CLASS OF ${y}`,
    yearRange: "upcoming",
  },
  {
    id: "grandparent",
    chip: "My grandchild",
    nameLabel: "Their last name",
    namePlaceholder: "MILLER",
    activityLabel: "What they do",
    yearLabel: "Class year",
    // The relationship IS the point for this buyer — it is why they are buying a
    // second frame for a student who already has one on their parents' car.
    taglineFor: (y) => `PROUD GRANDPARENT · ${y}`,
    yearRange: "upcoming",
  },
  {
    id: "alum",
    chip: "I went here",
    nameLabel: "Your last name",
    namePlaceholder: "MILLER",
    activityLabel: "What you did",
    yearLabel: "Class year",
    taglineFor: (y) => `CLASS OF ${y}`,
    yearRange: "past",
  },
  {
    id: "staff",
    chip: "I work here",
    nameLabel: "Your last name",
    namePlaceholder: "MILLER",
    activityLabel: "What you coach or teach",
    yearLabel: null,
    taglineFor: () => "",
    yearRange: "upcoming",
  },
];

export const DEFAULT_BUYER: BuyerId = "parent";

export function getBuyer(id: string | null | undefined): Buyer {
  return BUYERS.find((b) => b.id === id) ?? BUYERS[0];
}

/**
 * The years to offer, for a given buyer, as of `now`.
 *
 * UPCOMING is the four classes currently in the building. After June the
 * just-graduated class drops off and the incoming freshmen appear, so the list
 * can never go stale — that rule predates this file and is kept exactly.
 *
 * PAST is this year backwards, for alumni. Sixty is deep enough to cover anyone
 * still driving and shallow enough that the list stays usable. It includes the
 * current year because a May graduate is an alum by August and may well think of
 * themselves as one already.
 */
export function yearsFor(range: Buyer["yearRange"], now: Date = new Date()): number[] {
  const rolled = now.getFullYear() + (now.getMonth() >= 5 ? 1 : 0);
  if (range === "upcoming") return [0, 1, 2, 3].map((i) => rolled + i);
  const thisYear = now.getFullYear();
  return Array.from({ length: 60 }, (_, i) => thisYear - i);
}
