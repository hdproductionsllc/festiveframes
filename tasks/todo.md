# Navigation audit — custom-first (/build), retire /buy

Live homepage = `(home)/page.tsx` + `(home)/_components/*`. Anchors all exist
(#looks,#how,#kit,#custom,#top,#main) — no dead anchors. `(site)` chrme
(SiteHeader/SiteFooter/AnnouncementBar) wraps /buy,/classic,/privacy,/returns,/terms,/thanks.
/classic = frozen old homepage. /checkout & /confirmation = order-store flow (no /buy links).
StartWithKitPill = intentionally unused.

## Fixes (repoint /buy -> /build) — ALL DONE
- [x] next.config.ts — redirects(): /buy -> /build (permanent 308)
- [x] (home)/_components/Hero.tsx — "Claim your kit" -> /build
- [x] (home)/_components/Header.tsx — announce bar + "Shop the kit" -> /build
- [x] (home)/_components/Footer.tsx — Freedom Frame Set + Two-Set Bundle -> /build
- [x] (home)/_components/TheKit.tsx — secondary link -> /build (relabelled)
- [x] (home)/page.tsx — JSON-LD product/itemList/breadcrumb urls -> /build
- [x] components/site/SiteHeader.tsx — Shop -> /build
- [x] components/site/SiteFooter.tsx — Shop kits -> /build
- [x] components/site/AnnouncementBar.tsx — -> /build
- [x] components/site/home/KitShowcase.tsx — "See everything inside" -> /build
- [x] components/build/StartWithKitPill.tsx — -> /build (unused, align)
- [x] not-found.tsx — "Shop Kits" -> /build
- [x] content/copy.ts — home.primaryCta, home.secondaryCta, thanks.builderCta -> /build
- [x] llms.txt route — Shop link -> /build
- left: api/checkout cancel_url /buy (off-limits dir; redirect catches it)

## Verify
- [x] npx next build exits 0
- [x] npm run lint — 0 errors, 20 pre-existing warnings (none in touched files)

---

# SEO Landing Pages (5) — model on america-250 page

- [x] 1. /patriotic-license-plate-frame — H1 "Custom Patriotic License Plate Frames"
- [x] 2. /veteran-license-plate-frame — H1 "Personalized Veteran License Plate Frames"
- [x] 3. /made-in-usa-license-plate-frame — H1 "License Plate Frames Made in the USA"
- [x] 4. /4th-of-july-license-plate-frame — H1 "4th of July License Plate Frames"
- [x] 5. /red-white-and-blue-license-plate-frame — H1 "Red, White & Blue License Plate Frames"
- [x] Build exit 0 (all 5 static) + lint 0 errors (20 pre-existing warnings). No edits to sitemap/existing files. No commit.
