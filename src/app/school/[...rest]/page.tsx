import { notFound } from "next/navigation";

// Any unknown /school/... path. Without this, Next answers an unmatched URL with
// the ROOT 404 (the holiday product's), because a segment's not-found.tsx only
// catches notFound() thrown inside it. Routing the rest of /school here lands
// those URLs on MySchoolFrame's own 404 (school/not-found.tsx).
export default function UnknownSchoolPath(): never {
  notFound();
}
