"use client";

import { useEffect } from "react";

// ─── The font picker's optional faces, AFTER paint ───────────────────────────
//
// Sixty-odd Google faces used to arrive through seven chained `@import` rules
// inside the school builder's stylesheet. Chained @imports are render-blocking
// AND serialized: the browser fetches our CSS, parses it, discovers seven more
// stylesheets, fetches those, and only then paints. On a phone that sits between
// a parent scanning a QR code in the bleachers and seeing their school's frame.
//
// None of it is needed for the frame to be RIGHT. Everything the product is set
// in — Graduate on the banners, Oswald on the tagline, Stars and Stripes on the
// text bars — is served from our own origin (see self-hosted-fonts.css), which
// is also what stops those faces losing the race and rendering as something
// heavier. The rest is a menu of alternatives, and a menu can arrive a moment
// after the thing it is a menu for.
//
// So they load here instead: after first paint, in parallel, non-blocking. The
// preconnects go up first so the fetch does not pay for DNS and TLS twice.

const PRECONNECT = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

const SHEETS = [
  // Display / condensed faces, plus Inter for the UI.
  "https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@500;600;700;800&family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=Oswald:wght@400;500;600;700&family=Raleway:wght@600;700;800&family=Righteous&family=Russo+One&family=Teko:wght@500;600;700&display=swap",
  // Script / cursive.
  "https://fonts.googleapis.com/css2?family=Allura&family=Dancing+Script:wght@400..700&family=Great+Vibes&family=Kaushan+Script&family=Pacifico&family=Sacramento&family=Satisfy&family=Tangerine:wght@400;700&family=Yellowtail&display=swap",
  "https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Black+Ops+One&family=Bungee&family=Fredoka:wght@400;500;600;700&family=Permanent+Marker&family=Special+Elite&display=swap",
  // Cartoon / sticker.
  "https://fonts.googleapis.com/css2?family=Bangers&family=Bubblegum+Sans&family=Cherry+Bomb+One&family=Chewy&family=Lilita+One&family=Luckiest+Guy&family=Paytone+One&family=Shrikhand&family=Sniglet:wght@400;800&family=Titan+One&family=Baloo+2:wght@500;700;800&display=swap",
  // Display / design staples.
  "https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Archivo+Black&family=Bowlby+One&family=Concert+One&family=Lobster&family=Montserrat:wght@700;800;900&family=Passion+One:wght@700;900&family=Playfair+Display:wght@700;800;900&family=Poppins:wght@600;700;800&family=Staatliches&family=Ultra&display=swap",
  // Script / festive.
  "https://fonts.googleapis.com/css2?family=Cookie&family=Courgette&family=Damion&family=Lobster+Two:ital,wght@0,700;1,700&family=Marck+Script&display=swap",
  // Collegiate / varsity — these lead the SCHOOL picker, so they go early.
  "https://fonts.googleapis.com/css2?family=Fjalla+One&family=Big+Shoulders+Display:wght@600;700;800;900&family=Saira+Condensed:wght@600;700;800&family=Squada+One&display=swap",
  // The USA license-plate face.
  "https://fonts.cdnfonts.com/css/license-plate-usa",
];

export function BuilderFontsDeferred() {
  useEffect(() => {
    const added: HTMLLinkElement[] = [];
    const add = (rel: string, href: string, crossOrigin?: string) => {
      // An identical link may already be there from a previous mount — this
      // component is cheap but not idempotent by accident.
      if (document.head.querySelector(`link[rel="${rel}"][href="${CSS.escape(href)}"]`)) return;
      const el = document.createElement("link");
      el.rel = rel;
      el.href = href;
      if (crossOrigin) el.crossOrigin = crossOrigin;
      document.head.appendChild(el);
      added.push(el);
    };
    for (const origin of PRECONNECT) add("preconnect", origin, "anonymous");
    for (const href of SHEETS) add("stylesheet", href);
    // Deliberately NOT removed on unmount: a face already applied to text on the
    // page would un-apply, and the user navigating within the builder should not
    // pay for these twice.
  }, []);
  return null;
}
