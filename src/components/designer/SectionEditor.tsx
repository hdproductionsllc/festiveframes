"use client";

import { useRef, useState } from "react";
import { useDesignStore } from "@/stores/design-store";
import { SECTION_LABELS } from "@/lib/utils/sections";
import { buildGrid } from "@/lib/utils/slot-generator";
import { coveredSlotIds } from "@/lib/utils/text-bar";
import { panelSnappetPlacement } from "@/lib/utils/snappet";
import { putFullRes } from "@/lib/utils/image-store";
import { reviewUploadedImage } from "@/lib/utils/image-moderation";
import { SCHOOL_COLLEGIATE_FONTS, SCHOOL_OTHER_FONTS } from "@/lib/constants/frame";
import { SCHOOL_PHRASE_GROUPS } from "@/data/school-phrases";
import { ImageCropModal, type ImageCropResult } from "./ImageCropModal";

// Editor for the SELECTED section (school builder).
//   TEXT mode  → phrase + font + colors → setSectionText.
//   TILES mode → "Add art": upload → CROP MODAL (pan/zoom + live print-resolution
//                gate) → the art drops into the panel as a SNAPPET at a suggested
//                native-aspect size (portrait → tall, landscape → compact). It then
//                behaves like any snappet: drag it, resize it from the handles, or
//                drag it off to remove. There is no separate "image mode" — uploaded
//                art and set-piece tiles are ONE system.
// Shown only when a section is selected.

const MAX_CHARS = 60; // room for multi-line school text

/** Decode a file just far enough to read its aspect (width / height). Falls back to
 *  1 (square) on any error, matching suggestSnappetSize's own bad-aspect guard. */
