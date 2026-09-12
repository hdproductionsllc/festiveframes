"use client";

import { useEffect } from "react";

// ─── The font picker's optional faces, WHEN THE PICKER IS OPENED ─────────────
//
// Sixty-odd Google faces used to arrive through seven chained `@import` rules
// inside the school builder's stylesheet. Chained @imports are render-blocking
// AND serialized: the browser fetches our CSS, parses it, discovers seven more
// stylesheets, fetches those, and only then paints. On a phone that sits between
// a parent scanning a QR code in the bleachers and seeing their school's frame.
// They moved here, to after first paint — and that fixed the blocking, but every
// school page still fetched eight third-party stylesheets, and then the font
// files behind whichever faces they matched, for a MENU that most parents never
// open. The graduate express means the first frame they see is already right.
//
// So they load on the first OPEN of a font picker instead. Nothing the product
// is set in depends on them — Graduate on the banners, Oswald on the tagline,
// Stars and Stripes on the text bars are all served from our own origin (see
// self-hosted-fonts.css), which is also what stops those faces losing the race
// and rendering as something heavier. The rest is a menu of alternatives, and a
// menu can arrive when it is asked for.
//
// The two preconnects still go up on mount: they are one DNS + TLS handshake
// each, they carry no bytes, and paying for them early is exactly what makes the
// picker feel instant when it is opened.

const PRECONNECT = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

// Inter is NOT a picker face: globals.css sets the whole UI in it
// (`--font-sans`), and it only ever arrived inside the first picker sheet. When
// the sheets moved behind the picker, every school page's chrome silently fell
// to system-ui unless a parent happened to open the font menu. One small sheet
// keeps the product's own face on mount; it still goes up after first paint.
const UI_SHEET = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";

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

function addLink(rel: string, href: string, crossOrigin?: string) {
  if (typeof document === "undefined") return;
  // An identical link may already be there from a previous mount — these calls
  // are cheap but not idempotent by accident.
  if (document.head.querySelector(`link[rel="${rel}"][href="${CSS.escape(href)}"]`)) return;
  const el = document.createElement("link");
  el.rel = rel;
  el.href = href;
  if (crossOrigin) el.crossOrigin = crossOrigin;
  document.head.appendChild(el);
}

/** The handshakes, with no bytes behind them. Safe to call repeatedly. */
export function preconnectPickerFonts() {
  for (const origin of PRECONNECT) addLink("preconnect", origin, "anonymous");
}

/**
 * Load the picker's faces. Call this the first time a font menu is OPENED — from
 * the pointerdown/focus that opens it, not from the render that draws it, so a
 * page nobody types on never pays for them.
 *
 * Idempotent by a module flag as well as by the DOM check, so the twenty pointer
 * events a fidgety user aims at a <select> cost one pass.
 *
 * Deliberately never unwound: a face already applied to text on the page would
 * un-apply, and moving around inside the builder should not pay for these twice.
 */
let requested = false;
export function loadPickerFonts() {
  if (requested || typeof document === "undefined") return;
  requested = true;
  // Preconnects first, so the stylesheet fetch does not pay for DNS and TLS
  // again. On /build these are the only place they get added at all — that page
  // has no mounted <BuilderFontsDeferred/>.
  preconnectPickerFonts();
  for (const href of SHEETS) addLink("stylesheet", href);
}

/**
 * Mounted by every school page. Opens the connections to the font hosts after
 * first paint and fetches the UI face; the picker sheets wait for
 * `loadPickerFonts()`.
 */
export function BuilderFontsDeferred() {
  useEffect(() => {
    preconnectPickerFonts();
    addLink("stylesheet", UI_SHEET);
  }, []);
  return null;
}
