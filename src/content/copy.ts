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
  brandName: string;
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
    tagline: "Install once. Swap tiles forever.",
  },

  home: {
    metaTitle:
      "Custom License Plate Frames with Snap-On Tiles",
    metaDescription:
      "The Freedom Frame Set: a snap-on license plate frame kit made in St. Louis for July 4. Comes loaded with 40+ patriotic tiles. Install once, swap tiles forever.",
    heroH1: "Customizable License Plate Frames with Snap-On Tiles",
    heroSubhead: "Install once. Swap tiles forever.",
    primaryCta: { label: "Shop the Freedom Frame Set", href: "/buy" },
    secondaryCta: { label: "See what's inside", href: "/buy" },

    whatItIs: [
      "One frame installs on your plate a single time.",
      "Tiles snap into the border and swap out whenever you want.",
      "Every kit arrives complete, with all the tiles ready to go.",
    ],

    howItWorks: [
      { step: "Install the frame once." },
      { step: "Snap in your kit." },
      { step: "Swap tiles forever." },
    ],

    // Material described in plain language per product owner (the same hard
    // automotive plastics, deliberately NOT named). Tiles are UV printed, so
    // the colors-stay-bright claim is supported.
    trust:
      "Designed and made right here in St. Louis, USA. The frame and tiles are built tough and vetted for the real world: highway speeds, car washes, and the full swing of weather, from icy winters to summer heat, sun, and rain. The tiles are UV printed, so the colors stay bright. Built to last.",

    faq: [
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
        question: "Do tiles stay on at highway speed?",
        answer:
          "The tiles lock into the frame and stay put at highway speeds.",
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
        question: "Can I get more than one?",
        answer: "Yes. Every tile fits every frame, and two sets are $69.",
      },
      {
        question: "When do new tiles drop?",
        answer:
          "New tile drops and seasonal sets arrive throughout the year. The email list gets first access.",
      },
      {
        question: "What is a snap-on license plate frame?",
        answer:
          "It is a license plate frame that installs once over your plate, then holds interchangeable decorative tiles that snap into the border by hand. You swap the tiles to change the look without ever removing the frame.",
      },
      {
        question: "What comes in the Freedom Frame Set?",
        answer:
          "One frame rail that fits all standard US plates, plus 40+ patriotic tiles - American flags, stars, stripes, chevrons, and firework bursts - and ready-made bottom-bar phrases like LAND OF THE FREE and HOME OF THE BRAVE. It arrives complete and ready to snap on.",
      },
      {
        question: "Is this a good Fourth of July gift?",
        answer:
          "Yes. It is a made-in-USA, ready-to-go car gift for anyone who celebrates the Fourth out loud. Many people order two and keep one for a second car or to give away.",
      },
      {
        question: "Where is it made?",
        answer:
          "Every frame and tile is designed and made in St. Louis, USA.",
      },
      {
        question: "How much does a Festive Frames kit cost?",
        answer:
          "One Freedom Frame Set is $39, and two sets are $69. It ships anywhere in the US for a $5 flat rate. Order by June 28 to get it before the Fourth.",
      },
      {
        question: "Will it damage my car or plate?",
        answer:
          "No. It installs with the same two screws that already hold a frame to your plate, with no drilling and no new hardware, and the tiles snap on and off by hand with no adhesive.",
      },
    ],

    emailCapturePrompt: "Kit drops and early access. No spam, ever.",
    ctaHeading: "Make your plate yours.",

    seo: {
      heading: "Custom license plate frames you actually want to look at",
      intro:
        "Festive Frames makes customizable, snap-on license plate frames with interchangeable decorative tiles. Install the frame once with your existing plate screws, then snap patriotic tiles, stars, stripes, flags, and fireworks, into the border and swap them whenever the season or the mood changes. It is a personalized license plate frame that fits all standard US plates in all 50 states, designed and made in St. Louis, USA.",
      sections: [
        {
          heading: "A patriotic license plate frame for the Fourth of July",
          body:
            "The Freedom Frame Set is built for Independence Day. Dress up your car with a red, white, and blue license plate frame loaded with American flag tiles, bold stars, chevrons, and firework bursts. It is the easy 4th of July car decoration that takes ten seconds to restyle, and because the tiles pop right off, the same frame carries you into every holiday and game day after.",
        },
        {
          heading: "Snap-on, swappable, and tool-free",
          body:
            "Most decorative license plate frames lock you into one look. This one does not. The interchangeable tiles snap into the rail by hand, with no tools and no adhesive, so you can mix and match designs or spell out phrases like LAND OF THE FREE on the bottom bar. Buy the frame once, change it endlessly.",
        },
        {
          heading: "Made in the USA and built for the road",
          body:
            "Every frame and tile is designed and made in St. Louis. They are vetted for real driving: highway speeds, automatic car washes, and the full swing of weather from icy winters to summer sun. The tiles are UV printed so the colors stay bright, and the frame sits on the plate border only, so it never covers your plate numbers, registration sticker, or state name.",
        },
        {
          heading: "A car gift that is actually fun",
          body:
            "Looking for a gift for the car lover, the proud American, or the neighbor who decorates for every holiday? A Festive Frames kit is a personalized, made-in-USA license plate frame that arrives complete and ready to snap on. Order two and keep one for the second car.",
        },
      ],
    },

    testimonials: [
      {
        quote:
          "I design every tile to read from a block away: big, bold, and unmistakably American. Seeing my artwork snap onto someone's car, and knowing they can restyle it any time, is the whole dream.",
        name: "Becky Newman",
        role: "Tile artist, Festive Frames",
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
      cta: "Claim your Founding kit",
    },

    story: {
      heading: "Made by Midwest folks who wanted driving to be more fun",
      body:
        "We are a small crew in St. Louis. We got tired of license plate frames that do one boring thing forever, so we built one you can restyle in ten seconds. No overseas factory, no committee, no nonsense. Just people who figure your car should get to celebrate too. We are kicking it off with a Founding Edition for America's 250th, and we are pretty proud of how it turned out. Here is why we think you will like it.",
      reasons: [
        {
          title: "Install once, restyle forever",
          body: "Bolt the frame on a single time with your existing plate screws. After that you never touch tools again.",
        },
        {
          title: "Snap-on tiles, ten-second swaps",
          body: "Tiles click into the border by hand. Change your whole look for the season, the holiday, or the mood in seconds.",
        },
        {
          title: "Designed and made in St. Louis",
          body: "Every frame and tile is made right here in the USA, and the tiles are UV printed so the colors stay bright.",
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
    metaTitle: "Shop the Freedom Frame Set",
    metaDescription:
      "Shop the Freedom Frame Set: a snap-on license plate frame kit loaded with 40+ patriotic tiles. Install once, swap tiles forever. Ships nationwide, $5 flat rate.",
    h1: "Make your license plate the most fun part of your car.",
    subhead: "Snap it on. Swap it forever.",
    ctaSubline: "$5 flat US shipping. Order by June 28 to get it before the Fourth.",
    guarantee: "30-day guarantee. If you do not love it, send it back.",

    whatsInKit: {
      heading: "What's in the kit",
      items: [
        "Frame rail that fits all standard US plates, installs once with your existing screws",
        "40+ tiles, more than you see in the photo",
        "Ready-made bottom-bar phrases: LAND OF THE FREE, HOME OF THE BRAVE, LET FREEDOM RING, I ♥ STL, 314, and SHOW-ME STATE",
        "Quick-start card",
      ],
      caption:
        "Comes loaded with 40+ tiles, more than you see here, so you can mix, match, and restyle any time. Buy once, change endlessly.",
    },

    howItWorks: {
      heading: "How it works",
      line: "It bolts on in minutes using the same two screws that already hold a frame to your plate, no drilling and no new hardware. Then the tiles snap into the border by hand, no tools. Swap them whenever you want.",
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
      caption: "A few looks at the Freedom Frame Set on the road.",
    },

    offer: {
      single: {
        title: "Freedom Frame Set",
        items: [
          "Frame rail",
          "40+ tiles, more than pictured",
          "Ready-made bottom-bar phrases",
        ],
        cta: "Buy Now",
      },
      bundle: {
        title: "Two-Set Bundle",
        items: [
          "Everything in the set, x2",
          "One for you, one for a gift or the second car",
        ],
        cta: "Buy Now",
        mixLabel: "Two sets",
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
          "We ship anywhere in the US for a $5 flat rate. Order by June 28 to get yours before the Fourth.",
      },
    ],

    checkoutError: "Checkout is warming up, try again.",
  },

  build: {
    metaTitle: "Design Your Own License Plate Frame",
    metaDescription:
      "Design a custom snap-on license plate frame online. Arrange tiles, words, and icons into a personalized frame, then order your kit. Made in St. Louis.",
  },

  thanks: {
    metaTitle: "Order Confirmed",
    metaDescription:
      "Your Festive Frames kit is reserved. See your order details and what comes next.",
    headline: "You're in. Your kit is reserved.",
    genericHeadline: "You're in. Your kit is reserved.",
    genericBody:
      "Your order is confirmed. Check your email for the receipt and the details on getting your kit.",
    shipping: {
      heading: "On its way to you",
      body: "We pack and ship from St. Louis. Your kit ships to the address you entered, and your emailed receipt has the details.",
    },
    tease: {
      heading: "New tile drops are coming.",
      body: "Seasonal packs, holiday sets, limited runs. Your frame fits them all.",
    },
    emailCapturePrompt: "Get first access to every new drop. No spam, ever.",
    share: {
      heading: "Tell a friend",
      body: "Know someone whose ride needs this? Send them the link.",
      shareText: "I just grabbed a Festive Frames kit. Snap-on plate frames you swap whenever you want.",
    },
    builderCta: { label: "Back to the shop", href: "/buy" },
  },

  anchorPhrases: [
    "One-time frame install.",
    "Buy once, change endlessly.",
    "Install once. Swap forever.",
  ],
};
