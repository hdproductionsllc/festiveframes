import type { Metadata } from "next";
import { copy } from "@/content/copy";
import { getKit, getActiveKits } from "@/config/kits";
import { offer } from "@/config/offers";
import { SITE_URL } from "@/config/season";
import { Header } from "./_components/Header";
import { Countdown } from "./_components/Countdown";
import { Hero } from "./_components/Hero";
import { Marquee } from "./_components/Marquee";
import { Looks } from "./_components/Looks";
import { HowItWorks } from "./_components/HowItWorks";
import { WhyUs } from "./_components/WhyUs";
import { TheKit } from "./_components/TheKit";
import { CustomOrders } from "./_components/CustomOrders";
import { OurStory } from "./_components/OurStory";
import { Reviews } from "./_components/Reviews";
import { SeoContent } from "./_components/SeoContent";
import { Faq } from "./_components/Faq";
import { Footer } from "./_components/Footer";

// The live marketing homepage ("/") — the sticker redesign. Self-contained
// chrome (Header/Footer live inside the page), so the (home) route group does
// not use the navy (site) layout. The previous Americana homepage is preserved
// at /classic. SEO metadata + JSON-LD are carried over from the old page so the
// homepage keeps its canonical, Open Graph, and structured data unchanged.

export const metadata: Metadata = {
  // `absolute` so the exact SEO title renders without the root "| Festive Frames"
  // template suffix; the title already reads as a complete, brand-relevant phrase.
  title: { absolute: copy.home.metaTitle },
  description: copy.home.metaDescription,
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: copy.site.brandEntity,
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
// never drifts from the rendered content: Organization (St. Louis locality),
// Product (Freedom Frame Set), FAQPage, an ItemList of the active catalog, and a
// BreadcrumbList.
function buildJsonLd() {
  const americanClassic = getKit("american-classic");
  const productPrice = ((americanClassic?.price ?? offer.singlePrice) / 100).toFixed(2);

  const organization = {
    "@type": ["Organization", "OnlineStore"],
    "@id": `${SITE_URL}/#organization`,
    // Keep the recognizable brand as `name`; the locked entity string is the
    // alternateName so Google/AI disambiguate this brand from the unrelated UK
    // festiveframes.co.uk by pairing it with its product category.
    name: copy.site.brandName,
    alternateName: copy.site.brandEntity,
    url: SITE_URL,
    slogan: copy.site.tagline,
    description:
      "Festive Frames makes custom, personalized license plate frames you design yourself: pick a theme, snap on the tiles you want, and add your phrase. Every frame is made to order by hand in St. Louis, USA.",
    logo: `${SITE_URL}/brand/seal.png`,
    image: `${SITE_URL}/brand/seal.png`,
    areaServed: "US",
    address: {
      "@type": "PostalAddress",
      addressLocality: "St. Louis",
      addressRegion: "MO",
      addressCountry: "US",
    },
  };

  const website = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: copy.site.brandName,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  const product = {
    "@type": "Product",
    "@id": `${SITE_URL}/#product`,
    name: americanClassic?.name ?? "Freedom Frame Set",
    description:
      "Design your own custom patriotic license plate frame for America's 250th. Pick a theme, snap on the patriotic tiles you want, and add your own phrase. Made by hand to order in St. Louis, USA.",
    image: [`${SITE_URL}/redesign/looks/years250.png`, `${SITE_URL}/redesign/looks/sampler.png`],
    brand: { "@type": "Brand", name: copy.site.brandName },
    category: "License Plate Frames",
    offers: {
      "@type": "Offer",
      price: productPrice,
      priceCurrency: offer.currency.toUpperCase(),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      priceValidUntil: "2026-12-31",
      url: `${SITE_URL}/build`,
      seller: { "@id": `${SITE_URL}/#organization` },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: "5.00", currency: "USD" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "US",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 30,
      },
    },
    // No aggregateRating/review in structured data: Google requires these to
    // reflect genuine, collected reviews, which we don't yet surface as such.
  };

  const faqPage = {
    "@type": "FAQPage",
    mainEntity: copy.home.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  const itemList = {
    "@type": "ItemList",
    name: `${copy.site.brandName} license plate frame kits`,
    itemListElement: getActiveKits().map((kit, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: kit.name,
      url: `${SITE_URL}/build`,
    })),
  };

  const breadcrumbList = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Design your Freedom Frame", item: `${SITE_URL}/build` },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [organization, website, product, faqPage, itemList, breadcrumbList],
  };
}

export default async function HomePage() {
  const jsonLd = buildJsonLd();
  const year = new Date().getFullYear();

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD is static, server-rendered, and built from trusted config.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <Countdown />
      <main id="main" tabIndex={-1} className="flex-1">
        <Hero />
        <Marquee />
        <Looks />
        <HowItWorks />
        <WhyUs />
        <TheKit />
        <CustomOrders />
        <OurStory />
        <Reviews />
        <SeoContent />
        <Faq />
      </main>
      <Footer year={year} />
    </>
  );
}
