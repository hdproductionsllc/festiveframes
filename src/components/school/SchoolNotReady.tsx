import Image from "next/image";
import Link from "next/link";
import "@/app/school/school-landing.css";
import "./find-my-school.css";
import { RequestSchoolForm } from "./RequestSchoolForm";

// ─── /s/<slug> for a school we are not building yet ─────────────────────────
//
// During the pilot only six schools get a builder (see `isBuilderOpen` in
// data/school-pilot.ts). Every other school is still REACHABLE — an old link, a
// typed URL, a roster school's derived slug — and used to open a working builder
// in its own name, with "a donation goes back to the school" underneath. That is a
// relationship we do not have. This says so, and turns the visit into the one
// useful thing it can be: a request, prefilled with what we already know.
//
// Deliberately plain, on the landing page's own bands, and with no frame on it:
// a mockup in the school's name is exactly the claim this page exists not to make.

export function SchoolNotReady({
  schoolName,
  city,
  state,
}: {
  schoolName: string;
  /** Town only ("Kirkwood"), for the request form's prefill. */
  city: string;
  /** Two-letter postal code, or "" when unknown. */
  state: string;
}) {
  return (
    <main className="msf msf-not-ready">
      <section className="msf-band msf-band-navy">
        <p className="msf-brand">
          {/* The same reversed lockup as /school and /raised, so this is not the
              one MySchoolFrame surface that looks unfinished. */}
          <Image
            src="/brand/msf-logo-reverse.png"
            alt="MySchoolFrame"
            width={800}
            height={410}
            priority
            sizes="(max-width: 480px) 62vw, 280px"
            style={{ width: "min(280px, 62vw)", height: "auto" }}
          />
        </p>
        <h1>We&apos;re not ready for {schoolName} yet</h1>
        {/* The ask itself is the form's own lede, directly under this — saying
            it here as well read as the page repeating itself. */}
        <p className="msf-lede">
          We&apos;re starting with a handful of St.&nbsp;Louis-area schools.
        </p>
        <RequestSchoolForm schoolName={schoolName} city={city} state={state} tone="dark" />
      </section>
      <section className="msf-band msf-band-paper">
        <p className="msf-lede">Is your student at one of the pilot schools?</p>
        <div className="msf-ctas">
          <Link href="/school#find-my-school" className="msf-btn msf-btn-primary">
            See the pilot schools
          </Link>
        </div>
      </section>
    </main>
  );
}
