"use client";

import { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { useDesignStore } from "@/stores/design-store";
import { getFullRes, putFullRes } from "@/lib/utils/image-store";
import { reviewUploadedImage } from "@/lib/utils/image-moderation";
import { buildGrid } from "@/lib/utils/slot-generator";
import { SECTION_LABELS } from "@/lib/utils/sections";
import { ImageCropModal, type ImageCropResult } from "./ImageCropModal";

// ─── Re-crop an image-snappet resized to a non-matching aspect ────────────────
//
// The agreed rule: an uploaded photo enters at its NATIVE aspect (zero crop) and a
// resize that STAYS at that aspect stays zero-crop, but a resize to a shape the
// photo does NOT match is exactly when the crop/reposition tool + print-DPI gate
// must appear — never a silent objectFit:cover.
//
// FrameCanvas's resize commit detects that aspect change and, instead of committing
// a silent crop, parks the pending footprint in the UI store (`recropRequest`). This
// component owns the crop modal for that flow: it loads the source at full print
// resolution from IndexedDB (falling back to the on-screen preview proxy so a
// re-crop is ALWAYS possible — the DPI gate then grades that honestly), re-opens
// ImageCropModal targeted at the new footprint, and on confirm commits the resize
// and the freshly-cropped art in ONE undoable step. Cancelling leaves the snappet at
// its current size.
//
// School builder only; it is rendered under the school store provider. With no
// pending request (every /build interaction) it renders nothing.
export function SnappetRecropModal() {
  const recropRequest = useUIStore((s) => s.recropRequest);
  const clearRecrop = useUIStore((s) => s.clearRecrop);
  const resizeTile = useDesignStore((s) => s.resizeTile);
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const slots = useDesignStore((s) => s.slots);

  const tile = recropRequest ? slots[recropRequest.slotId] : undefined;
  const image = tile?.image;

  const fullResId = image?.fullResId;
  const previewUrl = image?.url;
  // Identity of the CURRENT request, so a blob loaded for an earlier request is never
  // shown against this one's target (which would flash a stale crop for a frame).
  const requestKey = recropRequest
    ? `${recropRequest.slotId}:${recropRequest.cols}:${recropRequest.rows}:${fullResId ?? previewUrl ?? ""}`
    : null;

  // The source blob to re-crop (full-res original, else the preview proxy), tagged
  // with the request it was loaded for.
  const [loaded, setLoaded] = useState<{ key: string; blob: Blob } | null>(null);

  useEffect(() => {
    if (!requestKey || !image) return;
    let cancelled = false;
    (async () => {
      let blob: Blob | null = fullResId ? await getFullRes(fullResId) : null;
      // Full-res unavailable (evicted cache / preview-only design) → re-crop the
      // preview proxy instead of failing. It is lower-res, so the meter may grade it
      // amber/red, which is the honest signal — never a hidden loss of sharpness.
      if (!blob && previewUrl) {
        try {
          blob = await fetch(previewUrl).then((r) => r.blob());
        } catch {
          blob = null;
        }
      }
      if (!cancelled && blob) setLoaded({ key: requestKey, blob });
    })();
    return () => {
      cancelled = true;
    };
  }, [requestKey, image, fullResId, previewUrl]);

  // Only the blob loaded for THIS request counts; a stale one reads as "still
  // loading" (render nothing) rather than a wrong crop.
  const source = loaded && loaded.key === requestKey ? loaded.blob : null;
  if (!recropRequest || !image || !source) return null;

  // Every grid column is exactly one tile wide (the grid invariant), so the new
  // footprint's physical size — the crop aspect target and the DPI denominator — is
  // just span × tile.
  const targetInches = {
    width: recropRequest.cols * frameConfig.tileSizeInches,
    height: recropRequest.rows * frameConfig.tileSizeInches,
  };

  // Best-effort panel name for the modal header (which panel the snappet sits in).
  const grid = buildGrid(frameConfig);
  const coord = grid.coordOf(recropRequest.slotId);
  const panel = coord ? grid.panelAt(coord.row, coord.col) : null;
  const panelLabel = panel ? SECTION_LABELS[panel] : undefined;

  const close = () => {
    setLoaded(null);
    clearRecrop();
  };

  const onConfirm = async (result: ImageCropResult) => {
    const id = crypto.randomUUID();
    try {
      await putFullRes(id, result.fullResBlob);
    } catch {
      /* IndexedDB unavailable → the preview still renders; full-res is re-derivable */
    }
    // Same moderation integration point as the first upload — gated server-side
    // before production; a no-op here (it does not fake an approval).
    void reviewUploadedImage(result.fullResBlob);
    // Resize + swap the art atomically (one history step). The OLD full-res id is
    // left to the store's reachability GC — it stays restorable via undo until the
    // pre-resize snapshot falls out of history.
    resizeTile(recropRequest.slotId, { cols: recropRequest.cols, rows: recropRequest.rows }, {
      url: result.previewUrl,
      fullResId: id,
    });
    close();
  };

  return (
    <ImageCropModal
      file={source}
      targetInches={targetInches}
      panelLabel={panelLabel}
      onCancel={close}
      onConfirm={onConfirm}
    />
  );
}
