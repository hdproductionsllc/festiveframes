import Link from "next/link";
import { MsfPageShell, msfMetadata } from "@/components/school/MsfPageShell";

// The 404 for every MySchoolFrame path (/s/<slug>, /school/...). A mistyped QR
// slug used to fall through to the root 404, which carries the holiday product's
// favicon, share-card name and a "Design your frame" button into /build. This one
// stays in MySchoolFrame and points back at the school finder.

export const msfNotFoundMetadata = msfMetadata({
  title: "Page not found",
  description: "We couldn't find that MySchoolFrame page.",
  path: "/school",
  index: false,
});

export function MsfNotFound() {
  return (
    <MsfPageShell title="We couldn't find that page">
      <p>
        The link may have a typo in it, or the page may have moved. If you were
        looking for your school&apos;s frame, you&apos;re welcome to find it from
        the list of schools.
      </p>
      <div className="msf-ctas">
        <Link href="/school#find-my-school" className="msf-btn msf-btn-primary">
          Find your school
        </Link>
      </div>
    </MsfPageShell>
  );
}
