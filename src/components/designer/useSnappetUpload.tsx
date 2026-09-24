"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDesignStore } from "@/stores/design-store";
import { SECTION_IDS, SECTION_LABELS } from "@/lib/utils/sections";
import {
  badgeSpanAt,
  badgeSpots,
  panelSnappetPlacement,
  placementContext,
  snappetInches,
  type BadgeSpot,
} from "@/lib/utils/snappet";
import { putFullRes } from "@/lib/utils/image-store";
import { fieldForArtPixels } from "@/lib/utils/tile-theme";
import { reviewUploadedImage } from "@/lib/utils/image-moderation";
import type { FrameConfig, PlacedTile, PlacedTextBar, SectionId, SectionState, TileSpan } from "@/lib/types";
import { placedPreviewPx, thumbnailDataUrl } from "@/lib/utils/uploads";
import { ImageCropModal, type ImageCropResult } from "./ImageCropModal";
import { UploadRightsGate } from "./UploadRightsGate";
import { UPLOAD_RIGHTS, UPLOAD_RIGHTS_VERSION } from "@/content/upload-rights";

// The one upload → crop → snappet flow, shared by the per-section "Add art" button
// (SectionEditor) and the prominent "Upload a photo" button (UploadPhotoButton), so
// the two can never disagree on crop-aspect math or placement. Given a target panel
// and a file, it sizes the crop to where a native-aspect snappet would land, opens
// the crop modal, and on confirm stores the full-res original and drops the art in.
//
// IT IS ALSO WHERE THE RIGHTS GATE LIVES. Every upload entry point in the product
// funnels through `begin`, so the one place a parent can be asked whether they
// hold the rights to what they are about to print is here. Putting it on a button
// would mean the next button added quietly skips it.

/** Decode a file just far enough to read its aspect (width / height). Falls back to
 *  1 (square) on any error, matching suggestSnappetSize's own bad-aspect guard. */
export function readImageAspect(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const a = image.naturalWidth / image.naturalHeight;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(a) && a > 0 ? a : 1);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(1);
    };
    image.src = url;
  });
}

/**
 * Find a panel that can take an uploaded snappet right now: the first section that is
 * NOT a text banner and still has a free cell (`panelSnappetPlacement` is non-null).
 * `preferred` (e.g. the currently-selected section) is tried first. Returns null when
 * every panel is full or set to text — the caller surfaces that to the user.
 */
export function firstUploadableSection(
  frameConfig: FrameConfig,
  slots: Record<string, PlacedTile>,
  sections: Partial<Record<SectionId, SectionState>>,
  textBars: PlacedTextBar[],
  preferred?: SectionId | null,
): SectionId | null {
  const ctx = placementContext(frameConfig, { slots, sections, textBars });
  const order = preferred ? [preferred, ...SECTION_IDS] : SECTION_IDS;
  for (const id of order) {
    if (sections[id]?.mode === "text") continue; // a text banner can't hold art
    if (panelSnappetPlacement(ctx, id, 1, { allowEvict: true })) return id;
  }
  return null;
}

/** Every panel that can take an uploaded snappet right now (not a text banner, and
 *  has a free cell), in SECTION_IDS order. Drives the "where should it go?" prompt. */
export function uploadableSections(
  frameConfig: FrameConfig,
  slots: Record<string, PlacedTile>,
  sections: Partial<Record<SectionId, SectionState>>,
  textBars: PlacedTextBar[],
): SectionId[] {
  const ctx = placementContext(frameConfig, { slots, sections, textBars });
  return SECTION_IDS.filter(
    (id) => sections[id]?.mode !== "text" && panelSnappetPlacement(ctx, id, 1, { allowEvict: true }),
  );
}

/**
 * Where an upload goes: a whole PANEL (its first badge position — the older entry
 * points), or ONE BADGE by its anchor — the one the parent tapped on the frame or
 * picked from the map. On the shipping frame a photo is a badge, so the second is
 * the one that matters: it is the difference between "put it on the middle-left
 * badge" and "put it somewhere on the left".
 */
export type UploadTarget = SectionId | { anchorSlotId: string };

/** "Left side · top badge" — a badge position in words, for the crop header and
 *  the picker's labels. Derived from the positions themselves, so a frame with a
 *  different number of badges per side reads correctly without a copy change. */
export function badgeSpotLabel(spots: BadgeSpot[], anchorSlotId: string): string {
  const spot = spots.find((s) => s.anchorSlotId === anchorSlotId);
  if (!spot) return "this badge";
  const side =
    spot.panel === "wing-left" ? "Left side" : spot.panel === "wing-right" ? "Right side" : SECTION_LABELS[spot.panel];
  const same = spots.filter((s) => s.panel === spot.panel);
  const i = same.indexOf(spot);
  const where =
    same.length === 3 ? ["top", "middle", "bottom"][i] : same.length === 2 ? ["top", "bottom"][i] : `${i + 1}`;
  return same.length === 1 ? `${side} badge` : `${side} · ${where} badge`;
}

