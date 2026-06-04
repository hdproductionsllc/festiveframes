# Booth Signage Copy

Print-ready copy for the booth. At a booth, pricing is seen, not
explained. Keep signs short. Let the product samples do the talking.

Brand colors for the printer: navy `#1B2A4A`, navy-deep `#0F1B33`,
cream `#F4ECD8`, signal red `#C8102E`, gold `#FFD700`. White is fine
for QR placards (needed for scan contrast).

## The price sign (the hero)

This is the only sign that states price. Nothing else goes on it: no
feature list, no paragraph, no fine print.

```
BIG  (one line):     Custom License Plate Frames - $39
HALF SIZE (line 2):  Two for $69
```

The second line is roughly half the height of the first. Center both.
That is the entire sign.

> Copy rules: no em dashes, no savings/discount language, no hype
> words. Prices only as `$39` and `$69`.

## QR placard (small, paired with the big sign)

One short prompt plus the booth QR code.

```
Skip the line. Buy here.
```

Pair with: **`../qr/buy-booth.png`**

Place this placard low and within reach (table edge or A-frame foot) so
a phone can get close. Keep the white quiet zone around the QR clear.

## Suggested physical sizes and pairings

| Piece            | Suggested size        | Carries                                  | QR asset |
| ---------------- | --------------------- | ---------------------------------------- | -------- |
| Banner (backdrop) | 24 x 60 in vertical, or 72 x 30 in horizontal | "Custom License Plate Frames - $39" / "Two for $69" | none (banner stays clean; QR lives on the placard) |
| A-frame (sidewalk) | 24 x 36 in            | Same two price lines, top half. QR placard mounted lower. | `../qr/buy-booth.png` at 7 in min |
| Tabletop card (tent/easel) | 5 x 7 in or 8 x 10 in | "Skip the line. Buy here." + booth QR    | `../qr/buy-booth.png` at 3.5 in min |

Notes:
- The big price lines can appear on the banner and the A-frame. The QR
  always uses `buy-booth.png` (the booth campaign tag).
- `../qr/buy-car.png` is for the demo vehicle decal, and
  `../qr/buy-card.png` is for handout cards. Neither belongs on booth
  signage; they keep their own campaign tags so scans are attributed
  correctly.
- See `../qr/README.md` for minimum QR print sizes by scan distance.
