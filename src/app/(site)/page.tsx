import type { Metadata } from "next";
import { copy } from "@/content/copy";
import { getKit, getActiveKits } from "@/config/kits";
import { offer } from "@/config/offers";
import { SITE_URL } from "@/config/season";
import { Hero } from "@/components/site/home/Hero";
import { WhatItIs } from "@/components/site/home/WhatItIs";
import { KitShowcase } from "@/components/site/home/KitShowcase";
import { HowItWorks } from "@/components/site/home/HowItWorks";
import { Gallery } from "@/components/site/home/Gallery";
import { TrustSection } from "@/components/site/home/TrustSection";
import { HomeFaq } from "@/components/site/home/HomeFaq";
import { CtaEmail } from "@/components/site/home/CtaEmail";

// Marketing homepage at "/". Server Component (no "use client"); the only
// client island is the email capture form deep inside <CtaEmail/>. The (site)
// layout supplies SiteHeader, SiteFooter, <main>, and the .marketing-theme
// background, so this file renders the page sections directly.

export const metadata: Metadata = {
  title: copy.home.metaTitle,
  description: copy.home.metaDescription,
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: copy.site.brandName,
    title: copy.home.metaTitle,
    description: copy.home.metaDescription,
    images: [`${SITE_URL}/opengraph-image`],
  },
  twitter: {
    card: "summary_large_image",
    title: copy.home.metaTitle,
    description: copy.home.metaDescription,
    images: [`${SITE_URL}/opengraph-image`],
  },
};

// Builds the JSON-LD graph for the homepage from config/copy so structured data
// never drifts from the rendered content. Includes Organization (St. Louis
// locality), Product (American Classic), FAQPage (the six FAQ items), an
// ItemList of the active kit catalog, and a BreadcrumbList.
function buildJsonLd() {
  const americanClassic = getKit("american-classic");
  const productPrice = ((americanClassic?.price ?? offer.singlePrice) / 100).toFixed(2);

  const organization = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: copy.site.brandName,
    url: SITE_URL,
    slogan: copy.site.tagline,
    address: {
      "@type": "PostalAddress",
      addressLocality: "St. Louis",
      addressRegion: "MO",
      addressCountry: "US",
    },
  };

  const product = {
    "@type": "Product",
    name: americanClassic?.name ?? "American Classic Kit",
    description: americanClassic?.identityLine,
    image: `${SITE_URL}/kits/american-classic-thumb.jpg`,
    brand: { "@type": "Brand", name: copy.site.brandName },
    offers: {
      "@type": "Offer",
      price: productPrice,
      priceCurrency: offer.currency.toUpperCase(),
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/buy?kit=american-classic`,
    },
  };

  const faqPage = {
    "@type": "FAQPage",
    mainEntity: copy.home.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  // The live catalog as an ordered list, each item linking to its /buy?kit=<id>
  // deep link. Sourced from the same getActiveKits() the storefront renders.
  const itemList = {
    "@type": "ItemList",
    name: `${copy.site.brandName} license plate frame kits`,
    itemListElement: getActiveKits().map((kit, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: kit.name,
      url: `${SITE_URL}/buy?kit=${kit.id}`,
    })),
  };

  const breadcrumbList = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Shop the Freedom Frame Set",
        item: `${SITE_URL}/buy`,
      },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [organization, product, faqPage, itemList, breadcrumbList],
  };
}

export default function HomePage() {
  const jsonLd = buildJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD is static, server-rendered, and built from trusted config.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <TrustSection />
      <WhatItIs />
      <KitShowcase />
      <HowItWorks />
      <Gallery />
      <HomeFaq />
      <CtaEmail />
    </>
  );
}
