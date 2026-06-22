import type { Metadata } from "next";
import { copy } from "@/content/copy";
import { SITE_URL } from "@/config/season";
import { Countdown } from "@/components/site/buy/Countdown";
import { Hero } from "@/components/site/home/Hero";
import { WhatItIs } from "@/components/site/home/WhatItIs";
import { KitShowcase } from "@/components/site/home/KitShowcase";
import { OfferBlock } from "@/components/site/buy/OfferBlock";
import { CustomerReviews } from "@/components/site/home/CustomerReviews";
import { DesignShowcase } from "@/components/site/home/DesignShowcase";
import { HowItWorks } from "@/components/site/home/HowItWorks";
import { Gallery } from "@/components/site/home/Gallery";
import { WhyWeMadeIt } from "@/components/site/home/WhyWeMadeIt";
import { TrustSection } from "@/components/site/home/TrustSection";
import { HomeFaq } from "@/components/site/home/HomeFaq";
import { Testimonials } from "@/components/site/home/Testimonials";
import { SeoContent } from "@/components/site/home/SeoContent";
import { CtaEmail } from "@/components/site/home/CtaEmail";

// PRESERVED ORIGINAL HOMEPAGE (the "Americana" navy/cream design).
// Kept at /classic so the previous design stays viewable and recoverable after
// the sticker redesign took over "/". It reuses the (site) layout's navy chrome
// and the original section components, completely untouched. Marked noindex so
// it never competes with the live homepage in search. Also preserved at the git
// tag `pre-redesign-classic`. To restore it as the homepage, move this file's
// body back to (home)/page.tsx (or delete the (home) group).

export const metadata: Metadata = {
  title: `${copy.home.metaTitle} (Classic)`,
  description: copy.home.metaDescription,
  alternates: { canonical: `${SITE_URL}/classic` },
  robots: { index: false, follow: false },
};

export default function ClassicHomePage() {
  return (
    <>
      <Countdown />
      <Hero />
      <TrustSection />
      <WhatItIs />
      <KitShowcase />
      <div id="get-yours" className="scroll-mt-24">
        <OfferBlock />
      </div>
      <CustomerReviews />
      <DesignShowcase />
      <HowItWorks />
      <Gallery />
      <WhyWeMadeIt />
      <Testimonials />
      <SeoContent />
      <HomeFaq />
      <CtaEmail />
    </>
  );
}
