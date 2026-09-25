import { MsfPageShell, msfMetadata } from "@/components/school/MsfPageShell";
import { MSF_LEGAL_UPDATED, MSF_PRIVACY_PATH, MSF_TERMS_PATH } from "@/content/msf-pages";
import { SCHOOL_CONTACT_EMAIL } from "@/content/school-contact";

// MySchoolFrame's privacy policy, written against what the school product
// actually collects today (2026-09-23): the send sheet (email required, phone
// optional, who the frame is for, the design and any photo in it), the "we don't
// have my school" request (school, city, optional email), Stripe at checkout, and
// the design saved in the parent's own browser. No analytics run on the school
// pages. If any of that changes, this page changes with it.
//
// 2026-09-25: a sent design is now SAVED (lib/school-designs) and reopenable from
// the parent's private link, kept 18 months after its last change; and a parent
// may tick "Email me a link", the one automatic email to them (lib/email-msf).
//
// LEGAL NOTE: a plain-language starting point, not legal advice. For counsel to
// review before SCHOOL_CHECKOUT_OPEN flips.

export const metadata = msfMetadata({
  title: "Privacy Policy",
  description:
    "What MySchoolFrame collects when you design a school license plate frame, send us a design or place an order, how we use it, and the choices you have.",
  path: MSF_PRIVACY_PATH,
});

export default function MsfPrivacyPage() {
  return (
    <MsfPageShell title="Privacy Policy" updated={MSF_LEGAL_UPDATED}>
      <p>
        MySchoolFrame makes custom school license plate frames. This page explains
        what we collect when you use our builder, send us a design or place an
        order, what we do with it, and the choices you have. We&apos;ve tried to
        keep it short and plain.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>When you send us a design:</strong> your email address, your
          phone number if you choose to give it, who the frame is for, and the
          design itself, including any photo you&apos;ve put on it. These go to our
          team so a person can reply to you about that design. We also save the
          design, so you can open it again from your private link on any device
          and we both know exactly which version we&apos;re talking about. Anyone
          you share that link with can open and change the design.
        </li>
        <li>
          <strong>When you ask us to add your school:</strong> the school&apos;s
          name and city, and your email address if you choose to give it, so we
          can write back.
        </li>
        <li>
          <strong>When you order:</strong> checkout and payment are handled by
          Stripe, which collects your name, shipping address, email and card
          details to process the order. We never see or store your full card
          number.
        </li>
        <li>
          <strong>Your design in progress:</strong> the builder saves your design
          in your own browser so it&apos;s still there when you come back. It stays
          on your device until you send it to us or order it.
        </li>
        <li>
          <strong>A school&apos;s website, if you paste one in:</strong> we read
          that site to pick up the school&apos;s colors, and may remember those
          colors for that school. That&apos;s about the school, not about you.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To reply to you about a design you sent, and to make and ship a frame you order.</li>
        <li>To answer questions you send us.</li>
        <li>To decide which schools to add next, from the requests we receive.</li>
      </ul>
      <p>
        We don&apos;t add you to a mailing list or newsletter, and we won&apos;t
        text you. The only emails our system sends you are about an order you
        placed, and the link to your saved design if you ask for it when you send
        one.
      </p>

      <h2>Who we share it with</h2>
      <p>
        We don&apos;t sell your information. We share it only with the services
        that help us run MySchoolFrame, and only so they can do that work:
      </p>
      <ul>
        <li><strong>Stripe</strong> processes payments and checkout.</li>
        <li><strong>Our email provider</strong> delivers designs to our team and order emails to you.</li>
        <li><strong>Railway</strong> hosts this website and the servers behind it.</li>
      </ul>
      <p>We may also share information when the law requires it.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep order records for as long as we need them to make and support your
        frame and to meet our tax and legal obligations. We keep designs you send
        for 18 months after you last change them, which covers our one-year
        warranty, and then delete them. We keep school requests while they&apos;re
        useful for replying to you. You&apos;re welcome to ask us to delete any of
        it sooner.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask us what we hold about you and ask us to delete it, apart from
        records the law requires us to keep. You can also clear the design saved in
        your browser at any time through your browser&apos;s settings.
      </p>

      <h2>Students and children</h2>
      <p>
        Our builder is meant for parents, family, alumni and staff. We don&apos;t
        knowingly collect personal information from children under 13; if you
        think a child has sent us information, please tell us and we&apos;ll delete
        it. A student&apos;s name on a frame is always optional.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If our practices change, we&apos;ll update this page and the date at the
        top. Our <a href={MSF_TERMS_PATH}>terms</a> cover the rest of how the site
        works.
      </p>

      <h2>Contact us</h2>
      <p>
        Questions about your information? Write to us at{" "}
        <a href={`mailto:${SCHOOL_CONTACT_EMAIL}`}>{SCHOOL_CONTACT_EMAIL}</a>.
      </p>
    </MsfPageShell>
  );
}
