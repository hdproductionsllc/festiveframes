// ─── Uploaded artwork: one statement of the rule ─────────────────────────────
//
// A parent uploads their school's mascot and we print it on a physical part. Who
// holds the right to that mark is the question this file answers, and it answers
// it in ONE place because three places is how legal copy and the thing it
// describes drift apart.
//
// Read by:
//   • the upload gate (`components/designer/UploadRightsGate.tsx`) — the words a
//     parent actually agrees to, before the first upload on a design;
//   • the terms page (`app/(site)/terms`) — the same promise, in context;
//   • the order record — `UPLOAD_RIGHTS_VERSION` rides into Stripe metadata, so a
//     stored attestation says WHICH words were agreed to, not merely that a box
//     was ticked.
//
// WHAT THIS DOES AND DOES NOT DO. It puts responsibility for uploaded marks on
// the uploader, which is what every print-on-demand shop in this market does and
// is a fair description of who actually knows whether they have permission. It
// does NOT make us untouchable: a school that objects writes to the company that
// printed the frame, not to the parent. That is why `ARTWORK_TAKEDOWN_EMAIL`
// exists and is published — a door that is easy to find is the other half of
// this, and the half that resolves complaints without lawyers.

import { copy } from "./copy";

/**
 * The version of the attestation text below.
 *
 * Bump it whenever the WORDING of `UPLOAD_RIGHTS` changes in a way that changes
 * what is being agreed to (not for a typo). Orders carry the version they were
 * placed under, so an old order is never retroactively said to have agreed to
 * words that did not exist yet. Date-shaped because the question a record has to
 * answer later is "what did it say then".
 */
export const UPLOAD_RIGHTS_VERSION = "2026-09-13";

/**
 * Where a school, club or rights holder asks us to take artwork down.
 *
 * Derived from the site's own support address rather than typed here, so there is
 * one mailbox to keep alive instead of two. If takedown ever needs its own
 * address, change it HERE and every surface follows.
 */
export const ARTWORK_TAKEDOWN_EMAIL = copy.thanks.supportEmail;

/**
 * The attestation, as a parent reads it.
 *
 * Plain words on purpose. "You warrant that you possess all necessary rights" is
 * what a lawyer writes and what nobody reads; a parent ticking a box they did not
 * understand is a weaker record than one who did, not a stronger one.
 */
export const UPLOAD_RIGHTS = {
  /** Sheet title. */
  title: "Your artwork, your call",

  /** The two lines above the checkbox. Short: this is a phone. */
  body: [
    "Upload anything you have the right to use — your own photos, your student's art, or a logo you have permission to print.",
    "School logos, mascots and team marks usually belong to the school. If you are not sure you can use one, ask them first.",
  ],

  /** The checkbox label. This is the sentence being agreed to. */
  checkbox:
    "I have the right to use this artwork, and I'm responsible for what I upload.",

  /** The confirm button. */
  confirm: "Got it — continue",

  /** The cancel button. */
  cancel: "Cancel",

  /** One line under the crop modal's confirm, after the gate has been accepted. */
  reminder: "Your artwork — you confirmed you have the right to use it.",

  /** The line that tells a rights holder where to write, used on the gate and in
   *  the terms. Completed by `ARTWORK_TAKEDOWN_EMAIL` at the call site so the
   *  address is a real mailto and never a string typed into prose. */
  takedownLead: "A school or rights holder can ask us to remove artwork at",
} as const;

/**
 * The terms page's "Your artwork and content" section, as structured prose.
 *
 * It lives here beside the attestation for one reason: the gate and the terms
 * must describe the SAME deal. Keeping them in one file makes a change to one an
 * obvious prompt to check the other, and `upload-rights.test.ts` asserts the
 * terms section actually renders the same promise the gate collects.
 */
export const UPLOAD_RIGHTS_TERMS = {
  heading: "Your artwork and content",
  paragraphs: [
    "You can upload photos, artwork and logos to put on your frame. What you upload stays yours. You give us permission to use it only to do the job you asked for: to show you a preview, to produce your frame, and to keep a copy of your order.",
    "When you upload something, you confirm you have the right to use it. School logos, mascots, team names and other marks usually belong to the school or its licensor, and permission to use them is between you and them. We do not grant that permission and we cannot check it for you.",
    "We may decline to print artwork. If something looks like it infringes someone's rights, or is unlawful or offensive, we will refuse the order and refund it rather than produce it.",
    "Artwork you upload is used on your frame only. We do not add it to our own library or put it on anyone else's frame.",
  ],
  /** Completed by `ARTWORK_TAKEDOWN_EMAIL`, as a mailto. */
  takedown:
    "If you are a school or a rights holder and a frame uses artwork you own, write to us and we will take it down and stop producing it. Tell us what the artwork is and where you saw it:",
} as const;
