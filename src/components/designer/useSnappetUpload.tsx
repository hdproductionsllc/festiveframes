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
import type { FrameConfig, PlacedTile, PlacedTextBar, SectionId, SectionState } from "@/lib/types";
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

  // The file waiting to be cropped, plus the crop's aspect target (the SUGGESTED
  // snappet's physical size) and the panel it lands in. The aspect target makes the
  // crop match where the art will go — so a native-aspect upload needs little crop.
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<{ width: number; height: number } | null>(null);
  const [target, setTarget] = useState<SectionId | null>(null);
  const pendingAspect = useRef<number>(1);

  const begin = async (file: File, sectionId: SectionId, knownAspect?: number) => {
    const aspect = knownAspect ?? (await readImageAspect(file));
    pendingAspect.current = aspect;
    const grid = buildGrid(frameConfig);
    const ctx = { grid, slots, sections, barCovered: new Set(coveredSlotIds(textBars)) };
    const placement = panelSnappetPlacement(ctx, sectionId, aspect, { allowEvict: true });
    const span = placement?.span ?? { cols: 1, rows: 1 };
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
    placeImageSnappet(target, {
      imageUrl: result.previewUrl,
      fullResId: id,
      sourceAspect: pendingAspect.current,
    });
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
