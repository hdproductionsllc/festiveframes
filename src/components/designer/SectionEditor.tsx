"use client";

import { useState } from "react";
import { useDesignStore } from "@/stores/design-store";
import { loadPickerFonts } from "@/app/BuilderFontsDeferred";
import { SECTION_LABELS, sectionSupportsText, sectionSupportsTiles } from "@/lib/utils/sections";
import { SCHOOL_COLLEGIATE_FONTS, SCHOOL_OTHER_FONTS } from "@/lib/constants/frame";
import { BANNER_MAX_CHARS, SCHOOL_PHRASE_GROUPS, withMascot } from "@/data/school-phrases";
import type { BottomBarConfig, SectionId } from "@/lib/types";
import { sectionSupportsLogo } from "@/lib/utils/banner-logo";
import { useSnappetUpload, type SnappetUpload } from "./useSnappetUpload";
import { ColorSwatch, HexInput } from "./ColorField";

// Editor for the SELECTED section (school builder).
//   TEXT mode  → words, a phrase picker, the look (font / colours / size), and on
//                the bottom banner the crest beside the words → setSectionText.
//   TILES mode → "Add art": upload → CROP MODAL → the art drops into the panel as a
//                SNAPPET. Uploaded art and set-piece tiles are ONE system.
// Shown only when a section is selected.
//
// Sized for a thumb, because a parent reaches this from a QR code on a phone:
// every control is at least 44px tall, every field is 16px type (iOS zooms the page
// into anything smaller and does not zoom back out), and the phrases are grouped
// behind a row of category tabs rather than laid out as one wall of pills.
//
// Banner text is ONE line. The fields are single-line inputs, a pasted break is
// flattened before it lands, and the store flattens anything that reaches it by
// another road (`oneLine` in utils/sections).

/** A pasted or dropped break becomes a space — the input would otherwise just delete
 *  it and run the two words together ("HONORROLL"). The store's own `oneLine` then
 *  catches anything that arrives some other way. */
function pasteOneLine(
  e: React.ClipboardEvent<HTMLInputElement>,
  write: (next: string) => void,
) {
  const pasted = e.clipboardData.getData("text");
  if (!/[\r\n]/.test(pasted)) return; // the browser's own paste is fine
  e.preventDefault();
  const input = e.currentTarget;
  const flat = pasted.replace(/[ \t]*[\r\n]+[ \t]*/g, " ");
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const next = (input.value.slice(0, start) + flat + input.value.slice(end)).slice(0, BANNER_MAX_CHARS);
  write(next);
  const caret = Math.min(start + flat.length, next.length);
  requestAnimationFrame(() => input.setSelectionRange(caret, caret));
}

/** 16px type and a 48px box: the size that neither zooms iOS nor misses a thumb. */
const FIELD = "ff-field w-full min-h-12 !text-base";
/** The small grey heading over each group of controls. */
const GROUP_HEADING = "text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--ff-ink-2)]";

