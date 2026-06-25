# Restyle (site) chrome + /thanks to sticker theme

## Plan
- [x] (site)/layout.tsx — swap marketing-theme for sticker-theme, import sticker.css, add Fredoka/Nunito font vars
- [x] SiteHeader.tsx — rebuild in sticker style (cream bar, ink outline, badge logo, "Design your frame" pill -> /build)
- [x] SiteFooter.tsx — restyle to match home dark-ink Footer, keep existing links + email + logo
- [x] thanks/page.tsx — reskin all sections to sticker cards (cream, ink outline, hard shadow, accents)
- [x] OrderFulfiller.tsx — reskin its container div only (logic untouched)
- [x] Legacy /buy + /classic pages re-wrapped in marketing-theme so they keep Americana look (they share the group layout)
- [x] Verify: next build exit 0 + lint 0 errors (19 pre-existing warnings, none in changed files)

## Preserve — confirmed intact
- All /thanks components/props/data flow unchanged (OrderFulfiller logic, PurchaseTracker, LeaveReview, EmailCaptureForm, SharePrompt, getOrderView, robots noindex)
- Order pipeline, builder, homepage, routing untouched
