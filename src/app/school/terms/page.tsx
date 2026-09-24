import { MsfPageShell, msfMetadata } from "@/components/school/MsfPageShell";
import { MSF_LEGAL_UPDATED, MSF_PRIVACY_PATH, MSF_TERMS_PATH, MSF_WARRANTY_PATH } from "@/content/msf-pages";
import { SCHOOL_CONTACT_EMAIL } from "@/content/school-contact";
import { ARTWORK_TAKEDOWN_EMAIL, UPLOAD_RIGHTS_TERMS } from "@/content/upload-rights";

// MySchoolFrame's Terms of Service. The uploaded-artwork section is
// `UPLOAD_RIGHTS_TERMS` (content/upload-rights.ts) — the same deal the builder's
// upload gate collects, rendered from the same constant, never re-typed here.
//
// LEGAL NOTE: plain-language terms written to match what the product does today.
// A starting template, not legal advice: the owner should have counsel review
// them before SCHOOL_CHECKOUT_OPEN flips (see CLAUDE.md, "Uploaded artwork").

export const metadata = msfMetadata({
  title: "Terms of Service",
  description:
    "The terms for using the MySchoolFrame builder and ordering a custom school license plate frame, including who holds the rights to artwork you upload.",
  path: MSF_TERMS_PATH,
});

export default function MsfTermsPage() {
  return (
    <MsfPageShell title="Terms of Service" updated={MSF_LEGAL_UPDATED}>
      <p>
        These terms cover your use of the MySchoolFrame website and builder, and
        any school license plate frame you order from us. By using the site or
        sending us a design, you agree to them. If anything here is unclear,
        we&apos;d be glad to explain; our address is at the end.
      </p>

      <h2>What we make</h2>
      <p>
        MySchoolFrame makes custom license plate frames in a school&apos;s colors,
        designed by you in our online builder and printed to order in St.&nbsp;Louis.
        We try to show every frame as accurately as we can, but colors and finishes
        can look slightly different on a screen than on the printed part.
      </p>

      <h2>Designing and sending a design</h2>
      <p>
        Designing a frame is free. Sending us a design is not an order and does
        not commit you to anything: a person on our team reviews it and replies,
        and nothing is printed or charged until you&apos;ve seen the design and
        said yes.
      </p>

      <h2>Orders and payment</h2>
      <p>
        When you order, payment is processed by Stripe, our payment processor, and
        prices are in U.S. dollars. We may decline an order, for example one we
        can&apos;t produce or one placed in error, and if we do, we&apos;ll refund
        anything you were charged. We may correct a pricing error and cancel the
        affected order with a refund.
      </p>

      <h2>Shipping</h2>
      <p>
        We ship to the U.S. address you give us. Delivery times are estimates.
        Please check your address carefully, since a frame is made for one order
        and we can&apos;t be responsible for one sent to an address that was
        entered incorrectly.
      </p>

      <h2>Warranty, damage and mistakes</h2>
      <p>
        Every school frame carries our{" "}
        <a href={MSF_WARRANTY_PATH}>one-year warranty</a>. If your frame arrives
        damaged, or isn&apos;t the design you approved, write to us and
        we&apos;ll make it right.
      </p>

      <h2>Fit and your state&apos;s rules</h2>
      <p>
        The frame fits a standard 12 x 6 inch U.S. plate, but it is larger than a
        dealer frame, so it may not suit a tight plate recess. States regulate
        what a frame may cover on a plate, such as the state name or registration
        stickers. Please check your state&apos;s rule before you mount it.
      </p>

      {/* The PROSE is content/upload-rights.ts, the same constant the upload gate
          renders, so the deal a parent agrees to and the deal described here are
          the same words by construction. */}
      <h2>{UPLOAD_RIGHTS_TERMS.heading}</h2>
      {UPLOAD_RIGHTS_TERMS.paragraphs.map((para) => (
        <p key={para}>{para}</p>
      ))}
      <p>
        {UPLOAD_RIGHTS_TERMS.takedown}{" "}
        <a href={`mailto:${ARTWORK_TAKEDOWN_EMAIL}`}>{ARTWORK_TAKEDOWN_EMAIL}</a>.
      </p>

      <h2>Using the site</h2>
      <p>
        Please use the site only for lawful purposes and don&apos;t interfere with
        how it works. The site&apos;s own text, images, badge artwork and logos
        belong to MySchoolFrame or its licensors. School names, colors and marks
        belong to their schools; we only add a school&apos;s own logos and
        mascot art to our builder with that school&apos;s written permission.
      </p>

      <h2>Limits</h2>
      <p>
        Apart from our warranty, the site and our frames are provided as they are,
        to the extent the law allows. We can&apos;t promise the site will always
        be available or free of errors. To the extent the law allows, our total
        liability for any claim about a frame is limited to what you paid for it.
      </p>

      <h2>Your information</h2>
      <p>
        How we handle what you send us is in our{" "}
        <a href={MSF_PRIVACY_PATH}>privacy policy</a>.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms as the business or the law changes. When we do,
        we&apos;ll change the date at the top of this page.
      </p>

      <h2>Contact us</h2>
      <p>
        Questions about these terms? Write to us at{" "}
        <a href={`mailto:${SCHOOL_CONTACT_EMAIL}`}>{SCHOOL_CONTACT_EMAIL}</a>.
      </p>
    </MsfPageShell>
  );
}
