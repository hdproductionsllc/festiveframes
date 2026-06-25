# Sticker-theme sweep — restyle remaining customer-facing pages

## Scope (confirmed by import-graph analysis)
Live customer-facing surfaces inside `.sticker-theme`:
- `(site)` layout wraps: /thanks (done), /privacy, /returns, /terms
- Client islands reachable from live pages: EmailCaptureForm (thanks), SharePrompt (thanks), LeaveReview (kept for reuse)
- Root 404 (`not-found.tsx`) — customer-facing, currently `marketing-theme`

LEAVE ALONE (intentionally legacy): /classic, /buy, and ALL `components/site/home/*` + `components/site/buy/*` + ReviewsCarousel/FoundingScarcity (used only by /classic and /buy). Builder + /confirmation use the dark workbench theme (out of scope).

## Tasks
- [x] Restyle `(site)/privacy/page.tsx` body to sticker theme (keep text)
- [x] Restyle `(site)/returns/page.tsx` body to sticker theme (keep text)
- [x] Restyle `(site)/terms/page.tsx` body to sticker theme (keep text)
- [x] Reskin `EmailCaptureForm.tsx` (cream input, ink outline, gold/pink button)
- [x] Reskin `SharePrompt.tsx` (sticker button)
- [x] Reskin `LeaveReview.tsx` (sticker form/inputs/button)
- [x] Restyle root `not-found.tsx` to sticker theme (self-contained)
- [x] `npx next build` exit 0
- [x] `npm run lint` no new errors (0 errors; only pre-existing warnings)
- [x] Report
