import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "@/app/school/school-landing.css";
import { SITE_URL } from "@/config/season";
import { SCHOOL_CONTACT_EMAIL } from "@/content/school-contact";
import { MSF_PRIVACY_PATH, MSF_TERMS_PATH, MSF_WARRANTY_PATH } from "@/content/msf-pages";

// ─── The chrome every plain MySchoolFrame page wears ─────────────────────────
//
// The warranty, terms, privacy, order-confirmation and not-found pages. Each one
// used to be either missing or a Festive Frames page with the holiday header,
// footer, inbox and tab title. A parent who came in through a school QR code
// should never be handed to the other brand, so these pages share one shell: the
// MySchoolFrame logo on navy, the page, and a footer with Bill's address and the
// three policy links. `school-no-festive.test.ts` renders them and fails on
// either brand name of the holiday product.

/**
 * Metadata for a MySchoolFrame page. `absolute` opts out of the root layout's
 * "| Festive Frames" title template, and siteName replaces its brand entity — the
 * two things every MySchoolFrame route has had to remember separately.
 */
export function msfMetadata({
  title,
  description,
  path,
  index = true,
}: {
  title: string;
  description: string;
  /** The page's own path, for the canonical URL. */
  path: string;
  /** Order and not-found pages are never indexed. */
  index?: boolean;
}): Metadata {
  const full = `${title} | MySchoolFrame`;
  return {
    title: { absolute: full },
    description,
    alternates: { canonical: `${SITE_URL}${path}` },
    openGraph: { siteName: "MySchoolFrame", title: full, description },
    twitter: { title: full, description },
    ...(index ? {} : { robots: { index: false, follow: false } }),
  };
}

export function MsfPageShell({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow?: string;
  title: string;
  /** "Updated September 2026" line under the title, for policy pages. */
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="msf msf-doc">
      <header className="msf-doc-head">
        <Link href="/school" className="msf-brand" aria-label="MySchoolFrame home">
          <Image
            src="/brand/msf-logo-reverse.png"
            alt="MySchoolFrame"
            width={800}
            height={410}
            priority
            sizes="180px"
            style={{ width: "min(180px, 48vw)", height: "auto" }}
          />
        </Link>
        {eyebrow && <p className="msf-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {updated && <p className="msf-doc-updated">Updated {updated}</p>}
      </header>
      <article className="msf-doc-body">{children}</article>
      <footer className="msf-doc-foot">
        <nav aria-label="MySchoolFrame policies">
          <Link href="/school">Home</Link>
          <Link href={MSF_WARRANTY_PATH}>Warranty</Link>
          <Link href={MSF_TERMS_PATH}>Terms</Link>
          <Link href={MSF_PRIVACY_PATH}>Privacy</Link>
        </nav>
        <p>
          MySchoolFrame is made in St.&nbsp;Louis ·{" "}
          <a href={`mailto:${SCHOOL_CONTACT_EMAIL}`}>{SCHOOL_CONTACT_EMAIL}</a>
        </p>
      </footer>
    </main>
  );
}
