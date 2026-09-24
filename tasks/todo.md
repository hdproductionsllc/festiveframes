# MySchoolFrame pilot launch — the six-school batch (2026-09-23)

**Owner's rule for this phase:** the goal is not a more complete product, it is getting
MySchoolFrame in front of real PTOs and booster clubs. Everything below serves the pilot;
nothing expands it.

**Pilot schools (six):** Marquette (Chesterfield), Eureka (Eureka), Lafayette (Wildwood),
Parkway West (Ballwin), Parkway Central (Chesterfield), Ladue Horton Watkins (St. Louis).

**Owner decisions made 2026-09-23:** price $24.95, $5 per frame to the school; reduce the
"every school" claim; warranty 1 year.

## Part A — site changes (one batch, verified locally, ONE push)

- [ ] Pricing: `schoolOffer` 4900/1000 → 2495/500. Checkout gate stays closed until the
      owner runs a test payment (Part C), then it flips.
- [ ] Pilot scope: one list of the six slugs; the finder offers only those; the "is my
      school on it?" answer and the finder's empty state say we're launching with six
      St. Louis-area schools and take a request. National pages keep working by direct
      URL (noindex) — nothing deleted, one switch to turn it back on.
- [ ] Eureka High School kit (it has none): researched colours, mascot, signature,
      welcome, rosterId join.
- [ ] Warranty: "30 days" → "1 year" on the school page (Festive Frames holiday pages are a
      different product with a 30-day return policy — untouched).
- [ ] De-emphasise full names: landing copy and the six pilot kits' welcome text lead with
      class year, number, activity, Proud Parent. Owner's four locked lines untouched.
- [ ] Non-sports examples on the landing page (orchestra, science, theater, band, yearbook).
- [ ] Tests green, build green, landing + one kit page looked at on an iPhone-sized screen.

## Part B — deliverables (no push)

- [ ] QR code per school → its builder (PNG print-ready + SVG).
- [ ] Sample set per school, 4 renders: school/mascot · sport · academic/activity ·
      senior/family pride.
- [ ] Pilot tracking sheet (Google Sheet, the 12 columns).
- [ ] Bill's talking points + final outreach email, on one page with copy buttons.

## Part C — owner steps (I prompt, owner does)

- [ ] DNS records for bill@myschoolframe.com (DKIM + MX + DMARC), then I verify.
- [ ] Test payment end to end, then flip `SCHOOL_CHECKOUT_OPEN`.
- [ ] Real iPhone pass on each of the six builders.
- [ ] Confirm colours / grab logos for the six (the sampler script makes it a 2-minute job).
- [ ] Physical sample per school; real on-car photograph.
