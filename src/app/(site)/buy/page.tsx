import type { Metadata } from "next";
import { copy } from "@/content/copy";
import { getKit } from "@/config/kits";
import { Countdown } from "@/components/site/buy/Countdown";
import { FoundingScarcity } from "@/components/site/FoundingScarcity";
import { BuyHero } from "@/components/site/buy/BuyHero";
import { KitPicker } from "@/components/site/buy/KitPicker";
import { OfferBlock } from "@/components/site/buy/OfferBlock";
import { StickyBuyBar } from "@/components/site/buy/StickyBuyBar";
import {
  WhatsInKit,
  HowItWorks,
  BuiltToLast,
  BuyFaq,
} from "@/components/site/buy/StaticSections";

// The revenue page at "/buy". Server-component shell; all interactive state
// lives in small "use client" islands. The (site) layout supplies the header,
// footer, <main>, and the marketing theme, so this file renders sections only.
//
// noindex,follow: this conversion page should not be indexed, but links on it
// should still be followed.
export const metadata: Metadata = {
  title: copy.buy.metaTitle,
  description: copy.buy.metaDescription,
  robots: { index: false, follow: true },
  openGraph: {
    type: "website",
    title: copy.buy.metaTitle,
    description: copy.buy.metaDescription,
    siteName: copy.site.brandName,
    // Image comes from the file-convention OG image, resolved absolutely via
    // metadataBase in the root layout.
  },
  twitter: {
    card: "summary_large_image",
    title: copy.buy.metaTitle,
    description: copy.buy.metaDescription,
  },
};

// A page that builds a checkout body must not be statically pre-rendered with a
// guessed kit; resolve the validated ?kit= on the server and hand it to the
// hero island, which finishes hydration (localStorage fallback) on the client.
export default async function BuyPage({
  searchParams,
}: {
  searchParams: Promise<{ kit?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.kit) ? params.kit[0] : params.kit;
  const kit = raw ? getKit(raw) : undefined;
  const initialKit = kit?.active ? kit.id : null;

  return (
    <>
      <Countdown />
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <FoundingScarcity center />
      </div>
      <BuyHero initialKit={initialKit} />
      <KitPicker />
      <OfferBlock />
      <WhatsInKit />
      <HowItWorks />
      <BuiltToLast />
      <BuyFaq />
      {/* Spacer so the fixed mobile buy bar never overlaps the footer/FAQ. */}
      <div aria-hidden="true" className="h-20 lg:hidden" />
      <StickyBuyBar />
    </>
  );
}
