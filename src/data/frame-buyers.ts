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

// ─── The banner LINE — the small line on the bottom banner ───────────────────
//
// The owner's call (2026-09-23): lead with the year, the number, the role and the
// activity, not the student's full name. PROUD PARENT and SENIOR were only
// reachable by typing them into a field labelled "Their last name", so they are
// now one tap each. There is ONE list of lines; a buyer names which of them it
// offers, and the buyer's own default tagline is simply its first line — so the
// chips and the buyer's wording cannot drift into two lists.

export type BannerLineId = "class" | "number" | "senior" | "parent" | "grandparent" | "alum" | "staff" | "custom";

export interface BannerLineInput {
  year?: string;
  /** Jersey or roster number — ANY activity; a cellist has a chair number too. */
  number?: string;
  /** The words a buyer typed, for the custom line. */
  text?: string;
}

export interface BannerLine {
  id: BannerLineId;
  /** Chip text. */
  chip: string;
  /** Which extra field the chip opens: a number, or free text. */
  asks?: "number" | "text";
  /** The line itself. Empty means "nothing to write yet". */
  tagline: (input: BannerLineInput) => string;
}

/** Class year, led by the number when there is one: "#12 · CLASS OF 2027". */
function classLine({ year, number }: BannerLineInput): string {
  const n = number?.trim() ? `#${number.trim()}` : "";
  const y = year ? `CLASS OF ${year}` : "";
  return [n, y].filter(Boolean).join(" · ");
}

/** A role with the year after it when there is one: "PROUD PARENT · 2027". */
const roleLine = (role: string) => ({ year }: BannerLineInput) => (year ? `${role} · ${year}` : role);

export const BANNER_LINES: Record<BannerLineId, BannerLine> = {
  class: { id: "class", chip: "Class of", tagline: classLine },
  // The same words as `class` — the chip exists to ASK for the number, which used
  // to be offered only to the jersey sports.
  number: { id: "number", chip: "#Number", asks: "number", tagline: classLine },
  senior: {
    id: "senior",
    chip: "Senior",
    tagline: ({ year }) => (year ? `SENIOR · CLASS OF ${year}` : "SENIOR"),
  },
  parent: { id: "parent", chip: "Proud Parent", tagline: roleLine("PROUD PARENT") },
  // The relationship IS the point for this buyer — it is why they are buying a
  // second frame for a student who already has one on their parents' car. The
  // number is deliberately not carried: "#12 · PROUD GRANDPARENT" reads as the
  // grandparent's own number.
  grandparent: { id: "grandparent", chip: "Proud Grandparent", tagline: roleLine("PROUD GRANDPARENT") },
  // "I went here" and "I work here" each get a line that says so. Before these,
  // tapping either buyer changed the form's labels and nothing on the frame
  // (owner, 2026-09-24: "these don't seem to do anything").
  alum: {
    id: "alum",
    chip: "Alumni",
    tagline: ({ year }) => (year ? `ALUMNI · CLASS OF ${year}` : "ALUMNI"),
  },
  staff: { id: "staff", chip: "Faculty & Staff", tagline: () => "FACULTY & STAFF" },
  custom: {
    id: "custom",
    chip: "Your own words",
    asks: "text",
    tagline: ({ text }) => (text ?? "").trim().toUpperCase(),
  },
};

/** The tagline for a line, or "" when there is nothing to write yet. */
export function bannerTagline(id: BannerLineId | null | undefined, input: BannerLineInput): string {
  return id ? BANNER_LINES[id].tagline(input) : "";
}

export interface Buyer {
  id: BuyerId;
  /** Chip text. Written as the buyer would say it, not as a category. */
  chip: string;
  /**
   * The optional big line on the banner. It replaces the mascot when filled in
   * and leaves it when not — so it is labelled optional and never suggests a
   * surname: the owner wants the year, number and activity to lead.
   */
  nameLabel: string;
  namePlaceholder: string;
  activityLabel: string;
  /** Null hides the year field entirely — staff have no class year. */
  yearLabel: string | null;
  /** The banner lines this buyer is offered, DEFAULT FIRST. */
  lines: BannerLineId[];
  /**
   * The buyer's default line under the name — its first `lines` entry, derived,
   * never written out per buyer. Takes the number as well as the year: an
   * athlete's frame reads "#12 · CLASS OF 2027"; leave the number out and it
   * reads exactly as it did before.
   */
  taglineFor: (year: string, number?: string) => string;
  /** Which years to offer. See `yearsFor`. */
  yearRange: "upcoming" | "past";
}

export const BANNER_NAME_LABEL = "Banner text (optional)";

/** A buyer whose default tagline is read off its own first line. */
function buyer(b: Omit<Buyer, "taglineFor">): Buyer {
  return {
    ...b,
    taglineFor: (year, number) => (year ? bannerTagline(b.lines[0], { year, number }) : ""),
  };
}

export const BUYERS: Buyer[] = [
  buyer({
    id: "parent",
    chip: "My student",
    nameLabel: BANNER_NAME_LABEL,
    // Non-name examples first: the field is optional, and its example is the
    // one hint a parent reads about what belongs there (minor-name rule).
    namePlaceholder: "e.g. #12 or GO TEAM",
    activityLabel: "What they do",
    yearLabel: "Class year",
    // PROUD PARENT first: this buyer's frame goes on the PARENT's car, and the
    // "Who's it for?" tap should say so on the banner (owner, 2026-09-24).
    lines: ["parent", "class", "number", "senior", "custom"],
    yearRange: "upcoming",
  }),
  buyer({
    id: "self",
    chip: "Me",
    nameLabel: BANNER_NAME_LABEL,
    namePlaceholder: "e.g. a nickname or first name",
    activityLabel: "What you do",
    yearLabel: "Class year",
    lines: ["class", "number", "senior", "custom"],
    yearRange: "upcoming",
  }),
  buyer({
    id: "grandparent",
    chip: "My grandchild",
    nameLabel: BANNER_NAME_LABEL,
    namePlaceholder: "e.g. GRANDMA or #12",
    activityLabel: "What they do",
    yearLabel: "Class year",
    lines: ["grandparent", "class", "number", "custom"],
    yearRange: "upcoming",
  }),
  buyer({
    id: "alum",
    chip: "I went here",
    nameLabel: BANNER_NAME_LABEL,
    namePlaceholder: "e.g. ALUMNI or #7",
    activityLabel: "What you did",
    yearLabel: "Class year",
    lines: ["alum", "class", "number", "custom"],
    yearRange: "past",
  }),
  buyer({
    id: "staff",
    chip: "I work here",
    nameLabel: BANNER_NAME_LABEL,
    namePlaceholder: "e.g. COACH",
    activityLabel: "What you coach or teach",
    yearLabel: null,
    // No class year. FACULTY & STAFF by default, or their own words (COACH).
    lines: ["staff", "custom"],
    yearRange: "upcoming",
  }),
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
