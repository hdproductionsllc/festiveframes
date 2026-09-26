import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../../../lab/school/school-skin.css";
import "../../../school/school-landing.css";
import { getSchoolKit, type SchoolKit } from "@/data/school-kits";
import { isBuilderOpen, pilotSchoolKits } from "@/data/school-pilot";
import { SCHOOL_CHECKOUT_OPEN } from "@/config/school-checkout";
import { SCHOOL_CONTACT_EMAIL } from "@/content/school-contact";
import { schoolTotals } from "@/lib/school-designs/orders";

// ─── The booster page: /s/<slug>/raised ──────────────────────────────────────
//
// The thing the product was missing, and it is not a pixel. Everything else we
// have built speaks to a PARENT. The person who says yes to a fundraiser is a
// booster president or an athletic director, and their product is not the frame,
// it is the fundraiser. Until this page existed there was no answer at all to the
// only question they ask: how do we know what we earned.
//
// Deliberately a plain page with one big number on it. A club treasurer needs a
// figure they can read into minutes, not a dashboard.
//
// NOT indexed and NOT linked from the parent-facing builder. The total is not
// secret — it is a thermometer, and a public one is motivating — but it is a
// club-facing page and should reach people through a link we hand them.

export const dynamic = "force-dynamic"; // a live figure, never a build-time one

export function generateStaticParams() {
  return pilotSchoolKits().map((k) => ({ slug: k.slug }));
}

/**
 * The kit this page may speak for, or null. Behind the SAME pilot gate as the
 * builder: "Fundraiser to date" and "money owed to <school>" is exactly the
 * relationship claim `SchoolNotReady` exists to avoid for a school we have not
 * spoken to, and a typed or old URL reached it.
 */
function raisedKit(slug: string): SchoolKit | null {
  const kit = getSchoolKit(slug);
  return kit && isBuilderOpen(kit.slug) ? kit : null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const kit = raisedKit(slug);
  if (!kit) return { title: { absolute: "MySchoolFrame" } };
  const title = `${kit.shortName} fundraiser — MySchoolFrame`;
  return {
    // `absolute` + siteName for the same reason as the builder page: the root
    // layout's brand is Festive Frames, and this is the page a booster board
    // reads. It was going out as "... — MySchoolFrame | Festive Frames".
    title: { absolute: title },
    openGraph: { siteName: "MySchoolFrame", title },
    robots: { index: false, follow: false },
  };
}

const money = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2 });

const when = (ms: number | null) =>
  ms === null ? null : new Date(ms).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default async function RaisedPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const kit = raisedKit(slug);
  if (!kit) notFound();

  const t = await schoolTotals(slug);
  const started = when(t.firstAt);
  const last = when(t.lastAt);

  return (
    <main className="msf msf-raised">
      <section className="msf-band msf-band-navy">
        <p className="msf-brand">
          {/* Reversed for the navy band, as on the /school hero. */}
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
        <h1>{kit.shortName} {kit.mascot}</h1>
        <p className="msf-lede">Fundraiser to date</p>

        <p className="msf-raised-figure">{money(t.raisedCents)}</p>
        <p className="msf-raised-sub">
          from {t.frames} {t.frames === 1 ? "frame" : "frames"}
          {started ? ` since ${started}` : ""}
        </p>

        {t.frames === 0 ? (
          // "Automatically" is only true of an order paid through checkout, which
          // is what the ledger records. While checkout is closed, orders are taken
          // by follow-up and never reach this figure, so the page says so.
          <p className="msf-lede msf-raised-empty">
            {SCHOOL_CHECKOUT_OPEN ? (
              <>
                Nothing yet. This page fills in the moment the first parent
                orders, and the figure is the real one: every frame carrying{" "}
                {kit.shortName} adds a set donation to it automatically, with
                nothing for the club to submit or reconcile.
              </>
            ) : (
              <>
                Nothing yet. During the pilot, parents send their design and we
                follow up to take the order, so those frames are not counted on
                this page. We send your club the total with every payout.
              </>
            )}
          </p>
        ) : (
          <ul className="msf-raised-grid">
            <li>
              <span className="msf-raised-n">{t.frames30d}</span>
              <span className="msf-raised-l">frames in the last 30 days</span>
            </li>
            <li>
              <span className="msf-raised-n">{money(t.raised30dCents)}</span>
              <span className="msf-raised-l">raised in the last 30 days</span>
            </li>
            {last ? (
              <li>
                <span className="msf-raised-n">{last}</span>
                <span className="msf-raised-l">most recent order</span>
              </li>
            ) : null}
          </ul>
        )}
      </section>

      <section className="msf-band msf-band-paper">
        <h2>How this number works</h2>
        <ul className="msf-booster">
          <li>
            <strong>It counts paid frames, not designs.</strong> A frame lands
            here when a parent has actually paid for it, so the figure is money
            owed to {kit.shortName}, not interest.
          </li>
          <li>
            <strong>A set amount per frame.</strong> A fixed figure from every
            frame, not a percentage of profit after costs. The total is simply
            the number of frames times that amount.
          </li>
          <li>
            <strong>Nothing to reconcile.</strong> No order forms to collect, no
            envelopes to count, no inventory to settle up. The club does not
            submit anything to make this number move.
          </li>
          <li>
            <strong>You get it in writing with each payout.</strong> We send
            your club the total with every payout
            {SCHOOL_CHECKOUT_OPEN
              ? ", so the figure here and the money you receive always match."
              : ". While ordering is by follow-up during the pilot, that written total is the one to go by: follow-up orders are not counted on this page."}
          </li>
        </ul>
        <div className="msf-ctas">
          <Link href={`/s/${kit.slug}`} className="msf-btn msf-btn-primary">
            See the {kit.shortName} frame
          </Link>
          <a
            className="msf-btn msf-btn-brass"
            href={`mailto:${SCHOOL_CONTACT_EMAIL}?subject=${encodeURIComponent(
              `${kit.shortName} fundraiser — question`,
            )}`}
          >
            Ask us anything
          </a>
        </div>
        <p className="msf-fineprint">
          Figures update as orders are paid. Questions about a specific order go
          to <a href={`mailto:${SCHOOL_CONTACT_EMAIL}`}>{SCHOOL_CONTACT_EMAIL}</a>.
        </p>
      </section>
    </main>
  );
}
