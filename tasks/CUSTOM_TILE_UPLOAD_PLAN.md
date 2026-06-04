# Custom Photo Tile Upload — Design Plan (FUTURE / post-MVP)

Goal: let a user upload their own photo in the Builder, crop it per tile, and have it UV-printed onto
physical tile(s) that ship in their order. NOT part of the MVP launch. This is the spec to build later.
The Builder is staying in the codebase (unlinked at launch) specifically so this can land on top of it.

## 1. User flow
1. In the Builder, user picks a slot (or a block of slots) and chooses "Upload my photo."
2. Upload dialog: drag-and-drop or file picker. Accept JPG, PNG, HEIC (convert), WEBP. Max ~25 MB.
3. Client reads the image, checks dimensions against the resolution gate (below) BEFORE cropping.
4. Cropper opens locked to the tile aspect (1:1 per tile; or the chosen block's aspect for a multi-tile mosaic). User pans/zooms; a live "print quality" meter shows green/amber/red.
5. On confirm, the cropped region is stored as the tile's artwork (preview in the frame).
6. At checkout, custom-photo tiles are flagged; production receives a print-ready file per custom tile.

## 2. The physical constraints (drive everything)
- Tile face: 1.25 in x 1.25 in. UV print onto the tile surface.
- Target print resolution: 300 DPI (crisp). Acceptable floor: ~240 DPI. Hard block below ~200 DPI.
- Add print bleed + safe area: ~0.0625 in bleed each side -> design area ~1.375 in.
- Pixel math (square tile, after crop):
  - 300 DPI x 1.375 in ≈ **412 px** -> round target to **>= 500 px** square (headroom) = GREEN.
  - 240 DPI -> ~330 px -> **300-500 px** = AMBER ("ok, not crisp").
  - < ~280 px (≈200 DPI) = RED, **blocked**.
- So the GATE is on the CROPPED region, not the raw upload: the selected crop must resolve to >= 500 px/side for green, 300-500 amber, < 300 block. A big raw upload zoomed in tight can still fail -> meter must recompute live as the user zooms.

## 3. Resolution gate (UX)
- On file load: compute megapixels; if the whole image is < ~0.3 MP, warn immediately ("this photo is small, it may print blurry").
- In the cropper: continuously compute cropped-pixel dimensions = (cropRectPx / displayScale) mapped to source pixels. Show a meter:
  - GREEN >= 500 px/side: "Great for print."
  - AMBER 300-499: "Usable, but may look soft. A higher-res photo prints sharper."
  - RED < 300: disable "Use this photo"; tell them the minimum.
- Never upscale to fake it; gate on true source pixels.

## 4. Cropping
- Fixed aspect per target: 1:1 for a single tile; N:M for a multi-tile mosaic block (e.g., 3x2 tiles).
- Pan + pinch/scroll zoom; rule-of-thirds grid; reset; rotate 90.
- Export the crop at the source's native resolution (not the on-screen size) so print files are full quality.
- Keep a safe-area overlay so faces/subjects aren't cut by bleed.

## 5. Content moderation (REQUIRED before shipping prints)
- User-generated print content needs a moderation gate: automated check (nudity/violence/hate) via a vision moderation API, plus a manual review queue for flagged or low-confidence items before production.
- Terms acceptance at upload: user affirms they own/all rights to the image. Log consent.
- Store original + crop + moderation verdict with the order.

## 6. Production pipeline
- On purchase, generate a print-ready file per custom tile: cropped region at native res, CMYK-aware export (or printer profile), bleed added, registration marks, tile id + order id in filename.
- Add to the existing Production PDF/print-sheet flow alongside the standard tiles.
- Custom tiles likely carry a small upcharge (print setup) -> a separate Stripe line item; decide price.

## 7. Tech approach
- Cropper: react-easy-crop or a canvas-based cropper; output via canvas/createImageBitmap at native scale.
- HEIC: convert client-side (heic2any) or server-side.
- Upload/store: presigned upload to object storage (Cloudflare R2 / S3); store original + derived crop; do NOT keep in the DB.
- Moderation: vision moderation API on upload; queue UI for manual review.
- Privacy: uploaded photos are personal data -> covered by the privacy policy; define retention (e.g., delete originals N days after fulfillment).

## 8. Phasing
- Phase 1: single-tile photo upload + crop + resolution gate + manual moderation + production export. Flat upcharge.
- Phase 2: multi-tile mosaic (one photo across a block of tiles).
- Phase 3: automated moderation, HEIC, saved photo library, AI auto-crop to subject.

## Open questions for David
- Upcharge per custom tile? Min/max custom tiles per order?
- Printer's exact DPI + bleed spec (confirm the 300 DPI / 0.0625 in assumptions).
- Moderation: automated vendor vs manual-only at low volume?
