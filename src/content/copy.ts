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
  /** Festival pickup fulfillment block. */
  pickup: { heading: string; body: string; instruction: string };
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
      "Custom License Plate Frames with Snap-On Tiles | Festive Frames",
    metaDescription:
      "The Freedom Frame Set: a snap-on license plate frame kit made in St. Louis for July 4. Comes loaded with 40+ patriotic tiles. Install once, swap tiles forever.",
    heroH1: "Customizable License Plate Frames with Snap-On Tiles",
    heroSubhead: "Pick a kit that's already you. Install once. Swap tiles forever.",
    primaryCta: { label: "Shop July 4 Kits", href: "/buy" },
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
      "Proudly made in the USA, designed and built right here in St. Louis. The frame and tiles use the same tough, hard plastic that is already on your car, like the bumpers and trim, so they shrug off the full swing of Midwest weather, from icy winters to brutal summer heat. The tiles are UV printed, so the colors stay bright in the sun. Built and tested to last.",

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
        // TODO-VERIFY: confirm secure-hold claim with road testing before launch.
        answer:
          "Tiles are designed to lock into the frame and hold during normal highway driving. We are finalizing road testing and will share the results before launch.",
      },
      {
        question: "What about weather and car washes?",
        // Material in plain language (same hard automotive plastics, not named).
        // Tiles are UV printed (fade-resistant). Keep the heavy-brush car-wash
        // note: that is mechanical abrasion, a separate real caution.
        answer:
          "The frame and tiles are made from the same tough, hard plastic that is already on your car, like the bumpers and trim, and they are built and tested for the full range of St. Louis weather, from freezing winters to summer heat, sun, and rain. The tiles are UV printed, so the colors stay bright. For automated car washes with heavy brushes, a gentle or touch-free wash is your safest bet.",
      },
      {
        question: "Can I get more than one?",
        answer: "Yes. Every tile fits every frame, and two sets are $69.",
      },
      {
        question: "When do new kits drop?",
        answer:
          "New kits arrive every season. The email list gets first access.",
      },
    ],

    emailCapturePrompt: "Kit drops, festival stops, early access. No spam, ever.",
    ctaHeading: "Pick your kit and make it yours.",
  },

  buy: {
    metaTitle: "Shop July 4 Kits | Festive Frames",
    metaDescription:
      "Shop the Freedom Frame Set: a snap-on license plate frame kit loaded with 40+ patriotic tiles. Install once, swap tiles forever. Free St. Louis pickup.",
    h1: "Make your license plate the most fun part of your car.",
    subhead: "Pick your kit. Snap it on. Swap it forever.",
    ctaSubline: "Free festival pickup July 3-4, or $5 flat shipping.",
    guarantee: "30-day guarantee. If you do not love it, send it back.",

    whatsInKit: {
      heading: "What's in the kit",
      items: [
        "Frame rail that fits all standard US plates, installs once with your existing screws",
        "40+ tiles, more than you see in the photo",
        "Ready-made bottom-bar phrases: LAND OF THE FREE, HOME OF THE BRAVE, LET FREEDOM RING, STL, 314, and SHOW-ME STATE",
        "Full A-Z and 0-9 letter set so you can spell anything you want",
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
        "Proudly made in the USA, designed and built right here in St. Louis. The frame and tiles use the same tough, hard plastic as your car's bumpers and trim, with a solid, satisfying snap and a real quality feel in the hand. The artwork is UV printed so it stays bright and weatherproof through sun, rain, and snow. Beautiful, durable, and built to last for years.",
    },

    trust: {
      heading: "Out around St. Louis",
      caption: "A few looks at the Freedom Frame Set on the road.",
    },

    offer: {
      single: {
        title: "Freedom Frame Set",
        items: [
          "Frame",
          "40+ tiles, more than pictured",
          "Full A-Z and 0-9 letter set",
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
          "The frame and tiles are made from the same tough, hard plastic that is already on your car, like the bumpers and trim, and they are built and tested for the full range of St. Louis weather, from freezing winters to summer heat, sun, and rain. The tiles are UV printed, so the colors stay bright. For automated car washes with heavy brushes, a gentle or touch-free wash is your safest bet.",
      },
      {
        question: "Pickup or shipping?",
        answer:
          "Pick up free at our festival booth July 3-4, or get it shipped anywhere in the US for a $5 flat rate.",
      },
    ],

    checkoutError: "Checkout is warming up, try again.",
  },

  build: {
    metaTitle: "Design Your Own License Plate Frame | Festive Frames",
    metaDescription:
      "Design a custom snap-on license plate frame online. Arrange tiles, words, and icons into a personalized frame, then order your kit. Made in St. Louis.",
  },

  thanks: {
    metaTitle: "Order Confirmed | Festive Frames",
    metaDescription:
      "Your Festive Frames kit is reserved. See your order details and what comes next.",
    headline: "You're in. Your kit is reserved.",
    genericHeadline: "You're in. Your kit is reserved.",
    genericBody:
      "Your order is confirmed. Check your email for the receipt and the details on getting your kit.",
    pickup: {
      heading: "Festival pickup, July 3-4",
      body: "Come grab your kit at our festival booth on July 3 or 4.",
      instruction: "Show this screen at the booth and we will hand it right over.",
    },
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
