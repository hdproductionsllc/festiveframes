"use client";

import { useRef } from "react";
import { useDesignStore } from "@/stores/design-store";
import { SECTION_LABELS } from "@/lib/utils/sections";
import { BOTTOM_BAR_FONTS } from "@/lib/constants/frame";
import { SCHOOL_PHRASES } from "@/data/school-phrases";

// Editor for the SELECTED section (school builder). Text mode: phrase + font +
// colors → setSectionText. Image mode: upload (downscaled) + fit → setSectionImage.
// Presets are Phase 4. Shown only when a text/image section is selected.

const MAX_CHARS = 60; // room for multi-line school text

/** Read a file, draw it to a canvas capped at `maxPx` on the long edge, and return
 *  a JPEG/PNG data URL — keeps an uploaded mascot small enough for localStorage. */
function downscaleToDataUrl(file: File, maxPx: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        ctx.drawImage(img, 0, 0, w, h);
        // PNG preserves transparency (logos); fall back to the original data URL.
        try {
          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve(String(reader.result));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function SectionEditor() {
  const selectedSectionId = useDesignStore((s) => s.selectedSectionId);
  const sections = useDesignStore((s) => s.sections);
  const setSectionText = useDesignStore((s) => s.setSectionText);
  const setSectionImage = useDesignStore((s) => s.setSectionImage);
  const clearSection = useDesignStore((s) => s.clearSection);
  const fileRef = useRef<HTMLInputElement>(null);

  const sec = selectedSectionId ? sections[selectedSectionId] : undefined;

  if (!selectedSectionId || !sec || sec.mode === "tiles") {
    return (
      <div className="rounded-xl border border-surface-700/50 bg-surface-800/40 p-4 text-sm font-semibold text-surface-300">
        Pick a section above and set it to <span className="text-[#ed5aa0]">Text</span> or{" "}
        <span className="text-[#3fb0e6]">Image</span> to edit it here.
      </div>
    );
  }

  const label = SECTION_LABELS[selectedSectionId];

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await downscaleToDataUrl(file, 1600);
      setSectionImage(selectedSectionId, { imageUrl: dataUrl, fit: sec.imageFit ?? "cover" });
    } catch {
      /* ignore a bad file */
    }
  };

  return (
    <div className="bsk-panel-pink space-y-4 rounded-xl border border-surface-700/50 bg-surface-800/50 p-4">
      <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#1e1b17]">
        {label} — {sec.mode === "text" ? "Text" : "Image"}
      </h3>

      {sec.mode === "text" ? (
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

          {/* School phrases — one tap fills the section (line breaks come in too). */}
          <div>
            <span className="text-[11px] font-semibold text-[#1e1b17]/55">Or tap a school phrase:</span>
            <div className="mt-1.5 flex max-h-[6.5rem] flex-wrap gap-1.5 overflow-y-auto pr-1">
              {SCHOOL_PHRASES.map((p) => (
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

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">Font</span>
              <select
                value={sec.text?.fontFamily ?? ""}
                onChange={(e) => setSectionText(selectedSectionId, { fontFamily: e.target.value })}
                className="w-full rounded-lg border-2 border-[#1e1b17]/15 bg-white px-3 py-2 text-sm font-semibold text-[#1e1b17] focus:border-[#ed5aa0] focus:outline-none"
              >
                {BOTTOM_BAR_FONTS.map((f) => (
                  <option key={f.id} value={f.family}>
                    {f.name}
                  </option>
                ))}
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
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border-[3px] border-[#1e1b17] bg-[#3fb0e6] px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-white shadow-[3px_3px_0_#1e1b17] transition-all hover:brightness-105 active:translate-y-0.5"
            >
              {sec.imageUrl ? "Change image" : "Upload mascot / logo"}
            </button>
            {sec.imageUrl && (
              <button
                type="button"
                onClick={() => clearSection(selectedSectionId)}
                className="rounded-xl border-2 border-[#1e1b17]/15 bg-white px-3 py-2 text-sm font-bold text-[#1e1b17] hover:bg-white/70"
              >
                Remove
              </button>
            )}
          </div>

          <div>
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">Fit</span>
            <div className="flex gap-2">
              {(["cover", "contain"] as const).map((fit) => {
                const active = (sec.imageFit ?? "cover") === fit;
                return (
                  <button
                    key={fit}
                    type="button"
                    disabled={!sec.imageUrl}
                    onClick={() => sec.imageUrl && setSectionImage(selectedSectionId, { imageUrl: sec.imageUrl, presetId: sec.presetId, fit })}
                    className={`flex-1 rounded-md border-2 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide transition-all disabled:opacity-40 ${
                      active ? "border-[#1e1b17] bg-[#ed5aa0] text-white shadow-[2px_2px_0_#1e1b17]" : "border-[#1e1b17]/15 bg-white text-[#1e1b17] hover:border-[#ed5aa0]"
                    }`}
                  >
                    {fit === "cover" ? "Fill" : "Fit"}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-[#1e1b17]/50">
            Upload a PNG/JPG (auto-downscaled). School presets come next.
          </p>
        </div>
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