export interface SnappetUpload {
  /** Kick off the flow: size the crop for the target and open the crop modal. Pass
   *  `knownAspect` to skip re-decoding when the caller already read it (mobile flow). */
  begin: (file: File, target: UploadTarget, knownAspect?: number) => Promise<void>;
  /**
   * The flow's overlays — the rights gate, then the crop modal — or null when
   * idle. Render wherever the button lives.
   *
   * Named for what it IS rather than for the crop modal it used to be: a field
   * called `cropModal` that can render a legal gate is the kind of name this
   * codebase has been burned by.
   */
  uploadOverlays: ReactNode;
}

export function useSnappetUpload(): SnappetUpload {
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const slots = useDesignStore((s) => s.slots);
  const sections = useDesignStore((s) => s.sections);
  const textBars = useDesignStore((s) => s.textBars);
  const placeImageSnappet = useDesignStore((s) => s.placeImageSnappet);
  // The badge field the letterbox of a "fit the whole image" crop shows, so the
  // crop window previews the badge the parent will actually get.
  const tileFieldColor = useDesignStore((s) => s.tileFieldColor);
  const addUpload = useDesignStore((s) => s.addUpload);
  const artworkRights = useDesignStore((s) => s.artworkRights);
  const acceptArtworkRights = useDesignStore((s) => s.acceptArtworkRights);

  // The file waiting to be cropped, plus the crop's aspect target (the SUGGESTED
  // snappet's physical size) and the panel it lands in. The aspect target makes the
  // crop match where the art will go — so a native-aspect upload needs little crop.
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<{ width: number; height: number } | null>(null);
  const [target, setTarget] = useState<SectionId | null>(null);
  // The crop header's words for where this is going ("Left side · top badge").
  const [targetLabel, setTargetLabel] = useState<string>("");
  // THE placement, decided once in `begin`: the crop is cut to it and the commit
  // seats it. Deciding twice is how a crop and its badge came to disagree.
  const pendingPlacement = useRef<{ anchorSlotId: string; span: TileSpan } | null>(null);
  const pendingAspect = useRef<number>(1);
  // The footprint the crop was sized against, and the file's own name. Both ride
  // along to the palette entry so a re-place reproduces the shape the user already
  // approved instead of guessing a new one from the aspect.
  const pendingSpan = useRef<TileSpan>({ cols: 1, rows: 1 });
  const pendingName = useRef<string>("Upload");
  // An upload held at the rights gate: everything the crop step needs, waiting on
  // one tap. Held rather than re-derived so accepting does not redo the decode.
  const [gated, setGated] = useState<
    { file: File; section: SectionId; label: string; cropTarget: { width: number; height: number } } | null
  >(null);

  const begin = async (file: File, to: UploadTarget, knownAspect?: number) => {
    const aspect = knownAspect ?? (await readImageAspect(file));
    pendingAspect.current = aspect;
    const ctx = placementContext(frameConfig, { slots, sections, textBars });
    // ONE BADGE, named. Its footprint is the badge that is there (or the square
    // the frame seats there), never a size the photo's shape suggests.
    const named = typeof to === "string" ? null : to.anchorSlotId;
    const namedAt = named ? ctx.grid.coordOf(named) : null;
    const sectionId: SectionId | null =
      typeof to === "string" ? to : namedAt ? ctx.grid.panelAt(namedAt.row, namedAt.col) : null;
    if (!sectionId) return; // an anchor this frame does not have
    const namedSpan = namedAt && ctx.badges.square ? badgeSpanAt(ctx, namedAt, named ?? undefined) : null;
    // The SAME floor the commit below uses, so the crop's aspect target matches the
    // footprint the photo actually lands at. Sizing the crop for 1x1 and then placing
    // a 2x2 would hand back a crop of the wrong shape.
    const placement =
      named && namedSpan
        ? { anchorSlotId: named, span: namedSpan }
        : panelSnappetPlacement(ctx, sectionId, aspect, {
            allowEvict: true,
            minSpan: frameConfig.minTileSpan,
          });
    pendingPlacement.current = placement;
    const label = placement && ctx.badges.square
      ? badgeSpotLabel(badgeSpots(frameConfig, { slots, sections, textBars }), placement.anchorSlotId)
      : SECTION_LABELS[sectionId];
    const span = placement?.span ?? frameConfig.minTileSpan ?? { cols: 1, rows: 1 };
    pendingSpan.current = span;
    pendingName.current = file.name.replace(/\.[^.]+$/, "").slice(0, 40) || "Upload";
    // The footprint's PHYSICAL size at the cell it will land on — the crop's
    // aspect target and the DPI gate's denominator. `span x tile` assumed every
    // column is one tile wide; on the 15.5" frame a side badge is 2.25 x 2.25 and
    // that formula locked the crop to 2 x 1, then reported 300 DPI on a print
    // that resolves at 133 — below the hard block, which could therefore never
    // fire. No placement means no anchor yet: fall back to the panel's own cell.
    //
    // On a square-rule frame the placement IS a square badge, so this is a square
    // crop whatever the photo's shape — a tall photo no longer claims the column.
    const pitch = { width: span.cols * frameConfig.tileSizeInches, height: span.rows * frameConfig.tileSizeInches };
    const side = Math.max(pitch.width, pitch.height);
    const cropInches = placement
      ? snappetInches(frameConfig, placement.anchorSlotId, span)
      : frameConfig.badgeShape === "square"
        ? { width: side, height: side }
        : pitch;

    // THE GATE. Once per design, before the first upload reaches the crop step —
    // the moment the parent has chosen a file is the moment the question is real,
    // and it is still early enough that nobody has spent effort on a crop. A
    // record made under older wording does not count: `UPLOAD_RIGHTS_VERSION` is
    // compared, not mere presence.
    if (artworkRights?.version !== UPLOAD_RIGHTS_VERSION) {
      setGated({ file, section: sectionId, label, cropTarget: cropInches });
      return;
    }

    setCropTarget(cropInches);
    setTargetLabel(label);
    setTarget(sectionId);
    setCropFile(file);
  };

  // The field this art needs under it (light art → navy, dark art → white),
  // sampled from the confirmed crop. Print used to hard-code white and the
  // builder painted nothing, so a white school logo was visible on screen and
  // invisible on the printed part — deriving ONCE here and storing it on the
  // tile is what keeps the two renderers agreeing about every upload forever.
  const deriveField = (previewUrl: string): Promise<string | undefined> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          // A sample is enough — the verdict is one bit (light or dark art).
          const scale = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
          c.width = Math.max(1, Math.round(img.naturalWidth * scale));
          c.height = Math.max(1, Math.round(img.naturalHeight * scale));
          const ctx = c.getContext("2d", { willReadFrequently: true });
          if (!ctx) return resolve(undefined);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(fieldForArtPixels(ctx.getImageData(0, 0, c.width, c.height).data));
        } catch {
          resolve(undefined); // tainted/failed → legacy white fallback downstream
        }
      };
      img.onerror = () => resolve(undefined);
      img.src = previewUrl;
    });

  const onCropConfirm = async (result: ImageCropResult) => {
    if (!target) return;
    const id = crypto.randomUUID();
    try {
      await putFullRes(id, result.fullResBlob);
    } catch {
      // IndexedDB unavailable. The original is NOT recoverable after this; print
      // falls back to the tile's own copy, which placedPreviewPx sizes for 300 DPI.
    }
    // Moderation integration point: user prints MUST be gated by a real server-side
    // vision check before production. No-op today (it does not fake an approval).
    void reviewUploadedImage(result.fullResBlob);
    const field = await deriveField(result.previewUrl);
    // Into the TRAY as well as onto the frame. Placing it once was the whole flow,
    // which meant a crest on both wings was the same file uploaded twice. It is added
    // before the placement so the palette has it even if the panel turns out to be
    // full and the placement is refused.
    // A THUMBNAIL, not the crop preview. The preview is up to 1200px and measured at
    // 4.1 MB as a data URL — putting a second copy of that in the persisted design
    // pushed it straight past localStorage's quota, and the design then failed to
    // save at all. Print is unaffected: it reads the full-res original from IndexedDB
    // by `fullResId`, which every tile placed from this entry carries.
    addUpload({
      name: pendingName.current,
      url: await thumbnailDataUrl(result.previewUrl),
      fullResId: id,
      aspect: pendingAspect.current,
      span: pendingSpan.current,
      field,
    });
    placeImageSnappet(
      target,
      {
        // A print-sized badge copy, not the 1200px crop preview — see placedPreviewPx.
        imageUrl: await thumbnailDataUrl(result.previewUrl, placedPreviewPx(frameConfig)),
        fullResId: id,
        sourceAspect: pendingAspect.current,
        field,
      },
      frameConfig.minTileSpan,
      pendingPlacement.current ?? undefined,
    );
    pendingPlacement.current = null;
    setCropFile(null);
    setCropTarget(null);
    setTarget(null);
  };

  // Portaled to <body> so no transformed/clipping ancestor can trap the fixed
  // overlay (a real iOS failure mode). Guarded for SSR (document is undefined).
  const ssr = typeof document === "undefined";

  const gate =
    gated && !ssr
      ? createPortal(
          <UploadRightsGate
            onAccept={() => {
              acceptArtworkRights();
              // Straight on to the crop step with the work `begin` already did.
              setCropTarget(gated.cropTarget);
              setTargetLabel(gated.label);
              setTarget(gated.section);
              setCropFile(gated.file);
              setGated(null);
            }}
            onCancel={() => setGated(null)}
          />,
          document.body,
        )
      : null;

  const cropModal =
    cropFile && cropTarget && target && !ssr
      ? createPortal(
          <ImageCropModal
            file={cropFile}
            targetInches={cropTarget}
            panelLabel={targetLabel || SECTION_LABELS[target]}
            fieldColor={tileFieldColor ?? undefined}
            note={UPLOAD_RIGHTS.reminder}
            onCancel={() => {
              setCropFile(null);
              setCropTarget(null);
              setTarget(null);
            }}
            onConfirm={onCropConfirm}
          />,
          document.body,
        )
      : null;

  return { begin, uploadOverlays: gate ?? cropModal };
}
