/**
 * The ONE address MySchoolFrame gives parents and schools: contact, warranty
 * claims, fundraiser enquiries, artwork takedowns. Every school surface reads this
 * instead of typing the address out.
 *
 * It is also the DEFAULT inbox for MySchoolFrame's internal mail (school orders,
 * send-sheet designs, "we don't have my school" requests) — see
 * `lib/email-msf.ts`, which reads it rather than re-typing it. Owner, 2026-09-23:
 * school mail goes to bill@myschoolframe.com, and no MySchoolFrame surface carries
 * the holiday product's domain (`school-no-festive.test.ts` holds that line).
 *
 * It is deliberately NOT derived from `copy.thanks.supportEmail`: that is the
 * Festive Frames holiday product's address and stays exactly as it is.
 */
export const SCHOOL_CONTACT_EMAIL = "bill@myschoolframe.com";
