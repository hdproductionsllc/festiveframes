"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDesignStore } from "@/stores/design-store";
import { SECTION_IDS, SECTION_LABELS } from "@/lib/utils/sections";
import { buildGrid } from "@/lib/utils/slot-generator";
import { coveredSlotIds } from "@/lib/utils/text-bar";
import { panelSnappetPlacement } from "@/lib/utils/snappet";
import { putFullRes } from "@/lib/utils/image-store";
import { reviewUploadedImage } from "@/lib/utils/image-moderation";
import type { FrameConfig, PlacedTile, PlacedTextBar, SectionId, SectionState, TileSpan } from "@/lib/types";
import { thumbnailDataUrl } from "@/lib/utils/uploads";
import { ImageCropModal, type ImageCropResult } from "./ImageCropModal";

// The one upload → crop → snappet flow, shared by the per-section "Add art" button
// (SectionEditor) and the prominent "Upload a photo" button (UploadPhotoButton), so
// the two can never disagree on crop-aspect math or placement. Given a target panel
// and a file, it sizes the crop to where a native-aspect snappet would land, opens
// the crop modal, and on confirm stores the full-res original and drops the art in.

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
  const grid = buildGrid(frameConfig);
  const ctx = { grid, slots, sections, barCovered: new Set(coveredSlotIds(textBars)) };
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
  const grid = buildGrid(frameConfig);
  const ctx = { grid, slots, sections, barCovered: new Set(coveredSlotIds(textBars)) };
  return SECTION_IDS.filter(
    (id) => sections[id]?.mode !== "text" && panelSnappetPlacement(ctx, id, 1, { allowEvict: true }),
  );
}

export interface SnappetUpload {
  /** Kick off the flow: size the crop for `sectionId` and open the crop modal. Pass
   *  `knownAspect` to skip re-decoding when the caller already read it (mobile flow). */
  begin: (file: File, sectionId: SectionId, knownAspect?: number) => Promise<void>;
  /** The crop modal, or null when idle. Render this wherever the button lives. */
  cropModal: ReactNode;
}

export function useSnappetUpload(): SnappetUpload {
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const slots = useDesignStore((s) => s.slots);
  const sections = useDesignStore((s) => s.sections);
  const textBars = useDesignStore((s) => s.textBars);
  const placeImageSnappet = useDesignStore((s) => s.placeImageSnappet);
  const addUpload = useDesignStore((s) => s.addUpload);

  // The file waiting to be cropped, plus the crop's aspect target (the SUGGESTED
  // snappet's physical size) and the panel it lands in. The aspect target makes the
  // crop match where the art will go — so a native-aspect upload needs little crop.
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<{ width: number; height: number } | null>(null);
  const [target, setTarget] = useState<SectionId | null>(null);
  const pendingAspect = useRef<number>(1);
  // The footprint the crop was sized against, and the file's own name. Both ride
  // along to the palette entry so a re-place reproduces the shape the user already
  // approved instead of guessing a new one from the aspect.
  const pendingSpan = useRef<TileSpan>({ cols: 1, rows: 1 });
  const pendingName = useRef<string>("Upload");

  const begin = async (file: File, sectionId: SectionId, knownAspect?: number) => {
    const aspect = knownAspect ?? (await readImageAspect(file));
    pendingAspect.current = aspect;
    const grid = buildGrid(frameConfig);
    const ctx = { grid, slots, sections, barCovered: new Set(coveredSlotIds(textBars)) };
    // The SAME floor the commit below uses, so the crop's aspect target matches the
    // footprint the photo actually lands at. Sizing the crop for 1x1 and then placing
    // a 2x2 would hand back a crop of the wrong shape.
    const placement = panelSnappetPlacement(ctx, sectionId, aspect, {
      allowEvict: true,
      minSpan: frameConfig.minTileSpan,
    });
    const span = placement?.span ?? frameConfig.minTileSpan ?? { cols: 1, rows: 1 };
    pendingSpan.current = span;
    pendingName.current = file.name.replace(/\.[^.]+$/, "").slice(0, 40) || "Upload";
    // Every grid column is exactly one tile wide (the grid invariant), so the snappet's
    // physical size is just span × tile — the crop's aspect target + the gate denominator.
    setCropTarget({
      width: span.cols * frameConfig.tileSizeInches,
      height: span.rows * frameConfig.tileSizeInches,
    });
    setTarget(sectionId);
    setCropFile(file);
  };

  const onCropConfirm = async (result: ImageCropResult) => {
    if (!target) return;
    const id = crypto.randomUUID();
    try {
      await putFullRes(id, result.fullResBlob);
    } catch {
      /* IndexedDB unavailable → the preview still renders; full-res is re-derivable */
    }
    // Moderation integration point: user prints MUST be gated by a real server-side
    // vision check before production. No-op today (it does not fake an approval).
    void reviewUploadedImage(result.fullResBlob);
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
    });
    placeImageSnappet(
      target,
      {
        imageUrl: result.previewUrl,
        fullResId: id,
        sourceAspect: pendingAspect.current,
      },
      frameConfig.minTileSpan,
    );
    setCropFile(null);
    setCropTarget(null);
    setTarget(null);
  };

  // Portaled to <body> so no transformed/clipping ancestor can trap the fixed
  // overlay (a real iOS failure mode). Guarded for SSR (document is undefined).
  const cropModal =
    cropFile && cropTarget && target && typeof document !== "undefined"
      ? createPortal(
          <ImageCropModal
            file={cropFile}
            targetInches={cropTarget}
            panelLabel={SECTION_LABELS[target]}
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

  return { begin, cropModal };
}
