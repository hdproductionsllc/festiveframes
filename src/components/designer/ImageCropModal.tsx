"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  evaluateResolution,
  RESOLUTION_COPY,
  type ResolutionLevel,
} from "@/lib/utils/print-resolution";
import { keyBackground, KEY_REFUSAL_COPY, type KeyReport } from "@/lib/utils/key-background";

// ─── Crop / reposition / zoom modal (school builder image upload) ─────────────
//
// A customer uploads a mascot/logo/photo that fills a school panel. This modal lets
// them pan + zoom to frame the shot, aspect-LOCKED to the panel's print rectangle,
// and grades the crop live for print resolution. On confirm it produces TWO outputs
// from the SOURCE image at its NATIVE resolution (never the on-screen size — that is
// the load-bearing detail: zooming shrinks the source pixels behind the viewport, so
// the export must sample the true source rect, not the scaled preview):
//   (a) a full-resolution cropped blob (goes to IndexedDB for print/export),
//   (b) a small (<=1200 px) preview data URL (goes into the persisted design).
//
// The resolution gate is DPI, computed against the panel's physical inches, so the
// meter is honest for a tiny top bar and a tall side panel alike (see
// utils/print-resolution). Confirm is blocked while the crop grades RED.

const PREVIEW_MAX_PX = 1200; // on-screen proxy cap (keeps localStorage small)
const MAX_ZOOM = 12;
const BLEED_INCHES = 0.0625; // borderless seam — subjects near it can be lost
const VIEWPORT_MAX_W = 460;
const VIEWPORT_MAX_H = 360;

const METER_COLOR: Record<ResolutionLevel, string> = {
  green: "#2e9e5b",
  amber: "#e8a11c",
  red: "#C8102E",
};

export interface ImageCropResult {
  /** Small (<=1200 px) preview data URL for on-screen render + the persisted design. */
  previewUrl: string;
  /** Full-resolution cropped original — stored in IndexedDB, used for print/export. */
  fullResBlob: Blob;
  /** Effective print DPI of the confirmed crop. */
  dpi: number;
}

interface ImageCropModalProps {
  /** Source image to crop. A File on first upload; a Blob (the stored full-res
   *  original, or the preview proxy) when re-cropping a placed snappet. */
  file: Blob;
  /** Physical print size of the target panel, in inches (drives aspect + the gate). */
  targetInches: { width: number; height: number };
  /** Panel name, shown in the header. */
  panelLabel?: string;
  onCancel: () => void;
  onConfirm: (result: ImageCropResult) => void;
}

/** True if any pixel is even slightly transparent (a logo cutout) → keep PNG;
 *  fully-opaque photos compress far smaller as JPEG. Scans a small sample canvas. */
function hasTransparency(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  try {
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
    return false;
  } catch {
    return true; // tainted canvas → PNG to be safe
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Long edge of the cheap copy the background check runs on first. Deciding whether
 *  to even OFFER the cut-out must not cost a full-resolution pass on every upload. */
const KEY_PROBE_PX = 360;

/** Turn the cut-out ON by itself only when the backdrop is unmistakably a flat card.
 *  Above `MIN_FLATNESS` the control is offered; this much higher bar is what
 *  separates a scanned crest from a photo taken against a plain wall, which should
 *  never be silently cut out. */
const KEY_AUTO_FLATNESS = 0.9;

/** Run the keyer over a copy of `source` and hand back a decoded image, or null when
 *  it declined. Keeps the canvas work out of the component body. */
async function keyToImage(
  source: HTMLImageElement,
): Promise<{ image: HTMLImageElement; url: string; report: KeyReport } | null> {
  const c = document.createElement("canvas");
  c.width = source.naturalWidth;
  c.height = source.naturalHeight;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0);
  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, c.width, c.height);
  } catch {
    return null; // tainted canvas — nothing to read, nothing to key
  }
  const report = keyBackground(data);
  if (!report.keyed) return null;
  ctx.putImageData(data, 0, 0);
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/png"));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  const image = new Image();
  const ok = await new Promise<boolean>((res) => {
    image.onload = () => res(true);
    image.onerror = () => res(false);
    image.src = url;
  });
  if (!ok) {
    URL.revokeObjectURL(url);
    return null;
  }
  return { image, url, report };
}