function readImageAspect(file: File): Promise<number> {
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

export function SectionEditor() {
  const selectedSectionId = useDesignStore((s) => s.selectedSectionId);
  const sections = useDesignStore((s) => s.sections);
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const slots = useDesignStore((s) => s.slots);
  const textBars = useDesignStore((s) => s.textBars);
  const setSectionText = useDesignStore((s) => s.setSectionText);
  const placeImageSnappet = useDesignStore((s) => s.placeImageSnappet);
  const fileRef = useRef<HTMLInputElement>(null);
  // The file waiting to be cropped, plus the crop's aspect target (the SUGGESTED
  // snappet's physical size) and the source aspect the store re-derives the span
  // from. The aspect target makes the crop match where the art will land — so on a
  // native-aspect upload there is little to no crop.
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<{ width: number; height: number } | null>(null);
  const pendingAspect = useRef<number>(1);

  const sec = selectedSectionId ? sections[selectedSectionId] : undefined;

  if (!selectedSectionId) {
    return (
      <div className="rounded-xl border border-surface-700/50 bg-surface-800/40 p-4 text-sm font-semibold text-surface-300">
        Pick a section above to edit it here — set it to{" "}
        <span className="text-[#ed5aa0]">Text</span>, or leave it on{" "}
        <span className="text-[#3fb0e6]">Tiles</span> and use <span className="font-bold">Add art</span>.
      </div>
    );
  }

  const label = SECTION_LABELS[selectedSectionId];
  // Image mode is retired; a section with no explicit mode (just selected) is a
  // tiles panel. Anything not TEXT is a tiles panel that can take uploaded art.
  const isText = sec?.mode === "text";

  // File picked → decide where/how big the art lands (the SAME decision the store
  // makes on commit), size the crop's aspect target to that snappet, open the modal.
  const onFile = async (file?: File) => {
    if (!file || !selectedSectionId) return;
    const aspect = await readImageAspect(file);
    pendingAspect.current = aspect;
    const grid = buildGrid(frameConfig);
    const ctx = { grid, slots, sections, barCovered: new Set(coveredSlotIds(textBars)) };
    const placement = panelSnappetPlacement(ctx, selectedSectionId, aspect);
    const span = placement?.span ?? { cols: 1, rows: 1 };
    // Every grid column is exactly one tile wide (the grid invariant), so the
    // snappet's physical size is just span × tile — the aspect target + the
    // resolution gate's denominator.
    setCropTarget({
      width: span.cols * frameConfig.tileSizeInches,
      height: span.rows * frameConfig.tileSizeInches,
    });
    setCropFile(file);
  };

  // Crop confirmed → stash the full-res original in IndexedDB (only the id is
  // persisted, never the heavy bytes) and drop the art into the panel as a snappet.
  const onCropConfirm = async (result: ImageCropResult) => {
    if (!selectedSectionId) return;
    const id = crypto.randomUUID();
    try {
      await putFullRes(id, result.fullResBlob);
    } catch {
      /* IndexedDB unavailable → the preview still renders; full-res is re-derivable */
    }
    // Moderation integration point: user prints MUST be gated by a real server-side
    // vision check before production. No-op today (it does not fake an approval).
    void reviewUploadedImage(result.fullResBlob);
    placeImageSnappet(selectedSectionId, {
      imageUrl: result.previewUrl,
      fullResId: id,
      sourceAspect: pendingAspect.current,
    });
    setCropFile(null);
    setCropTarget(null);
  };

  return (
    <div className="bsk-panel-pink space-y-4 rounded-xl border border-surface-700/50 bg-surface-800/50 p-4">
      <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#1e1b17]">
        {label} — {isText ? "Text" : "Art"}
      </h3>

      {isText ? (
        <div className="space-y-3 rounded-2xl border-2 border-[#1e1b17] bg-white/70 p-3.5 shadow-[3px_3px_0_#1e1b17]">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">
              Text <span className="font-semibold normal-case text-[#1e1b17]/45">— press Enter for a new line</span>
            </span>
            <textarea
              value={sec.text?.text ?? ""}
              maxLength={MAX_CHARS}
              rows={3}
              onChange={(e) => setSectionText(selectedSectionId, { text: e.target.value.slice(0, MAX_CHARS) })}
              placeholder={"School name,\nslogan,\nyear…"}
              className="w-full resize-none rounded-lg border-2 border-[#1e1b17]/15 bg-white px-3 py-2.5 text-base font-bold leading-tight text-[#1e1b17] placeholder:text-[#1e1b17]/35 focus:border-[#ed5aa0] focus:outline-none"
            />
          </label>

          {/* School phrases — tap to fill (line breaks come in too). Grouped by category;
              {year} is already resolved, [MASCOT]/[#] are placeholders to overwrite. */}
          <div>
            <span className="text-[11px] font-semibold text-[#1e1b17]/55">
              Or tap a school phrase <span className="text-[#1e1b17]/40">— edit [MASCOT] / [#] after</span>:
            </span>
            <div className="mt-1.5 max-h-[11rem] space-y-2 overflow-y-auto pr-1">
              {SCHOOL_PHRASE_GROUPS.map((group) => (
                <div key={group.category}>
                  <span className="block text-[10px] font-extrabold uppercase tracking-wide text-[#1e1b17]/45">
                    {group.category}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {group.phrases.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSectionText(selectedSectionId, { text: p })}
                        className={`rounded-full border-2 px-2.5 py-1 text-[12px] font-bold transition-all active:scale-95 ${
                          sec.text?.text === p
                            ? "border-[#1e1b17] bg-[#ed5aa0] text-white shadow-[2px_2px_0_#1e1b17]"
                            : "border-[#1e1b17]/15 bg-white text-[#1e1b17] hover:border-[#ed5aa0] hover:bg-[#ed5aa0]/10"
                        }`}
                      >
                        {p.replace(/\n/g, " / ")}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">Font</span>
              <select
                value={sec.text?.fontFamily ?? ""}
                onChange={(e) => setSectionText(selectedSectionId, { fontFamily: e.target.value })}
                className="w-full rounded-lg border-2 border-[#1e1b17]/15 bg-white px-3 py-2 text-sm font-semibold text-[#1e1b17] focus:border-[#ed5aa0] focus:outline-none"
              >
                <optgroup label="Collegiate">
                  {SCHOOL_COLLEGIATE_FONTS.map((f) => (
                    <option key={f.id} value={f.family}>
                      {f.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="More fonts">
                  {SCHOOL_OTHER_FONTS.map((f) => (
                    <option key={f.id} value={f.family}>
                      {f.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <div>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">Colors</span>
              <div className="flex items-center gap-3">
                <Swatch label="Text" value={sec.text?.textColor ?? "#ffffff"} onChange={(v) => setSectionText(selectedSectionId, { textColor: v })} />
                <Swatch label="Bg" value={sec.text?.backgroundColor ?? "#1B2A4A"} onChange={(v) => setSectionText(selectedSectionId, { backgroundColor: v })} />
              </div>
            </div>
          </div>

          <label className="block">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">Size</span>
              <span className="text-xs font-semibold tabular-nums text-[#1e1b17]/70">
                {Math.round((sec.text?.fontSize ?? 1) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={20}
              max={160}
              step={1}
              value={Math.round((sec.text?.fontSize ?? 1) * 100)}
              onChange={(e) => setSectionText(selectedSectionId, { fontSize: Number(e.target.value) / 100 })}
              className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-[#1e1b17]/15
                [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ed5aa0]
                [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border-2 border-[#1e1b17] bg-white/70 p-3.5 shadow-[3px_3px_0_#1e1b17]">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = ""; // let the same file be re-picked / re-cropped
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-xl border-[3px] border-[#1e1b17] bg-[#3fb0e6] px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-white shadow-[3px_3px_0_#1e1b17] transition-all hover:brightness-105 active:translate-y-0.5"
          >
            Add art
          </button>

          <p className="text-[11px] leading-relaxed text-[#1e1b17]/50">
            Upload a photo, mascot, or logo for the {label.toLowerCase()}. It drops in
            at a suggested size — a portrait lands tall, a landscape lands compact — then
            drag it, pull the resize handles, or drag it off the frame to remove. A live
            meter checks it&apos;s sharp enough to print at that size.
          </p>
        </div>
      )}

      {cropFile && cropTarget && (
        <ImageCropModal
          file={cropFile}
          targetInches={cropTarget}
          panelLabel={label}
          onCancel={() => {
            setCropFile(null);
            setCropTarget(null);
          }}
          onConfirm={onCropConfirm}
        />
      )}
    </div>
  );
}

function Swatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-[11px] font-semibold text-[#1e1b17]/60">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-9 cursor-pointer rounded border border-[#1e1b17]/20"
      />
    </label>
  );
}
