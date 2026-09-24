// ─── MySchoolFrame's own pages: where they live, and the warranty's words ────
//
// One deployment sells two products, and until this file the school product's
// warranty, terms and privacy lived only inside the holiday product's pages —
// a MySchoolFrame parent following "one-year warranty" from their confirmation
// email landed on a page titled "Returns & Refunds | Festive Frames" that opened
// with "We want you to love your Festive Frames kit".
//
// So MySchoolFrame has its own pages under /school (MySchoolFrame chrome, no
// holiday header or footer), and every link to them is built from the paths
// below: the landing FAQ, the confirmation email, the thanks page, the footer.
// Change a path here and every link follows.
//
// No imports on purpose. The builder's client bundle reads these paths, and a
// dependency here would ride into every /s/<slug> page.

/** The one-year warranty, on its own MySchoolFrame page. */
export const MSF_WARRANTY_PATH = "/school/warranty";
/** MySchoolFrame's terms (includes the uploaded-artwork promise). */
export const MSF_TERMS_PATH = "/school/terms";
/** MySchoolFrame's privacy policy (what the send sheet collects, and why). */
export const MSF_PRIVACY_PATH = "/school/privacy";
/** Where Stripe returns a parent after a school-frame checkout. */
export const MSF_THANKS_PATH = "/school/thanks";

/**
 * THE honest limit on sending a design, in one sentence every surface reads.
 *
 * Sending does not print anything: a person replies, and nothing is made until
 * the parent has seen the design and agreed. /school said "until you SEND it" in
 * four places while the send sheet, the graduate card and the builder said
 * "until you APPROVE it" — the send version was the untrue one.
 */
export const NOTHING_PRINTS_UNTIL_YES = "Nothing prints until you've seen it and said yes.";

/** When the MySchoolFrame legal pages last changed in meaning. Shown on each. */
export const MSF_LEGAL_UPDATED = "September 2026";

/**
 * The warranty itself (owner decision 2026-09-23: one year). The warranty page
 * renders it in full; the holiday /returns page only points here, so there is one
 * statement of the promise.
 *
 * A plain-language starting point, not legal advice — for counsel to review
 * before `SCHOOL_CHECKOUT_OPEN` flips, alongside the terms.
 */
export const MSF_WARRANTY = {
  heading: "Our one-year warranty",
  term: "Every MySchoolFrame school frame is covered for one year from the date it is delivered.",
  covers:
    "Defects in the frame's materials or printing that show up in normal use on a car: artwork that fades, peels or cracks, or a frame that cracks or breaks without being struck.",
  excludes:
    "Damage from an accident, theft or vandalism, or a frame that has been cut, drilled or otherwise altered.",
  /** Completed by the contact address, as a mailto, at the call site. */
  claimLead: "Email",
  claimRest:
    "with your order number and a photo of the problem. If it's covered, we'll reprint your design and send you a replacement at no cost.",
  claimSubject: "MySchoolFrame warranty claim",
} as const;
