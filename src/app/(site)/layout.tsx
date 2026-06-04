import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Marketing route group layout. Wraps "/", "/buy", and "/thanks" in the
// Americana navy/cream theme plus shared header and footer chrome.
// The builder at /build is OUTSIDE this group, so it keeps the dark workbench.
export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="marketing-theme flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
