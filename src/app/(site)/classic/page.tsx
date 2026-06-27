import { notFound } from "next/navigation";

// The original "Americana" homepage used to live here at /classic as a viewable
// archive after the sticker redesign took over "/". It rendered CustomerReviews,
// which serves placeholder 5-star reviews + an aggregate rating — fine as a
// private archive, but a public route serving fabricated reviews is an FTC
// fake-reviews exposure. So the public route is RETIRED (returns 404). The full
// original design is preserved in git at the tag `pre-redesign-classic`; restore
// it from there (or move its body back into (home)/page.tsx) if ever needed.
export default function ClassicHomePage() {
  notFound();
}
