"use client";

import { useDesignStore } from "@/stores/design-store";
import { SECTION_LABELS } from "@/lib/utils/sections";
import { SCHOOL_COLLEGIATE_FONTS, SCHOOL_OTHER_FONTS } from "@/lib/constants/frame";
import { SCHOOL_PHRASE_GROUPS } from "@/data/school-phrases";
import { useSnappetUpload } from "./useSnappetUpload";

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

export function SectionEditor() {
  const selectedSectionId = useDesignStore((s) => s.selectedSectionId);
  const sections = useDesignStore((s) => s.sections);
  const setSectionText = useDesignStore((s) => s.setSectionText);
  // Upload → crop → snappet flow (shared with the prominent Upload button).
  const { begin, cropModal } = useSnappetUpload();

  const sec = selectedSectionId ? sections[selectedSectionId] : undefined;

  if (!selectedSectionId) {
    return (
      <div className="rounded-xl border border-surface-700/50 bg-surface-800/40 p-4 text-sm font-semibold text-surface-300">
        Pick a section from the <span className="font-bold">Sections</span> panel to edit
        it here — set it to <span className="text-[#ed5aa0]">Text</span>, or leave it on{" "}
        <span className="text-[#3fb0e6]">Tiles</span> and use <span className="font-bold">Add art</span>.
      </div>
    );
  }

  const label = SECTION_LABELS[selectedSectionId];
  // Image mode is retired; a section with no explicit mode (just selected) is a
  // tiles panel. Anything not TEXT is a tiles panel that can take uploaded art.
  const isText = sec?.mode === "text";

  return (
    <div className="bsk-panel-pink space-y-4 rounded-xl border border-surface-700/50 bg-surface-800/50 p-4">
      <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#1e1b17]">
        {label} — {isText ? "Text" : "Art"}
      </h3>

      {isText ? (
        <div className="space-y-3 rounded-2xl border-2 border-[#1e1b17] bg-white/70 p-3.5 shadow-[3px_3px_0_#1e1b17]">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">
              {selectedSectionId === "bottom" ? "Headline" : "Text"}{" "}
              <span className="font-semibold normal-case text-[#1e1b17]/45">— press Enter for a new line</span>
            </span>
            <textarea
              value={sec.text?.text ?? ""}
              maxLength={MAX_CHARS}
              rows={selectedSectionId === "bottom" ? 2 : 3}
              onChange={(e) => setSectionText(selectedSectionId, { text: e.target.value.slice(0, MAX_CHARS) })}
              placeholder={selectedSectionId === "bottom" ? "GO WILDCATS" : "School name,\nslogan,\nyear…"}
              className="w-full resize-none rounded-lg border-2 border-[#1e1b17]/15 bg-white px-3 py-2.5 text-base font-bold leading-tight text-[#1e1b17] placeholder:text-[#1e1b17]/35 focus:border-[#ed5aa0] focus:outline-none"
            />
          </label>

          {/* Bottom banner only: an optional SMALLER tagline under the headline. The
              double-height bottom banner renders two tiers when this is filled. */}
          {selectedSectionId === "bottom" && (
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">
                Tagline <span className="font-semibold normal-case text-[#1e1b17]/45">— optional, smaller line underneath</span>
              </span>
              <input
                type="text"
                value={sec.text?.tagline ?? ""}
                maxLength={MAX_CHARS}
                onChange={(e) => setSectionText(selectedSectionId, { tagline: e.target.value.slice(0, MAX_CHARS) })}
                placeholder="Est. 1998 · State Champions"
                className="w-full rounded-lg border-2 border-[#1e1b17]/15 bg-white px-3 py-2 text-sm font-bold text-[#1e1b17] placeholder:text-[#1e1b17]/35 focus:border-[#ed5aa0] focus:outline-none"
              />
            </label>
          )}

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
          {/* <label> + visually-hidden (NOT display:none) input — reliable on iOS,
              where a display:none input opens the picker but never fires `change`. */}
          <label
            className="inline-flex cursor-pointer rounded-xl border-[3px] border-[#1e1b17] bg-[#3fb0e6] px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-white shadow-[3px_3px_0_#1e1b17] transition-all hover:brightness-105 active:translate-y-0.5"
          >
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && selectedSectionId) void begin(file, selectedSectionId);
                e.target.value = ""; // let the same file be re-picked / re-cropped
              }}
            />
            Add art
          </label>

          <p className="text-[11px] leading-relaxed text-[#1e1b17]/50">
            Upload a photo, mascot, or logo for the {label.toLowerCase()}. It drops in
            at a suggested size — a portrait lands tall, a landscape lands compact — then
            drag it, pull the resize handles, or drag it off the frame to remove. A live
            meter checks it&apos;s sharp enough to print at that size.
          </p>
        </div>
      )}

      {cropModal}
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
