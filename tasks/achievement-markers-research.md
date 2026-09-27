# Varsity / JV / State / Captain — research 2026-09-27 (no art generated)

**SHIPPED 2026-09-27**: the six banner lines below (Varsity, Captain, State
Champions, State Qualifier, All-State, Scholar Athlete) behind one Achievement chip.
State lines carry no year (the class year is not the title year).

Question (Henry): "what about varsity, jr varsity, state, etc?"

## Finding
Letter-jacket catalogs (Neff, Anderson's, H&R Trophies, Trophy Kits, True Varsity)
show these as WORDS: CAPT, MVP, JV, MGR, VARSITY, CHAMPS stamped on pins. The only
graphic markers are the school's letter, year bars, stars, a state-shaped patch,
and trophies/medals. No catalog has a wordless "captain" or "all-state" symbol, so
these belong on the BANNER, not in badge art (badges carry no lettering by rule).
`school-phrases.ts` already lists STATE CHAMPS / ALL-STATE / VARSITY / CAPTAIN /
SCHOLAR ATHLETE; none is a one-tap banner line yet (BANNER_LINES, frame-buyers.ts).

## Recommendation
| Marker | How | Text (≤26 chars) |
|---|---|---|
| Varsity | banner line | VARSITY · CLASS OF 2027 |
| Captain | banner line | CAPTAIN · CLASS OF 2027 |
| State Champions | banner line (+ existing trophy badge) | STATE CHAMPIONS · 2026 |
| State Qualifier | banner line | STATE QUALIFIER · 2026 |
| All-State / All-Conference | banner line | ALL-STATE · CLASS OF 2027 (25, tight) |
| District / Conference champs | "Your own words" + trophy | DISTRICT CHAMPS · 2026 |
| Scholar Athlete | banner line | SCHOLAR ATHLETE |
| JV | only if asked — reads "not varsity yet" on a car | JV · CLASS OF 2028 |
| MVP, manager, year bars | skip (one-season / illegible at an inch) | — |
| Varsity letter badge | later: needs the school's own initial drawn by the renderer (not the image model) AND the school's permission | — |

Structural idea: an optional achievement chip (Varsity / Captain / State Champs /
All-State) that prefixes the existing line, auto-dropping "CLASS OF" when long.

State-shaped badge (state outline in laurel): strong wordless "state" symbol, but
one artwork per state (50) — a v2 item.

## Legal
- Never draw a state association's logo, trophy or medal design, or name it
  (MSHSAA licenses its marks to one vendor). Generic trophy/laurel/outline is fine.
- A varsity letter is effectively the school's mark: same permission gate as mascots.
- "State Champions" on a parent's own frame is their statement, like a decal: allow
  freely. Never auto-generate championship claims in kits (thin-kit.test.ts forbids).

Sources: neffco.com (Numerals-Stars-Bars, State-Patches), andersons.com letter-jacket
pins, hrtrophies.com year bars, trophykits.com chenille pins, truevarsity.com guide,
etsy.com markets (varsity_letter_decal, high_school_sports_car_decals, champion_decal),
mshsaa.org ChampionshipApparel + Media Kit.
