// ─────────────────────────────────────────────────────────────
// Central marketing copy for the storefront (home + shared).
//
// COPY RULES enforced here:
//   - No em dashes anywhere. Use hyphen-with-spaces, commas, periods.
//   - No savings language (no "save $X", no percent off, no
//     strikethroughs, no compare-at prices).
//   - No hype words and no fake social proof.
//   - Unverified physical claims use soft wording + a TODO-VERIFY note.
//   - Value anchoring is completeness + permanence, never price cuts.
// ─────────────────────────────────────────────────────────────

export interface FaqItem {
  question: string;
  answer: string;
}

export interface HowItWorksStep {
  step: string;
}

/** A maker/artist quote. Honest, attributed - never a fake customer review. */
export interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

export interface SeoSection {
  heading: string;
  body: string;
}

/** Long-form, search-intent content block (SEO + answer-engine optimization). */
export interface SeoBlock {
  heading: string;
  intro: string;
  sections: SeoSection[];
}

/** Founding Edition scarcity copy (the cap number lives in config/founding.ts). */
export interface FoundingCopy {
  scarcityLine: string;
  cta: string;
}

/** Honest "why we built this" maker story (replaces fake customer reviews). */
export interface StoryCopy {
  heading: string;
  body: string;
  reasons: { title: string; body: string }[];
}

export interface HomeCopy {
  metaTitle: string;
  metaDescription: string;
  heroH1: string;
  heroSubhead: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  /** Three factual permanence/completeness bullets. */
  whatItIs: string[];
  /** Three install/use steps. */
  howItWorks: HowItWorksStep[];
  /** Local-production trust paragraph (soft material wording). */
  trust: string;
  /** Six homepage FAQ entries. */
  faq: FaqItem[];
  /** Email capture prompt copy. */
  emailCapturePrompt: string;
  /** Closing call-to-action heading. */
  ctaHeading: string;
  /** Long-form SEO/AIO content block. */
  seo: SeoBlock;
  /** Maker + artist testimonials (attributed, not customer reviews). */
  testimonials: Testimonial[];
  /** Founding Edition scarcity copy. */
  founding: FoundingCopy;
  /** "Why we built this" maker story. */
  story: StoryCopy;
  /** Real customer reviews (collected and verified by the team). */
  reviews: { rating: number; quote: string; name: string }[];
}

export interface SiteCopy {
  /** Recognizable brand name. Used as the JSON-LD Organization `name`. */
  brandName: string;
  /**
   * Locked brand entity string ("Festive Frames – Custom License Plate Frames").
   * Used for OG/Twitter siteName and the Organization alternateName so search
   * engines and AI resolve THIS brand rather than the unrelated UK
   * festiveframes.co.uk. Pairs the brand with its category unambiguously.
   */
  brandEntity: string;
  tagline: string;
}

export interface BuyCopy {
  metaTitle: string;
  /** Meta + Open Graph description for the /buy conversion page. */
  metaDescription: string;
  h1: string;
  subhead: string;
  /** One line shown under the primary CTA. */
  ctaSubline: string;
  /** Guarantee line shown under the buy buttons. */
  guarantee: string;
  /** "What's in every kit" completeness anchor. */
  whatsInKit: {
    heading: string;
    items: string[];
    caption: string;
  };
  /** "How it works" three-beat line. */
  howItWorks: { heading: string; line: string };
  /** "Built to last" durability block (plain-language material, UV-printed tiles). */
  builtToLast: { heading: string; body: string };
  /** Light trust strip (no fake reviews). */
  trust: { heading: string; caption: string };
  /** Offer block card copy. */
  offer: {
    single: { title: string; items: string[]; cta: string };
    bundle: { title: string; items: string[]; cta: string; mixLabel: string };
  };
  /** The five /buy FAQ entries (sourced from home FAQ where noted). */
  faq: FaqItem[];
  /** Friendly client-side checkout error (never leaks raw errors). */
  checkoutError: string;
}

/** Designer/builder page copy (/build). Metadata-focused: the page itself is
 *  the self-contained designer app, so this drives its title/description/OG. */