export function ImageCropModal({ file, targetInches, panelLabel, onCancel, onConfirm }: ImageCropModalProps) {
  const aspect = targetInches.width / targetInches.height;

  // Viewport (the crop window) — the LARGEST rectangle of the panel's EXACT aspect
  // that fits inside the bounded box. The aspect lock is load-bearing: the crop the
  // user frames here, the dashed safe-area overlay, `cropSource`, the exported blob,
  // and the on-frame objectFit:cover box must all share one aspect, or the frame adds
  // an uncontrolled cover-crop the user never saw. So we NEVER clamp a single axis to
  // a minimum "for grabbability" (that silently distorts the aspect); an extreme panel
  // (tall side field 0.25, wide banner 10.0) simply renders as a thin strip showing
  // the whole panel — which is exactly what the user is framing. Kept as floats so
  // viewport.w / viewport.h === aspect exactly (rounding would reintroduce the drift).
  const viewport = useMemo(() => {
    let w = VIEWPORT_MAX_W;
    let h = w / aspect;
    if (h > VIEWPORT_MAX_H) {
      h = VIEWPORT_MAX_H;
      w = h * aspect;
    }
    return { w, h };
  }, [aspect]);

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  // ── Cut the background out ──────────────────────────────────────────────────
  // A crest arrives on a white card far more often than it arrives cut out, and
  // dropped on a navy banner that card reads as a white box with a logo in it. The
  // keyer lives in lib/utils/key-background; this holds the two images (original and
  // cut-out) and which one is live.
  const [keyOn, setKeyOn] = useState(false);
  const [keyedImg, setKeyedImg] = useState<HTMLImageElement | null>(null);
  const [keyReport, setKeyReport] = useState<KeyReport | null>(null);
  const [keying, setKeying] = useState(false);
  /** Null until the cheap probe has run; false when there is no flat backdrop here. */
  const [keyOffered, setKeyOffered] = useState<boolean | null>(null);

  // The image everything downstream reads — display, the crop rect, and the export.
  const active = keyOn && keyedImg ? keyedImg : img;

  const imgRef = useRef<HTMLImageElement | null>(null);
  imgRef.current = active;

  // Cover-fit scale: at zoom 1 the image exactly fills the viewport (no letterbox).
  const baseScale = useMemo(() => {
    if (!img) return 1;
    return Math.max(viewport.w / img.naturalWidth, viewport.h / img.naturalHeight);
  }, [img, viewport]);

  // Keep the image covering the viewport for any zoom (offset ranges are negative).
  const clampOffset = useCallback(
    (x: number, y: number, z: number) => {
      if (!img) return { x: 0, y: 0 };
      const dw = img.naturalWidth * baseScale * z;
      const dh = img.naturalHeight * baseScale * z;
      return { x: clamp(x, viewport.w - dw, 0), y: clamp(y, viewport.h - dh, 0) };
    },
    [img, baseScale, viewport],
  );

  const center = useCallback(
    (z: number) => {
      if (!img) return { x: 0, y: 0 };
      const dw = img.naturalWidth * baseScale * z;
      const dh = img.naturalHeight * baseScale * z;
      return { x: (viewport.w - dw) / 2, y: (viewport.h - dh) / 2 };
    },
    [img, baseScale, viewport],
  );

  // Load the file → decode → center it. Object URL revoked on unmount/replace.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setLoadError(false);
    };
    image.onerror = () => setLoadError(true);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Center once the image + geometry are known.
  useEffect(() => {
    if (img) {
      setZoom(1);
      setOffset(center(1));
    }
  }, [img, center]);

  // Is there a flat backdrop here at all? Answered on a small copy, because this runs
  // on EVERY upload and a full-resolution pass to decide whether to show a checkbox
  // would be paid for by every photo that was never going to be cut out.
  useEffect(() => {
    if (!img) return;
    setKeyOffered(null);
    setKeyedImg(null);
    setKeyReport(null);
    setKeyOn(false);
    const scale = Math.min(1, KEY_PROBE_PX / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * scale));
    c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return setKeyOffered(false);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    let report: KeyReport;
    try {
      const data = ctx.getImageData(0, 0, c.width, c.height);
      report = keyBackground(data);
    } catch {
      return setKeyOffered(false); // tainted canvas
    }
    setKeyReport(report);
    setKeyOffered(report.keyed);
    // Flat enough to be a card rather than a wall — take the cut-out without being
    // asked. Everything else waits to be asked.
    if (report.keyed && report.flatness >= KEY_AUTO_FLATNESS) setKeyOn(true);
  }, [img]);

  // Do the real thing at full resolution, once, the first time it is switched on.
  // Deliberately lazy: a 12 MP phone photo is seconds of pixel work and most uploads
  // never turn this on.
  // `keying` is tracked in a REF as well as in state, and deliberately kept OUT of the
  // dependency list. Putting it in makes the effect re-run the moment it sets the flag,
  // the cleanup marks the in-flight run stale, and the result is then thrown away
  // without ever clearing the flag — the modal sat on "working..." forever.
  const keyingRef = useRef(false);
  useEffect(() => {
    if (!keyOn || !img || keyedImg || keyingRef.current) return;
    let live = true;
    keyingRef.current = true;
    setKeying(true);
    void keyToImage(img).then((res) => {
      keyingRef.current = false;
      if (!live) {
        if (res) URL.revokeObjectURL(res.url);
        return;
      }
      setKeying(false);
      if (!res) {
        setKeyOn(false);
        setKeyOffered(false);
        return;
      }
      setKeyedImg(res.image);
      setKeyReport(res.report);
    });
    return () => { live = false; };
  }, [keyOn, img, keyedImg]);

  // The cut-out's object URL outlives the effect that made it (the <img> holds it),
  // so it is released when the image is replaced or the modal closes.
  useEffect(() => {
    const url = keyedImg?.src;
    return () => { if (url?.startsWith("blob:")) URL.revokeObjectURL(url); };
  }, [keyedImg]);

  const reset = useCallback(() => {
    setZoom(1);
    setOffset(center(1));
  }, [center]);

  // Zoom around a viewport-space anchor, keeping the source point under it fixed.
  const applyZoom = useCallback(
    (nextZoom: number, anchorX: number, anchorY: number) => {
      if (!img) return;
      const z = clamp(nextZoom, 1, MAX_ZOOM);
      setOffset((prev) => {
        const oldScale = baseScale * zoom;
        const newScale = baseScale * z;
        const sx = (anchorX - prev.x) / oldScale;
        const sy = (anchorY - prev.y) / oldScale;
        return clampOffset(anchorX - sx * newScale, anchorY - sy * newScale, z);
      });
      setZoom(z);
    },
    [img, baseScale, zoom, clampOffset],
  );

  // ── Pointer interaction: drag to pan, two-finger pinch to zoom ──────────────
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; zoom: number; midX: number; midY: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        zoom,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);

    if (pointers.current.size >= 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      applyZoom(
        (pinchStart.current.zoom * dist) / pinchStart.current.dist,
        pinchStart.current.midX - rect.left,
        pinchStart.current.midY - rect.top,
      );
      return;
    }
    // Single-pointer drag → pan.
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    setOffset((o) => clampOffset(o.x + dx, o.y + dy, zoom));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const factor = Math.exp(-e.deltaY * 0.0015);
    applyZoom(zoom * factor, e.clientX - rect.left, e.clientY - rect.top);
  };

  // ── Live crop geometry (source pixels) + resolution verdict ─────────────────
  const cropSource = useMemo(() => {
    if (!img) return { x: 0, y: 0, width: 0, height: 0 };
    const scale = baseScale * zoom;
    return {
      x: -offset.x / scale,
      y: -offset.y / scale,
      width: viewport.w / scale,
      height: viewport.h / scale,
    };
  }, [img, baseScale, zoom, offset, viewport]);

  const verdict = useMemo(
    () => evaluateResolution({ width: cropSource.width, height: cropSource.height }, targetInches),
    [cropSource.width, cropSource.height, targetInches],
  );

  // ── Confirm: export full-res crop + small preview from the SOURCE image ──────
  const handleConfirm = async () => {
    const image = imgRef.current;
    if (!image || verdict.blocked || busy) return;
    setBusy(true);
    try {
      const sx = Math.max(0, cropSource.x);
      const sy = Math.max(0, cropSource.y);
      const sw = Math.min(cropSource.width, image.naturalWidth - sx);
      const sh = Math.min(cropSource.height, image.naturalHeight - sy);

      // Full-resolution crop, drawn at NATIVE source pixels.
      const full = document.createElement("canvas");
      full.width = Math.max(1, Math.round(sw));
      full.height = Math.max(1, Math.round(sh));
      const fctx = full.getContext("2d");
      if (!fctx) throw new Error("no ctx");
      fctx.drawImage(image, sx, sy, sw, sh, 0, 0, full.width, full.height);

      // Small preview (<=1200 px long edge) from the same crop.
      const pScale = Math.min(1, PREVIEW_MAX_PX / Math.max(full.width, full.height));
      const preview = document.createElement("canvas");
      preview.width = Math.max(1, Math.round(full.width * pScale));
      preview.height = Math.max(1, Math.round(full.height * pScale));
      const pctx = preview.getContext("2d");
      if (!pctx) throw new Error("no ctx");
      pctx.drawImage(full, 0, 0, preview.width, preview.height);

      const transparent = hasTransparency(preview);
      const mime = transparent ? "image/png" : "image/jpeg";
      const previewUrl = transparent
        ? preview.toDataURL("image/png")
        : preview.toDataURL("image/jpeg", 0.85);

      const fullResBlob = await new Promise<Blob>((resolve, reject) => {
        full.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("blob failed"))),
          mime,
          transparent ? undefined : 0.92, // higher quality for the print original
        );
      });

      onConfirm({ previewUrl, fullResBlob, dpi: verdict.dpi });
    } catch {
      setBusy(false);
    }
  };

  const copy = RESOLUTION_COPY[verdict.level];
  const meterPct = clamp(Math.round((verdict.dpi / 300) * 100), 4, 100);

  // Safe-area inset (fraction of the viewport that the bleed seam can eat).
  const insetX = clamp(BLEED_INCHES / targetInches.width, 0, 0.25) * viewport.w;
  const insetY = clamp(BLEED_INCHES / targetInches.height, 0, 0.25) * viewport.h;

  return (
    <div
      className="ff-school-portal ff-scrim fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="ff-modal w-full max-w-[560px] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="ff-h2">Crop for {panelLabel ?? "panel"}</h3>
          {/* The ✕ is this button's only label, so it is replaced rather than
              dropped. Same house spec as every other icon in the re-skin. */}
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="ff-btn ff-btn-secondary ff-btn-icon"
          >
            <svg
              aria-hidden
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
            </svg>
          </button>
        </div>

        {loadError ? (
          <p className="py-8 text-center text-[13px] text-[var(--ff-danger)]">
            That image could not be read. Try a JPG or PNG.
          </p>
        ) : (
          <>
            {/* Crop viewport */}
            <div className="flex justify-center">
              <div
                className="relative touch-none select-none overflow-hidden rounded-[6px] border border-[var(--ff-line-strong)]"
                style={{
                  width: viewport.w,
                  height: viewport.h,
                  cursor: "grab",
                  // A CHECKERBOARD under a cut-out, a flat field otherwise. Showing
                  // transparency against the modal's dark ink made a keyed white logo
                  // look identical to a keyed white card — the one thing this control
                  // exists to let someone tell apart.
                  ...(keyOn && keyedImg
                    ? {
                        backgroundColor: "#ffffff",
                        backgroundImage:
                          "linear-gradient(45deg,#d8d8d6 25%,transparent 25%,transparent 75%,#d8d8d6 75%)," +
                          "linear-gradient(45deg,#d8d8d6 25%,transparent 25%,transparent 75%,#d8d8d6 75%)",
                        backgroundSize: "16px 16px",
                        backgroundPosition: "0 0, 8px 8px",
                      }
                    : { backgroundColor: "var(--ff-ink)" }),
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onWheel={onWheel}
              >
                {img && active && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={active.src}
                    alt=""
                    draggable={false}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: img.naturalWidth * baseScale * zoom,
                      height: img.naturalHeight * baseScale * zoom,
                      // Tailwind Preflight sets `img{max-width:100%;height:auto}`, which
                      // would clamp our explicit cover-fit width to the container and
                      // break the WYSIWYG preview. Let our width/transform math win.
                      maxWidth: "none",
                      minWidth: 0,
                      transform: `translate(${offset.x}px, ${offset.y}px)`,
                    }}
                  />
                )}

                {/* Rule-of-thirds grid */}
                <div className="pointer-events-none absolute inset-0">
                  {[1, 2].map((i) => (
                    <div
                      key={`v${i}`}
                      className="absolute top-0 bottom-0 w-px bg-white/40"
                      style={{ left: `${(i / 3) * 100}%` }}
                    />
                  ))}
                  {[1, 2].map((i) => (
                    <div
                      key={`h${i}`}
                      className="absolute left-0 right-0 h-px bg-white/40"
                      style={{ top: `${(i / 3) * 100}%` }}
                    />
                  ))}
                </div>

                {/* Safe-area overlay — keep faces/subjects inside this dashed inset;
                    art outside it can be lost to the borderless print seam. */}
                <div
                  className="pointer-events-none absolute rounded-[2px] border-2 border-dashed border-[#f8c53b]/80"
                  style={{ left: insetX, top: insetY, right: insetX, bottom: insetY }}
                />
              </div>
            </div>

            {/* Zoom control */}
            <div className="mt-3 flex items-center gap-3">
              <span className="ff-label">Zoom</span>
              <input
                type="range"
                min={1}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(e) => applyZoom(Number(e.target.value), viewport.w / 2, viewport.h / 2)}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--ff-line)]
                  [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                  [&::-webkit-slider-thumb]:bg-[var(--ff-accent)] [&::-webkit-slider-thumb]:shadow-sm"
              />
              <button
                type="button"
                onClick={reset}
                className="ff-btn ff-btn-secondary ff-btn-sm"
              >
                Reset
              </button>
            </div>

            {/* Cut the background out. Shown only when there is a flat backdrop to
                cut — an offer that does nothing is worse than no offer. When the
                probe found one but declined, it says why instead of going quiet. */}
            {(keyOffered || (keyReport?.reason && keyReport.flatness >= 0.55)) && (
              <div className="ff-well mt-3 p-2.5">
                {keyOffered ? (
                  <>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={keyOn}
                        disabled={keying}
                        onChange={(e) => setKeyOn(e.target.checked)}
                        className="h-4 w-4 cursor-pointer accent-[var(--ff-accent)]"
                      />
                      <span className="text-[13px] font-semibold text-[var(--ff-ink)]">
                        Remove the background
                      </span>
                      {keying && <span className="ff-micro">working...</span>}
                    </label>
                    <p className="ff-micro mt-1">
                      {keyOn
                        ? "The logo sits straight on your frame's colour, with no white box behind it."
                        : `There's a flat ${keyReport?.backdrop === "#FFFFFF" ? "white" : "coloured"} background behind this - cut it out and the logo sits straight on your frame.`}
                    </p>
                  </>
                ) : (
                  <p className="ff-micro">
                    {keyReport?.reason ? KEY_REFUSAL_COPY[keyReport.reason] : null}
                  </p>
                )}
              </div>
            )}

            {/* Live resolution meter */}
            <div className="ff-well mt-3 p-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ff-ink)]">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: METER_COLOR[verdict.level] }} />
                  {copy.title}
                </span>
                <span className="ff-micro tabular-nums">
                  ~{Math.round(verdict.dpi)} DPI · {Math.round(verdict.minSidePx)} px
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--ff-line)]">
                <div className="h-full rounded-full transition-all" style={{ width: `${meterPct}%`, backgroundColor: METER_COLOR[verdict.level] }} />
              </div>
              <p className="ff-micro mt-1">{copy.detail}</p>
            </div>

            {/* Actions */}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="ff-btn ff-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={verdict.blocked || busy || keying || !img}
                className="ff-btn ff-btn-primary"
              >
                {busy
                  ? "Adding..."
                  : keying
                    ? "Removing background..."
                    : verdict.blocked
                      ? "Too low to print"
                      : "Use this crop"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
