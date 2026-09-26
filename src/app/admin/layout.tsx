import type { Metadata } from "next";

// The staff dashboard: never indexed, never cached, never under the holiday
// brand's title template. Every page below checks the session itself
// (lib/admin/session `requireAdmin`); this layout only sets what they share.
export const metadata: Metadata = {
  title: { default: "Staff dashboard · MySchoolFrame", template: "%s · MySchoolFrame staff" },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
