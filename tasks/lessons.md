# Lessons

## Railway + Cloudflare custom domains (2026-06-18)
Spent ~12h stuck pointing festiveframes.co at Railway. Patterns to not repeat:

- **Railway cannot verify a bare/apex domain behind Cloudflare.** A root domain
  can't hold a real CNAME, so Cloudflare "flattens" it — which hides the exact CNAME
  Railway checks for. Result: apex sits on "Waiting for DNS update" forever even though
  DNS looks perfect. **Fix: use the `www` subdomain as the live domain (verifies fine),
  and 301-redirect the bare domain to it via a Cloudflare Redirect Rule.**
- **Custom-domain CNAMEs must be "DNS only" (grey) in Cloudflare**, NOT Proxied (orange).
  Proxied makes the name resolve to Cloudflare's IPs, so Railway can't see its target and
  never verifies/issues a cert. (Exception: the apex record used purely for a redirect rule
  must be proxied, because Cloudflare rules only fire on proxied traffic — but the redirect
  short-circuits before origin, so it's fine.)
- **Re-adding a domain in Railway generates a NEW CNAME target** (e.g. www went from
  `u4y4es0r` → `m6v0zz65`). Always re-check Railway's "Show DNS records" target and update
  Cloudflare to match. A stale target = permanent "Waiting for DNS update".
- **Don't blame the plan/limit without seeing the Railway dashboard.** I wrongly assumed
  the plan, then an account-wide domain limit. Reality: Hobby allows 2 custom domains
  *per service*; we were under it. The blocker was the apex-flattening verification, not billing.
- **Railway's "Authorize DNS records / One-click setup" sets records to Proxied (orange)** —
  which is the broken state. Decline it; configure manually as DNS-only.
- Local DNS on this machine hijacks unresolved names to `69.46.46.x` junk IPs — don't trust
  local nslookup/curl resolution; verify via the Cloudflare dashboard + WebFetch (Anthropic-side).

## Don't assume what a dropped asset is — inspect it first (2026-06-19)
Dropped a `Popsicle 9x3 Test.ai`. I (and an earlier chat) assumed it was a customer
*product* (a popsicle) and nearly built a customer-facing template editor. It was actually
the **eufyMake E1 print jig** — a tray that holds blank tiles for UV printing. **Render and
parse a binary asset before designing around it.** A 5-min pdf-to-img render + parsing the
PDF placement matrices showed the real thing (3×9 grid of tile pockets) and turned a vague
ask into exact coordinates. Verify-by-overlay: re-derive geometry in Node and composite it
on the source render to prove registration before trusting it.

## Don't add cosmetic styling to production/print output (2026-06-19)
First cut of the eufy print sheet clipped each tile's art to a rounded square
(`face * 0.04` radius) — purely decorative habit from on-screen tile rendering. On a
UV print that leaves the tile's corners BARE/unprinted. **Print output should be exactly
what the press needs (full square face), not what looks nice on screen.** Keep a square
clip only to stop cover-fit overflow bleeding into neighbours; no radius.

## Don't delete a feature the owner asked to keep — fix it (2026-06-26)
When banner drag-and-drop misbehaved I removed it entirely and replaced it with buttons —
the owner had explicitly said NOT to ditch it. Wrong call. **A buggy feature the user wants
gets fixed, not deleted.** Restore-and-fix, keep deterministic controls only as a *fallback*.

## DnD collision: key off the POINTER, not the dragged element's rect (2026-06-26)
The collision strategy SHOULD key off the pointer, not the dragged element's box:
`pointerWithin` first (containment → a banner can't cross rails), then nearest cell center
*to `args.pointerCoordinates`* with a proximity gate (off-frame ⇒ no target ⇒ "drag off to
remove"). This is the right design and is in place. BUT — see below — it was NOT the cause
of the "ghost stuck top-left / snaps to top-right" bug, so changing it alone fixed nothing.

## The REAL "preview ghost frozen top-left" bug: invalid CSS x/y on a div (2026-06-26)
The banner landing-preview ghost in `FrameCanvas.tsx` did `style={{ ...barRect(preview) }}`.
`barRect` returns `{x, y, width, height}` — but **`x`/`y` are SVG attributes, NOT CSS box
properties**. React emitted `x: 768px; y: 0px;` which a `<div>` silently ignores, so the
absolutely-positioned ghost had no `left`/`top` and stuck at the frame's static origin
(top-left) — ALWAYS rendering as `{row:"top", startIndex:0}` no matter the real drop. The
drop math was correct the whole time; only the ghost was visually frozen. Fix: map
`x→left, y→top` exactly like the committed `PlacedBar` does.
**Lessons:** (1) when a fix "changes nothing," the symptom is probably in a DIFFERENT layer
than your theory — REPRODUCE before re-fixing (a headless-browser repro dumping the ghost's
computed style found this in minutes; my plausible "collision" theory cost a wasted cycle).
(2) Spreading a geometry object straight into `style` is dangerous — invalid CSS keys fail
silently. (3) If a value object is consumed as CSS box position, name it `{left, top}` (or
have `barRect` return a CSS-ready contract) so the mismatch can't recur.
</content>
