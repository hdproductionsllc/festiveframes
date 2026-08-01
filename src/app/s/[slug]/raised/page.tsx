import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../../../lab/school/school-skin.css";
import "../../../school/school-landing.css";
import { allSchoolKits, getSchoolKit } from "@/data/school-kits";
import { schoolTotals } from "@/lib/order/school-ledger";

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
  return allSchoolKits().map((k) => ({ slug: k.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const kit = getSchoolKit(slug);
  if (!kit) return { title: "MySchoolFrame" };
  return {
    title: `${kit.shortName} fundraiser — MySchoolFrame`,
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
  const kit = getSchoolKit(slug);
  if (!kit) notFound();

  const t = await schoolTotals(slug);
  const started = when(t.firstAt);
  const last = when(t.lastAt);

  return (
    <main className="msf msf-raised">
      <section className="msf-band msf-band-navy">
        <p className="msf-brand">MySchoolFrame</p>
        <h1>{kit.shortName} {kit.mascot}</h1>
        <p className="msf-lede">Fundraiser to date</p>

        <p className="msf-raised-figure">{money(t.raisedCents)}</p>
        <p className="msf-raised-sub">
          from {t.frames} {t.frames === 1 ? "frame" : "frames"}
          {started ? ` since ${started}` : ""}
        </p>

        {t.frames === 0 ? (
          <p className="msf-lede msf-raised-empty">
            Nothing yet. This page fills in the moment the first parent orders,
            and the figure is the real one: every frame carrying{" "}
            {kit.shortName} adds a set donation to it automatically, with nothing
            for the club to submit or reconcile.
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
            frame, not a percentage of profit after costs. Multiply the frame
            count and you get the total; there is no other arithmetic.
          </li>
          <li>
            <strong>Nothing to reconcile.</strong> No order forms to collect, no
            envelopes to count, no inventory to settle up. The club does not
            submit anything to make this number move.
          </li>
          <li>
            <strong>You get it in writing every month.</strong> We send this
            figure to your club by email at the start of each month, along with
            the payout for the period.
          </li>
        </ul>
        <div className="msf-ctas">
          <Link href={`/s/${kit.slug}`} className="msf-btn msf-btn-primary">
            See the {kit.shortName} frame
          </Link>
          <a
            className="msf-btn msf-btn-brass"
            href={`mailto:hello@festiveframes.co?subject=${encodeURIComponent(
              `${kit.shortName} fundraiser — question`,
            )}`}
          >
            Ask us anything
          </a>
        </div>
        <p className="msf-fineprint">
          Figures update as orders are paid. Questions about a specific order go
          to <a href="mailto:hello@festiveframes.co">hello@festiveframes.co</a>.
        </p>
      </section>
    </main>
  );
}