export function SectionEditor({
  schoolCrest,
  mascot,
}: {
  /** The kit's own crest, when the school gave us one — offered as a choice even
   *  after a parent removes it, so it is never one tap from gone for good. */
  schoolCrest?: string;
  /** The school's mascot, so "GO [MASCOT]" reads "GO MUSTANGS". */
  mascot?: string;
} = {}) {
  const selectedSectionId = useDesignStore((s) => s.selectedSectionId);
  const sections = useDesignStore((s) => s.sections);
  // The frame answers "can this panel hold a badge" (the square rule and floor).
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const setSectionText = useDesignStore((s) => s.setSectionText);
  const setSectionMode = useDesignStore((s) => s.setSectionMode);
  const selectSection = useDesignStore((s) => s.selectSection);
  // Upload → rights gate → crop. THE one chokepoint, for badge art and crests alike.
  const upload = useSnappetUpload();

  const sec = selectedSectionId ? sections[selectedSectionId] : undefined;

  // Nothing selected — render NOTHING. An empty slot reads as "not yet", which is
  // the truth, and it stops the builder opening on a wall of text.
  if (!selectedSectionId) return null;

  const label = SECTION_LABELS[selectedSectionId];
  // Image mode is retired; anything not TEXT is a tiles panel that can take art.
  const isText = sec?.mode === "text";
  const isBottom = selectedSectionId === "bottom";

  return (
    <div className="ff-panel space-y-5 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[17px] font-semibold text-[var(--ff-ink)]">{label}</h3>
        {/* Top and bottom are text banners by default and usually stay that way, so
            the switch to badges sits here with the panel's settings, not on the
            frame where it would be the loudest thing in sight. */}
        <div className="flex flex-wrap items-center gap-2">
          {sectionSupportsText(selectedSectionId) && sectionSupportsTiles(selectedSectionId, frameConfig) && (
            <button
              type="button"
              onClick={() => setSectionMode(selectedSectionId, isText ? "tiles" : "text")}
              className="ff-btn ff-btn-secondary min-h-11 !text-sm"
            >
              {isText ? "Use badges instead" : "Use a text banner"}
            </button>
          )}
          {/* Every change here is already on the frame, so this closes the editor
              and nothing more. There was no way out before but tapping somewhere
              else on the frame, and on a phone the open editor sits between the
              frame and everything below it. */}
          <button
            type="button"
            onClick={() => selectSection(null)}
            className="ff-btn ff-btn-primary min-h-11 !text-sm"
          >
            Done
          </button>
        </div>
      </div>

      {isText ? (
        <>
          {/* In the order they sit on the banner: on the bottom, the small line is
              printed ABOVE the main one. */}
          <div className="space-y-4">
            {isBottom && (
              <LineField
                label="Small line"
                optional
                value={sec.text?.tagline ?? ""}
                placeholder="CLASS OF 2027"
                onChange={(v) => setSectionText(selectedSectionId, { tagline: v })}
              />
            )}
            <LineField
              label={isBottom ? "Main line" : "Banner words"}
              value={sec.text?.text ?? ""}
              placeholder={isBottom ? mascot?.trim().toUpperCase() || "GO WILDCATS" : "Your school's name"}
              onChange={(v) => setSectionText(selectedSectionId, { text: v })}
            />
          </div>

          <PhrasePicker
            key={selectedSectionId}
            mascot={mascot}
            // The bottom banner has two lines, and the phrases are mostly the kind
            // that go on the SMALL one ("CLASS OF 2027" over "MUSTANGS") — the same
            // slot the one-tap banner lines fill. So the parent says which line.
            lines={
              isBottom
                ? [
                    { id: "tagline", label: "Small line", value: sec.text?.tagline ?? "" },
                    { id: "text", label: "Main line", value: sec.text?.text ?? "" },
                  ]
                : [{ id: "text", label: "Banner", value: sec.text?.text ?? "" }]
            }
            onPick={(line, p) => setSectionText(selectedSectionId, { [line]: p })}
          />

          <div className="space-y-4 border-t border-[var(--ff-line)] pt-5">
            <span className={GROUP_HEADING}>Lettering</span>
            <label className="block">
              <span className="mb-1.5 block text-[15px] font-medium text-[var(--ff-ink)]">Font</span>
              {/* THE font menu of the school builder, and the moment its faces are
                  worth fetching. A native <select> fires no "open" event, so the
                  pointer going down on it and it taking focus are the trigger.
                  `loadPickerFonts` is idempotent. */}
              <select
                value={sec.text?.fontFamily ?? ""}
                onPointerDown={loadPickerFonts}
                onFocus={loadPickerFonts}
                onChange={(e) => setSectionText(selectedSectionId, { fontFamily: e.target.value })}
                className={FIELD}
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

            {/* Letter colour only. The banner's BACKGROUND is the frame colour —
                one colour for the badges and both banners (the owner's rule), set
                by `setFrameColor` in the Frame color panel. A per-banner background
                here could split one banner off from the rest of the frame. */}
            <Swatch label="Letter color" value={sec.text?.textColor ?? "#ffffff"} onChange={(v) => setSectionText(selectedSectionId, { textColor: v })} />

            <label className="block">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-[var(--ff-ink)]">Size</span>
                <span className="text-[15px] tabular-nums text-[var(--ff-ink-2)]">
                  {Math.round((sec.text?.fontSize ?? 1) * 100)}%
                </span>
              </div>
              {/* The track is thin to look at and the input is 44px tall to hit; the
                  thumb is a real 28px target rather than a 16px dot. */}
              <input
                type="range"
                min={20}
                max={160}
                step={1}
                value={Math.round((sec.text?.fontSize ?? 1) * 100)}
                onChange={(e) => setSectionText(selectedSectionId, { fontSize: Number(e.target.value) / 100 })}
                aria-label="Letter size"
                className="h-11 w-full cursor-pointer appearance-none bg-transparent
                  [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[var(--ff-line-strong)]
                  [&::-webkit-slider-thumb]:-mt-[10px] [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--ff-accent)]
                  [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow
                  [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[var(--ff-line-strong)]
                  [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-[var(--ff-accent)] [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-white"
              />
            </label>
          </div>

          {/* Bottom banner only — see `sectionSupportsLogo`. Both renderers enforce
              the same rule, so a design saved before this control was narrowed does
              not keep drawing a crest on the top strip. */}
          {sectionSupportsLogo(selectedSectionId) && (
            <CrestPicker
              sectionId={selectedSectionId}
              logo={sec.text?.logo}
              bannerColor={sec.text?.backgroundColor ?? "#1B2A4A"}
              schoolCrest={schoolCrest}
              begin={upload.begin}
            />
          )}
        </>
      ) : (
        <div className="ff-well space-y-3 p-3.5">
          {/* <label> + visually-hidden (NOT display:none) input — reliable on iOS,
              where a display:none input opens the picker but never fires `change`. */}
          <label className="ff-btn ff-btn-primary min-h-12 cursor-pointer !text-base">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && selectedSectionId) void upload.begin(file, selectedSectionId);
                e.target.value = ""; // let the same file be re-picked / re-cropped
              }}
            />
            Add art
          </label>

          <p className="text-[14px] leading-relaxed text-[var(--ff-ink-2)]">
            Add a photo, mascot or logo to the {label.toLowerCase()}. Once it&apos;s on,
            you can drag it, resize it, or drag it off the frame to take it away. A
            meter lets you know whether it&apos;s sharp enough to print.
          </p>
        </div>
      )}

      {upload.uploadOverlays}
    </div>
  );
}

/** One banner line: a single-line input at 16px and 48px tall. Enter closes the
 *  keyboard rather than doing nothing, and a pasted break becomes a space. */
function LineField({
  label,
  optional,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  optional?: boolean;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[15px] font-medium text-[var(--ff-ink)]">
        {label}
        {optional && <span className="font-normal text-[var(--ff-ink-3)]"> (optional)</span>}
      </span>
      <input
        type="text"
        value={value}
        maxLength={BANNER_MAX_CHARS}
        enterKeyHint="done"
        autoCapitalize="characters"
        onChange={(e) => onChange(e.target.value.slice(0, BANNER_MAX_CHARS))}
        onPaste={(e) => pasteOneLine(e, onChange)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        placeholder={placeholder}
        className={FIELD}
      />
    </label>
  );
}

/**
 * The phrase ideas, one category at a time.
 *
 * Six categories of pills in one scrolling box was a wall: 28px targets at 12px type,
 * with the Font control peeking out under an inner scrollbar. A row of category tabs
 * over one short grid keeps every choice big enough to hit and the whole picker short
 * enough to see at once. It opens on the category holding the current words, so a
 * parent who already picked one sees it highlighted.
 */
type PhraseLine = "text" | "tagline";

function PhrasePicker({
  mascot,
  lines,
  onPick,
}: {
  mascot?: string;
  /** The line(s) a phrase can go on, first = the default. */
  lines: { id: PhraseLine; label: string; value: string }[];
  onPick: (line: PhraseLine, phrase: string) => void;
}) {
  const groups = SCHOOL_PHRASE_GROUPS.map((g) => ({
    category: g.category,
    phrases: g.phrases.map((p) => withMascot(p, mascot)),
  }));
  const [lineId, setLineId] = useState<PhraseLine>(lines[0].id);
  const line = lines.find((l) => l.id === lineId) ?? lines[0];
  const current = line.value;
  const holding = groups.findIndex((g) => g.phrases.includes(current));
  const [open, setOpen] = useState(holding >= 0 ? holding : 0);
  const group = groups[open] ?? groups[0];

  return (
    <div className="space-y-3 border-t border-[var(--ff-line)] pt-5">
      <div>
        <span className={GROUP_HEADING}>Need an idea?</span>
        <p className="mt-1 text-[14px] text-[var(--ff-ink-2)]">
          {lines.length > 1 ? "Pick a line, then tap a phrase to put it there." : "Tap a phrase to put it on the banner."}
        </p>
      </div>
      {lines.length > 1 && (
        <div role="radiogroup" aria-label="Which line" className="grid grid-cols-2 gap-1 rounded-[12px] bg-[var(--ff-sunk)] p-1">
          {lines.map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={l.id === line.id}
              onClick={() => setLineId(l.id)}
              className={`min-h-11 rounded-[9px] text-[15px] font-medium ${
                l.id === line.id
                  ? "bg-[var(--ff-card)] text-[var(--ff-ink)] shadow-sm"
                  : "text-[var(--ff-ink-2)]"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
      {/* Every category visible at once: three across on a phone, one row wider.
          A sideways-scrolling row hid Family and Alumni off the edge. */}
      <div role="tablist" aria-label="Phrase ideas" className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        {groups.map((g, i) => (
          <button
            key={g.category}
            type="button"
            role="tab"
            aria-selected={i === open}
            onClick={() => setOpen(i)}
            className={`min-h-11 rounded-full border px-3 text-[15px] sm:px-4 font-medium transition-colors ${
              i === open
                ? "border-[var(--ff-ink)] bg-[var(--ff-ink)] text-white"
                : "border-[var(--ff-line-strong)] bg-[var(--ff-card)] text-[var(--ff-ink)] hover:bg-[var(--ff-sunk)]"
            }`}
          >
            {g.category}
          </button>
        ))}
      </div>
      {/* Each phrase on ONE line, as it will print: a two-column grid wrapped
          "HOME OF THE / MUSTANGS" inside its button, which read as the very
          two-line banner this picker no longer makes. */}
      <div role="tabpanel" aria-label={group.category} className="flex flex-wrap gap-2">
        {group.phrases.map((p) => {
          const on = current === p;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(line.id, p)}
              className={`min-h-12 max-w-full whitespace-nowrap rounded-[10px] border px-4 text-[15px] font-semibold tracking-[0.02em] transition-colors ${
                on
                  ? "border-[var(--ff-accent)] bg-[var(--ff-accent)] text-[var(--ff-on-accent)]"
                  : "border-[var(--ff-line-strong)] bg-[var(--ff-card)] text-[var(--ff-ink)] hover:border-[var(--ff-accent)]"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const PLACEMENTS: { id: NonNullable<BottomBarConfig["logo"]>["placement"]; label: string }[] = [
  { id: "left", label: "Left" },
  { id: "both", label: "Both ends" },
  { id: "right", label: "Right" },
];

/**
 * The crest beside the banner's words: what is there now, where it sits, and a real
 * way to put one there.
 *
 * It used to draw ONLY from the uploads tray and, with an empty tray, told the
 * parent to go and upload somewhere else — a dead end with no button in it. It now
 * uploads right here, through the same `begin` every other upload uses, so the
 * rights gate still fires, the crop is square (the crest box is square, like every
 * badge), and the art lands in the tray as well as on the banner. The kit's own
 * crest, when the school gave us one, is always one of the choices.
 */
function CrestPicker({
  sectionId,
  logo,
  bannerColor,
  schoolCrest,
  begin,
}: {
  sectionId: SectionId;
  logo: BottomBarConfig["logo"];
  bannerColor: string;
  schoolCrest?: string;
  begin: SnappetUpload["begin"];
}) {
  const uploads = useDesignStore((s) => s.uploads);
  const setSectionText = useDesignStore((s) => s.setSectionText);

  // Everything this banner could wear: the school's own crest first, then anything
  // the parent uploaded (newest first). Deduped by picture, so the kit crest the
  // banner opened with is not listed twice.
  const choices: { key: string; url: string; fullResId?: string; name: string }[] = [];
  if (schoolCrest) choices.push({ key: "school", url: schoolCrest, name: "School crest" });
  for (const u of uploads) {
    if (!choices.some((c) => c.url === u.url)) choices.push({ key: u.id, url: u.url, fullResId: u.fullResId, name: u.name });
  }
  const on = !!logo?.url;

  const use = (c: { url: string; fullResId?: string }) =>
    setSectionText(sectionId, { logo: { url: c.url, fullResId: c.fullResId, placement: logo?.placement ?? "both" } });

  return (
    <div className="space-y-3 border-t border-[var(--ff-line)] pt-5">
      <div>
        <span className={GROUP_HEADING}>Mascot or crest</span>
        <p className="mt-1 text-[14px] text-[var(--ff-ink-2)]">
          {on
            ? "It sits beside the words on this banner."
            : "Put your school's mascot or crest beside the words. A square picture works best."}
        </p>
      </div>

      {choices.length > 0 && (
        <div role="radiogroup" aria-label="Crest" className="flex flex-wrap gap-3 p-[3px]">
          {choices.map((c) => {
            const picked = logo?.url === c.url;
            return (
              <button
                key={c.key}
                type="button"
                role="radio"
                aria-checked={picked}
                aria-label={c.name}
                title={c.name}
                onClick={() => use(c)}
                className={`grid h-16 w-16 place-items-center overflow-hidden rounded-[10px] p-1.5 ${
                  // The chosen one wears a ring OUTSIDE a white gap: a border in the
                  // accent colour vanished against a navy banner colour.
                  picked
                    ? "ring-[3px] ring-[var(--ff-accent)] ring-offset-[3px] ring-offset-white"
                    : "border border-[var(--ff-line-strong)] opacity-80 hover:opacity-100"
                }`}
                // The banner's own colour behind it: a white crest on a white chip
                // would be invisible, and this is what it will actually sit on.
                style={{ backgroundColor: bannerColor }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.url} alt="" className="h-full w-full object-contain" />
              </button>
            );
          })}
        </div>
      )}

      {on && (
        <div role="radiogroup" aria-label="Where the crest sits" className="grid grid-cols-3 gap-2">
          {PLACEMENTS.map((p) => {
            const picked = logo?.placement === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={picked}
                onClick={() => setSectionText(sectionId, { logo: { ...logo!, placement: p.id } })}
                className={`min-h-11 rounded-[10px] border px-2 text-[15px] font-medium ${
                  picked
                    ? "border-[var(--ff-accent)] bg-[var(--ff-accent)] text-[var(--ff-on-accent)]"
                    : "border-[var(--ff-line-strong)] bg-[var(--ff-card)] text-[var(--ff-ink)]"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {/* <label> + visually-hidden input, the iOS-safe file picker (see Add art). */}
        <label className="ff-btn ff-btn-primary min-h-12 flex-1 cursor-pointer px-5 !text-base sm:flex-none">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void begin(file, { bannerLogo: sectionId });
              e.target.value = ""; // the same file can be picked again
            }}
          />
          {on ? "Upload a different one" : "Upload a crest"}
        </label>
        {on && (
          <button
            type="button"
            onClick={() => setSectionText(sectionId, { logo: undefined })}
            className="ff-btn ff-btn-secondary min-h-12 px-5 !text-base"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

/** Banner colour: the swatch opens the full picker, the field takes an exact hex.
 *  Same pair as the frame and per-tile controls. 44px swatch on every screen. */
function Swatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <ColorSwatch value={value} onChange={onChange} label={label} size={44} />
      <span className="text-[15px] font-medium text-[var(--ff-ink)]">{label}</span>
      <HexInput value={value} onChange={onChange} label={label} className="hidden lg:block" />
    </div>
  );
}
