"use client";

import { useDesignStore } from "@/stores/design-store";
import { SECTION_LABELS, sectionSupportsText, sectionSupportsTiles } from "@/lib/utils/sections";
import { SCHOOL_COLLEGIATE_FONTS, SCHOOL_OTHER_FONTS } from "@/lib/constants/frame";
import { SCHOOL_PHRASE_GROUPS } from "@/data/school-phrases";
import type { BottomBarConfig, SectionId } from "@/lib/types";
import { sectionSupportsLogo } from "@/lib/utils/banner-logo";
import { useSnappetUpload } from "./useSnappetUpload";
import { ColorSwatch, HexInput } from "./ColorField";

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
  const setSectionMode = useDesignStore((s) => s.setSectionMode);
  // Upload → crop → snappet flow (shared with the prominent Upload button).
  const { begin, cropModal } = useSnappetUpload();

  const sec = selectedSectionId ? sections[selectedSectionId] : undefined;

  // Nothing selected — render NOTHING. This used to be a paragraph explaining where
  // the Sections panel is and what its two modes do, which is a help topic wearing an
  // editor's clothes: it occupied the editor slot permanently, on every load, to
  // narrate a control already visible a few inches away. An empty slot reads as "not
  // yet", which is the truth, and it stops the builder opening on a wall of text.
  if (!selectedSectionId) return null;

  const label = SECTION_LABELS[selectedSectionId];
  // Image mode is retired; a section with no explicit mode (just selected) is a
  // tiles panel. Anything not TEXT is a tiles panel that can take uploaded art.
  const isText = sec?.mode === "text";

  return (
    <div className="ff-panel space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="ff-h2">
          {label} - {isText ? "Text" : "Art"}
        </h3>
        {/* The mode switch lives HERE rather than on the section card. Top and bottom
            are text banners by default and that is what they usually stay; putting the
            switch on the card made it the loudest thing in the panel and made the
            wings (which have no switch, because art is all they do) look disabled by
            comparison. Changing a banner to badges is deliberate, so it sits with the
            rest of this panel's settings. */}
        {sectionSupportsText(selectedSectionId) && sectionSupportsTiles(selectedSectionId) && (
          <button
            type="button"
            onClick={() => setSectionMode(selectedSectionId, isText ? "tiles" : "text")}
            className="ff-btn ff-btn-secondary ff-btn-sm"
          >
            {isText ? "Use badges instead" : "Use a text banner"}
          </button>
        )}
      </div>

      {isText ? (
        <div className="ff-well space-y-3 p-3.5">
          <label className="block">
            <span className="ff-label mb-1 block">
              {selectedSectionId === "bottom" ? "Headline" : "Text"}{" "}
              <span className="ff-micro">- press Enter for a new line</span>
            </span>
            <textarea
              value={sec.text?.text ?? ""}
              maxLength={MAX_CHARS}
              rows={selectedSectionId === "bottom" ? 2 : 3}
              onChange={(e) => setSectionText(selectedSectionId, { text: e.target.value.slice(0, MAX_CHARS) })}
              placeholder={selectedSectionId === "bottom" ? "GO WILDCATS" : "School name,\nslogan,\nyear..."}
              className="ff-field w-full resize-none leading-tight"
            />
          </label>

          {/* Bottom banner only: an optional SMALLER tagline under the headline. The
              double-height bottom banner renders two tiers when this is filled. */}
          {selectedSectionId === "bottom" && (
            <label className="block">
              <span className="ff-label mb-1 block">
                Tagline <span className="ff-micro">- optional, smaller line underneath</span>
              </span>
              <input
                type="text"
                value={sec.text?.tagline ?? ""}
                maxLength={MAX_CHARS}
                onChange={(e) => setSectionText(selectedSectionId, { tagline: e.target.value.slice(0, MAX_CHARS) })}
                placeholder="Est. 1998 · State Champions"
                className="ff-field w-full"
              />
            </label>
          )}

          {/* School phrases — tap to fill (line breaks come in too). Grouped by category;
              {year} is already resolved, [MASCOT]/[#] are placeholders to overwrite. */}
          <div>
            {/* The trailing "— edit [MASCOT] / [#] after:" is gone. It explained a
                convention the chips demonstrate on their own, in jargon, in the one
                place a parent is already reading example text. */}
            <span className="ff-label">Or tap a school phrase</span>
            <div className="mt-1.5 max-h-[11rem] space-y-2 overflow-y-auto pr-1">
              {SCHOOL_PHRASE_GROUPS.map((group) => (
                <div key={group.category}>
                  <span className="ff-micro block">{group.category}</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {group.phrases.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSectionText(selectedSectionId, { text: p })}
                        className={`ff-chip ${sec.text?.text === p ? "ff-chip-on" : ""}`}
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
              <span className="ff-label mb-1 block">Font</span>
              <select
                value={sec.text?.fontFamily ?? ""}
                onChange={(e) => setSectionText(selectedSectionId, { fontFamily: e.target.value })}
                className="ff-field w-full"
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
              <span className="ff-label mb-1 block">Colors</span>
              <div className="flex items-center gap-3">
                <Swatch label="Text" value={sec.text?.textColor ?? "#ffffff"} onChange={(v) => setSectionText(selectedSectionId, { textColor: v })} />
                <Swatch label="Background" value={sec.text?.backgroundColor ?? "#1B2A4A"} onChange={(v) => setSectionText(selectedSectionId, { backgroundColor: v })} />
              </div>
            </div>
          </div>

          <label className="block">
            <div className="mb-1 flex items-center justify-between">
              <span className="ff-label">Size</span>
              <span className="ff-label tabular-nums">
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
              className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-[var(--ff-line)]
                [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--ff-accent)]
                [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
            />
          </label>

          {/* Bottom banner only — see `sectionSupportsLogo`. Both renderers enforce
              the same rule, so a design saved before this control was narrowed does
              not keep drawing a crest on the top strip. */}
          {sectionSupportsLogo(selectedSectionId) && (
            <LogoRow sectionId={selectedSectionId} logo={sec.text?.logo} />
          )}
        </div>
      ) : (
        <div className="ff-well space-y-3 p-3.5">
          {/* <label> + visually-hidden (NOT display:none) input — reliable on iOS,
              where a display:none input opens the picker but never fires `change`. */}
          <label className="ff-btn ff-btn-primary cursor-pointer">
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

          <p className="ff-micro">
            Upload a photo, mascot, or logo for the {label.toLowerCase()}. It drops in
            at a suggested size - a portrait lands tall, a landscape lands compact - then
            drag it, pull the resize handles, or drag it off the frame to remove. A live
            meter checks it&apos;s sharp enough to print at that size.
          </p>
        </div>
      )}

      {cropModal}
    </div>
  );
}

const PLACEMENTS: { id: NonNullable<BottomBarConfig["logo"]>["placement"]; label: string }[] = [
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
  { id: "both", label: "Both ends" },
];

/**
 * Put a crest beside the banner text.
 *
 * It draws from the UPLOADS TRAY rather than opening its own file picker, and that is
 * deliberate: a school's mascot is already in the tray by the time anyone reaches this
 * control — the URL scan puts it there, and so does "Add art" on a wing. A second
 * upload path here would mean the same crest stored twice, cropped differently, at two
 * resolutions, and the print sheet picking whichever one it happened to be handed.
 *
 * With an empty tray there is nothing to toggle, so it says where crests come from
 * instead of offering a checkbox that would do nothing.
 */
function LogoRow({ sectionId, logo }: { sectionId: SectionId; logo: BottomBarConfig["logo"] }) {
  const uploads = useDesignStore((s) => s.uploads);
  const setSectionText = useDesignStore((s) => s.setSectionText);

  if (uploads.length === 0) {
    return (
      <div>
        <span className="ff-label mb-1 block">Mascot or crest</span>
        <p className="ff-micro">
          Scan your school&apos;s website, or add art to a side panel - anything you
          upload shows up here and can sit beside this text.
        </p>
      </div>
    );
  }

  const on = !!logo?.url;
  const toggle = () => {
    if (on) {
      setSectionText(sectionId, { logo: undefined });
      return;
    }
    // Newest first in the tray, so [0] is what the user just added — which is nearly
    // always the crest they came here to use.
    const pick = uploads[0];
    setSectionText(sectionId, {
      logo: { url: pick.url, fullResId: pick.fullResId, placement: "left" },
    });
  };

  return (
    <div>
      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" checked={on} onChange={toggle} className="h-4 w-4 cursor-pointer accent-[var(--ff-accent)]" />
        <span className="ff-label">Put a mascot or crest beside the text</span>
      </label>

      {on && (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {uploads.map((u) => (
              <button
                key={u.id}
                type="button"
                title={u.name}
                onClick={() =>
                  setSectionText(sectionId, {
                    logo: { url: u.url, fullResId: u.fullResId, placement: logo?.placement ?? "left" },
                  })
                }
                className={`h-11 w-11 overflow-hidden rounded-[6px] border-2 bg-white ${
                  logo?.url === u.url ? "border-[var(--ff-accent)]" : "border-[var(--ff-line)]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.url} alt={u.name} className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PLACEMENTS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSectionText(sectionId, { logo: { ...logo!, placement: p.id } })}
                className={`ff-chip ${logo?.placement === p.id ? "ff-chip-on" : ""}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Banner colour: the swatch opens the full picker, the field takes an exact hex.
 *  Same pair as the frame and per-tile controls — a colour is chosen the same way
 *  everywhere, and every one of them can express a precise brand value. */
function Swatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="ff-micro">{label}</span>
      <ColorSwatch value={value} onChange={onChange} label={label} size={28} />
      <HexInput value={value} onChange={onChange} label={label} className="hidden sm:block" />
    </div>
  );
}
