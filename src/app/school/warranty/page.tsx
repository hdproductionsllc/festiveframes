import { MsfPageShell, msfMetadata } from "@/components/school/MsfPageShell";
import { MSF_LEGAL_UPDATED, MSF_WARRANTY, MSF_WARRANTY_PATH } from "@/content/msf-pages";
import { SCHOOL_CONTACT_EMAIL } from "@/content/school-contact";

// The MySchoolFrame one-year warranty, on MySchoolFrame's own page. The words are
// `MSF_WARRANTY` (content/msf-pages.ts); the landing FAQ, the confirmation email
// and the thanks page all link here by `MSF_WARRANTY_PATH`.
//
// LEGAL NOTE: a plain-language starting point, not legal advice. For counsel to
// review before SCHOOL_CHECKOUT_OPEN flips.

export const metadata = msfMetadata({
  title: "One-year warranty",
  description:
    "Every MySchoolFrame school license plate frame is covered for one year from delivery: what it covers, what it doesn't, and how to make a claim.",
  path: MSF_WARRANTY_PATH,
});

export default function MsfWarrantyPage() {
  return (
    <MsfPageShell title={MSF_WARRANTY.heading} updated={MSF_LEGAL_UPDATED}>
      <p>{MSF_WARRANTY.term}</p>
      <div className="msf-doc-card">
        <h2>What it covers</h2>
        <p>{MSF_WARRANTY.covers}</p>
      </div>
      <div className="msf-doc-card">
        <h2>What it doesn&apos;t cover</h2>
        <p>{MSF_WARRANTY.excludes}</p>
      </div>
      <h2>How to make a claim</h2>
      <p>
        {MSF_WARRANTY.claimLead}{" "}
        <a href={`mailto:${SCHOOL_CONTACT_EMAIL}?subject=${encodeURIComponent(MSF_WARRANTY.claimSubject)}`}>
          {SCHOOL_CONTACT_EMAIL}
        </a>{" "}
        {MSF_WARRANTY.claimRest}
      </p>
    </MsfPageShell>
  );
}