export interface BuildCopy {
  metaTitle: string;
  metaDescription: string;
}

/** Post-purchase confirmation page copy (/thanks). */
export interface ThanksCopy {
  metaTitle: string;
  metaDescription: string;
  /** Confirmed-order headline. */
  headline: string;
  /** Generic headline when no order can be read (graceful fallback). */
  genericHeadline: string;
  /** Generic supporting line for the fallback state. */
  genericBody: string;
  /** Shipping fulfillment block. */
  shipping: { heading: string; body: string };
  /** Future tile-drop tease (the ONLY place this lives). */
  tease: { heading: string; body: string };
  /** Email capture prompt for the tease section. */
  emailCapturePrompt: string;
  /** Social share prompt and payload. */
  share: { heading: string; body: string; shareText: string };
  /** Cross-link into the designer. */
  builderCta: { label: string; href: string };
}

export interface Copy {
  site: SiteCopy;
  home: HomeCopy;
  buy: BuyCopy;
  build: BuildCopy;
  thanks: ThanksCopy;
  /** Reusable brand anchor phrases for headings, badges, and CTAs. */
  anchorPhrases: string[];
}

export const copy: Copy = {
  site: {
    brandName: "Festive Frames",
    brandEntity: "Festive Frames – Custom License Plate Frames",
    tagline: "Design your own. Made by hand to order.",
  },

  home: {
    metaTitle:
      "Custom Patriotic License Plate Frames | America's 250th",
    metaDescription:
      "Design your own patriotic license plate frame for America's 250th. Snap-on stars, eagles & a custom phrase. $39, handmade in USA, ships fast. 30-day guarantee.",
    heroH1: "Design Your Own Custom Patriotic License Plate Frame",
    heroSubhead: "Pick a theme, add your tiles and phrase, made by hand to order.",
    primaryCta: { label: "Design your frame", href: "/build" },
    secondaryCta: { label: "See the themes", href: "/build" },

    whatItIs: [
      "You design your own frame: pick a theme, the tiles, and your phrase.",
      "The launch theme is the Fourth of July and America's 250th, with more coming.",
      "We hand-make every frame to order in the USA, then ship it fast.",
    ],

    howItWorks: [
      { step: "Pick a theme." },
      { step: "Design it: tiles plus your phrase." },
      { step: "We hand-make and ship it." },
    ],

    // Material described in plain language per product owner (the same hard
    // automotive plastics, deliberately NOT named). Tiles are UV printed, so
    // the colors-stay-bright claim is supported.
    trust:
      "Designed and made right here in St. Louis, USA. The frame and tiles are built tough and vetted for the real world: highway speeds, car washes, and the full swing of weather, from icy winters to summer heat, sun, and rain. The tiles are UV printed, so the colors stay bright. Built to last.",

    // The first six entries lead the homepage FAQ and feed the FAQPage JSON-LD
    // in (home)/page.tsx. Visible text MUST match the structured data exactly.
    faq: [
      {
        question: "What is an America's 250th license plate frame?",
        answer:
          "It's a patriotic license plate frame celebrating the United States' 250th anniversary (the semiquincentennial, 1776-2026). At Festive Frames you design your own with snap-on tiles like \"250,\" \"1776-2026,\" the flag, and a landing eagle, plus a custom phrase along the bottom.",
      },
      {
        question: "Can I personalize the license plate frame with my own text?",
        answer:
          "Yes. Every frame has a custom bottom bar where you type your own phrase - a name, a saying, a unit or branch, or a 4th of July message. You design the whole frame in our online builder before you order.",
      },
      {
        question: "How fast does it ship?",
        answer:
          "Each frame is made to order by hand, then ships fast - so it works even for last-minute 4th of July gifts. Order in time for your parade, party, or gift occasion.",
      },
      {
        question: "Where are Festive Frames made?",
        answer:
          "Every frame is handmade in the USA, in St. Louis, Missouri. Made-in-USA patriotic buyers can order with confidence.",
      },
      {
        question: "How much does a custom patriotic license plate frame cost?",
        answer:
          "$39 for a fully customized, made-to-order frame - a giftable price point under $40 that includes your choice of snap-on tiles and a custom bottom-bar phrase.",
      },
      {
        question: "Is this a good gift for a car guy, veteran, or dad?",
        answer:
          "Yes - it's a popular patriotic gift for car guys, car lovers, veterans, military families, and dads. It's customizable, made in the USA, ships fast, and backed by a 30-day guarantee.",
      },
      {
        question: "Will it fit my car?",
        answer:
          "It fits all standard US license plates, across all 50 states.",
      },
      {
        question: "Is it legal?",
        answer:
          "The frame and tiles sit on the border only and never cover your plate numbers, registration stickers, or the state name. Drivers are responsible for following their own state's plate display rules.",
      },
      {
        question: "What about weather and car washes?",
        // Material in plain language (same hard automotive plastics, not named).
        // Tiles are UV printed (fade-resistant). Keep the heavy-brush car-wash
        // note: that is mechanical abrasion, a separate real caution.
        answer:
          "Yes. The frame and tiles are vetted for everyday driving: highway speeds, automatic car washes, and the full range of weather, from freezing winters to summer heat, sun, and rain. The tiles are UV printed, so the colors stay bright. And whenever you want a new look, they still pop off in seconds.",
      },
      {
        question: "Will it damage my car or plate?",
        answer:
          "No. It installs with the same two screws that already hold a frame to your plate, with no drilling and no new hardware, and the tiles snap on and off by hand with no adhesive.",
      },
    ],

    emailCapturePrompt: "New theme drops and early access. No spam, ever.",
    ctaHeading: "Design your frame.",

    seo: {
      heading: "Custom license plate frames you actually want to look at",
      intro:
        "Festive Frames lets you design your own custom license plate frame online. Pick a theme, snap on the patriotic tiles you want, stars, stripes, flags, and fireworks, and add your own phrase along the bottom bar. We hand-make every frame to order in St. Louis, USA. It is a personalized license plate frame that fits all standard US plates in all 50 states.",
      sections: [
        {
          heading: "A patriotic license plate frame for the Fourth of July",
          body:
            "Our launch theme is the Fourth of July and America's 250th, 1776 to 2026. Design your own red, white, and blue license plate frame with American flag tiles, bold stars, chevrons, and firework bursts, then add your phrase. It is the easy 4th of July car decoration you design yourself, and more seasonal themes are on the way.",
        },
        {
          heading: "Design your own, theme by theme",
          body:
            "Most decorative license plate frames come pre-made in one look. This one is yours to design. Choose a theme, snap the tiles you want into the rail by hand, and spell out phrases like LAND OF THE FREE on the bottom bar. New seasonal themes drop through the year, so there is always a fresh frame to design.",
        },
        {
          heading: "Made in the USA and built for the road",
          body:
            "Every frame and tile is designed and made in St. Louis. They are vetted for real driving: highway speeds, automatic car washes, and the full swing of weather from icy winters to summer sun. The tiles are UV printed so the colors stay bright, and the frame sits on the plate border only, so it never covers your plate numbers, registration sticker, or state name.",
        },
        {
          heading: "A car gift that is actually fun",
          body:
            "Looking for a gift for the car lover, the proud American, or the neighbor who decorates for every holiday? A custom Festive Frames frame is a personalized, made-in-USA license plate frame you design yourself and we make by hand. Design two and keep one for the second car.",
        },
      ],
    },

    testimonials: [
      {
        quote:
          "I design every tile to read from a block away: big, bold, and unmistakably American. Seeing my artwork snap onto someone's car, and knowing they can restyle it any time, is the whole dream.",
        name: "Becky Newman",
        role: "Tile artist and designer, Festive Frames",
      },
      {
        quote:
          "I obsess over the fit and the snap. The frame installs once with your existing screws, and every tile locks in clean and pops off in seconds. We build and test these in St. Louis for highway speeds, car washes, and real weather, and we stand behind every one for 30 days.",
        name: "Bill Laupan",
        role: "Engineer & product designer, Festive Frames",
      },
      {
        quote:
          "As a photographer, I care about how things look and how they let you express yourself. That is exactly what this is: your car becomes a little canvas you can restyle whenever you want. I love seeing what people come up with.",
        name: "Henry David",
        role: "Photographer & product designer, Festive Frames",
      },
    ],

    founding: {
      scarcityLine:
        "Our launch run for America's 250th birthday. Once these are claimed, the Founding Edition is gone for good.",
      cta: "Claim your Founding frame",
    },

    story: {
      heading: "Made by Midwest folks who wanted driving to be more fun",
      body:
        "We are a small crew in St. Louis. We got tired of license plate frames that come pre-made in one boring look, so we built one you design yourself: pick a theme, choose your tiles, add your phrase. No overseas factory, no committee, no nonsense. Just people who figure your car should get to celebrate too. We are kicking it off with a Fourth of July theme for America's 250th, with more seasonal themes on the way. Here is why we think you will like it.",
      reasons: [
        {
          title: "You design it your way",
          body: "Pick a theme, snap on the tiles you want, and type your own bottom-bar phrase. Every frame is one of a kind because you make it.",
        },
        {
          title: "A theme for every season",
          body: "The Fourth of July and America's 250th is live now, and new seasonal themes drop through the year.",
        },
        {
          title: "Designed and made in St. Louis",
          body: "Every frame and tile is made to order right here in the USA, and the tiles are UV printed so the colors stay bright.",
        },
        {
          title: "Built for the real world",
          body: "Vetted for highway speeds, automatic car washes, and the full swing of weather, from icy winters to summer sun.",
        },
      ],
    },

    reviews: [
      {
        rating: 5,
        quote:
          "I wasn't sure what to expect, but the frame feels solid and the tiles fit together really well. Several people have asked where I got it.",
        name: "Melissa C., St. Charles",
      },
      {
        rating: 5,
        quote:
          "I'm one of those people who puts up lights for every holiday. Now my truck gets decorated too.",
        name: "Jacob S., Wentzville",
      },
      {
        rating: 5,
        quote:
          "I spent twenty minutes trying different layouts before settling on one. There are way more combinations than I expected.",
        name: "Nicole A., Jefferson City",
      },
      {
        rating: 5,
        quote:
          "Bought it for my brother's birthday. He installed it the same day and immediately started rearranging the tiles.",
        name: "Ethan M., Ballwin",
      },
      {
        rating: 5,
        quote:
          "I'm not mechanically inclined at all. The base frame was straightforward to install, and changing designs takes seconds.",
        name: "Karen D., Cape Girardeau",
      },
      {
        rating: 5,
        quote:
          "Most car accessories disappear into the background. This is one of the few things people genuinely comment on.",
        name: "Tyler R., Columbia",
      },
      {
        rating: 5,
        quote:
          "The concept caught my attention, but the quality is what convinced me to keep it. It feels like a finished product, not a gimmick.",
        name: "Heather W., Kirkwood",
      },
    ],
  },

  buy: {
    metaTitle: "Design Your Own Custom License Plate Frame",
    metaDescription:
      "Design your own custom license plate frame: pick a theme, snap on the tiles you want, and add your phrase. Made by hand to order in the USA, with a goodie bag of surprise extra tiles. Ships nationwide, $5 flat rate.",
    h1: "Make your license plate the most fun part of your car.",
    subhead: "Design it. We hand-make it.",
    ctaSubline: "$5 flat US shipping. Order by June 28 for the best chance to arrive before the Fourth.",
    guarantee: "30-day guarantee. If you do not love it, send it back.",

    whatsInKit: {
      heading: "What you get",
      items: [
        "Your custom frame, designed by you, fits all standard US plates and installs with your existing screws",
        "A goodie bag of surprise extra tiles in every order",
        "Ready-made bottom-bar slogans to start from, or write your own: USA, LAND OF THE FREE, HOME OF THE BRAVE, and LET FREEDOM RING",
        "Quick-start card",
      ],
      caption:
        "You design the frame, pick a theme, and add your phrase. Then every order ships with a goodie bag of surprise extra tiles so you can mix, match, and restyle any time.",
    },

    howItWorks: {
      heading: "How it works",
      line: "Pick a theme, snap on the tiles you want, and add your phrase in the online builder. We hand-make your frame to order, then it ships. It installs with the same two screws that already hold a frame to your plate, no drilling and no new hardware.",
    },

    builtToLast: {
      heading: "Built to last",
      // Material in plain language (same hard automotive plastics, not named).
      // Tiles are UV printed, so the colors-stay-bright claim is supported.
      body:
        "Festive Frames is designed and made in the USA, right here in St. Louis. The frame and tiles are built tough and vetted for the real world: they hold up to highway speeds, car washes, sun, rain, and snow. The tiles snap on and off in seconds with a satisfying click, and every tile is UV printed so the colors stay bright. Built to last.",
    },

    trust: {
      heading: "Out around St. Louis",
      caption: "A few custom Festive Frames on the road.",
    },

    offer: {
      single: {
        title: "Your custom frame",
        items: [
          "A frame you design yourself",
          "A goodie bag of surprise extra tiles",
          "Bottom-bar phrases to start from, or make your own",
        ],
        cta: "Buy Now",
      },
      bundle: {
        title: "Design two frames",
        items: [
          "Two custom frames, designed your way",
          "One for you, one for a gift or the second car",
        ],
        cta: "Buy Now",
        mixLabel: "Two frames",
      },
    },

    faq: [
      {
        question: "Will it fit my car?",
        answer:
          "It fits all standard US license plates, across all 50 states.",
      },
      {
        // EXACT homepage legality wording. Never drop this.
        question: "Is it legal?",
        answer:
          "The frame and tiles sit on the border only and never cover your plate numbers, registration stickers, or the state name. Drivers are responsible for following their own state's plate display rules.",
      },
      {
        question: "How do I install it?",
        answer:
          "The frame installs once over your plate using your existing screws. After that, tiles snap into the border and swap out whenever you want.",
      },
      {
        // Matches the homepage weather answer (plain-language material, UV-printed tiles).
        question: "What about weather and car washes?",
        answer:
          "Yes. The frame and tiles are vetted for everyday driving: highway speeds, automatic car washes, and the full range of weather, from freezing winters to summer heat, sun, and rain. The tiles are UV printed, so the colors stay bright. And whenever you want a new look, they still pop off in seconds.",
      },
      {
        question: "How does shipping work?",
        answer:
          "We ship anywhere in the US for a $5 flat rate. Order by June 28 for the best chance to arrive before the Fourth.",
      },
    ],

    checkoutError: "Checkout is warming up, try again.",
  },

  build: {
    metaTitle: "Build Your Own License Plate Frame Online | $39",
    metaDescription:
      "Design your own license plate frame online: snap on patriotic tiles and add a custom phrase. Made to order by hand in the USA, $39, ships fast. Start building.",
  },

  thanks: {
    metaTitle: "Order Confirmed",
    metaDescription:
      "Your custom Festive Frames frame is reserved. See your order details and what comes next.",
    headline: "You're in. Your frame is reserved.",
    genericHeadline: "You're in. Your frame is reserved.",
    genericBody:
      "Your order is confirmed. Check your email for the receipt and the details on getting your frame.",
    shipping: {
      heading: "On its way to you",
      body: "We hand-make your frame to order in St. Louis, then ship it to the address you entered. Your emailed receipt has the details.",
    },
    tease: {
      heading: "New seasonal themes are coming.",
      body: "Holiday themes, seasonal drops, fresh tiles. Always something new to design.",
    },
    emailCapturePrompt: "Get first access to every new theme. No spam, ever.",
    share: {
      heading: "Tell a friend",
      body: "Know someone whose ride needs this? Send them the link.",
      shareText: "I just designed a custom Festive Frames license plate frame. You pick a theme and design your own.",
    },
    builderCta: { label: "Design another frame", href: "/build" },
  },

  anchorPhrases: [
    "Design your own frame.",
    "Pick a theme. Make it yours.",
    "Made by hand to order.",
  ],
};
