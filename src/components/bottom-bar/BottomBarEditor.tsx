"use client";

import { useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useDesignStore } from "@/stores/design-store";
import { BOTTOM_BAR_MAX_CHARS } from "@/lib/constants/frame";
import { JULY4_SLOGANS } from "@/data/slogans";
import { FontSelector } from "./FontSelector";
import { ColorPicker } from "@/components/ui/ColorPicker";
import type { BottomBarConfig, PlacedTextBar } from "@/lib/types";

/**
 * TEXT-BAR EDITOR — built the way a person thinks: "I'll write my phrase (or tap
 * a ready-made one) and it shows up on my frame."
 *
 * The text field + slogan chips ARE the entry point. Typing a character or
 * tapping a slogan creates the bar on the frame instantly and starts editing it
 * live — no separate "add" step, no invisible draft. The text input is ALWAYS
 * mounted in the same spot, so creating the bar never steals your focus mid-type.
 * Styling (font / colors / size) reveals once you've started. Drag-to-place stays
 * as a clearly-secondary way to drop a bar on an exact top/bottom run.
 */

/* ── The draggable bar itself: grab it and drop it on a precise top/bottom run.
   Shows a live preview of the bar so it clearly reads "grab me and drop me in." */
function DragToPlace() {
  const bottomBar = useDesignStore((s) => s.bottomBar);
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: "textbar",
    data: { type: "textbar" },
  });

  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-semibold text-[#1e1b17]/55">Or grab the bar and drop it exactly where you want:</span>
      <button
        type="button"
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        title="Grab and drag this bar onto the top or bottom of your frame"
        className={`flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-[#1e1b17]/40
          bg-white/70 p-1.5 cursor-grab active:cursor-grabbing transition-all hover:bg-white active:scale-[0.99]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ed5aa0] ${isDragging ? "opacity-50" : ""}`}
      >
        <span className="select-none pl-1 text-lg leading-none text-[#1e1b17]/40" aria-hidden>⠿</span>
        <div className="flex-1 overflow-hidden rounded-[4px] px-2 py-1.5" style={{ background: bottomBar.backgroundColor }}>
          <span
            className="block truncate text-center text-sm font-extrabold"
            style={{ fontFamily: bottomBar.fontFamily, color: bottomBar.textColor, letterSpacing: bottomBar.letterSpacing }}
          >
            {bottomBar.text || "YOUR TEXT"}
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-[#1e1b17]/10 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#1e1b17]/60">
          Drag &amp; drop
        </span>
      </button>
    </div>
  );
}

/* ── One row in the placed-bars list ──────────────────────────────────────── */
function BarRow({
  bar,
  index,
  selected,
  onSelect,
  onRemove,
}: {
  bar: PlacedTextBar;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  return (
    <li
      onClick={onSelect}
      className={`group flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2.5 transition-all
        ${selected
          ? "border-[#1e1b17] bg-white shadow-[2px_2px_0_#1e1b17]"
          : "border-transparent bg-white/55 hover:bg-white/80"}`}
    >
      <div
        className="flex h-7 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-[#1e1b17]/20"
        style={{ background: bar.config.backgroundColor }}
      >
        <span
          className="block max-w-full truncate px-1 text-[10px] font-bold leading-none"
          style={{ fontFamily: bar.config.fontFamily, color: bar.config.textColor }}
        >
          {bar.config.text || "—"}
        </span>
      </div>

      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-bold text-[#1e1b17]">
          {bar.config.text || "Untitled bar"}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#1e1b17]/55">
          {bar.row === "top" ? "Top row" : "Bottom row"}
          {index === 0 ? " · has QR" : ""}
        </span>
      </div>

      {selected && (
        <span className="ml-auto shrink-0 rounded-full bg-[#ed5aa0] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
          Editing
        </span>
      )}

      <button
        type="button"
        aria-label={`Remove the “${bar.config.text || "untitled"}” bar`}
        title="Remove this bar"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={`${selected ? "" : "ml-auto"} flex h-8 w-8 shrink-0 items-center justify-center rounded-full
          text-[#1e1b17]/45 transition-colors hover:bg-[#e0524d] hover:text-white active:scale-90`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
      </button>
    </li>
  );
}

export function BottomBarEditor() {
  const bottomBar = useDesignStore((s) => s.bottomBar);
  const textBars = useDesignStore((s) => s.textBars);
  const selectedBarId = useDesignStore((s) => s.selectedBarId);
  const updateBottomBar = useDesignStore((s) => s.updateBottomBar);
  const removeTextBar = useDesignStore((s) => s.removeTextBar);
  const selectBar = useDesignStore((s) => s.selectBar);
  const updateTextBar = useDesignStore((s) => s.updateTextBar);
  const addTextBar = useDesignStore((s) => s.addTextBar);

  const inputRef = useRef<HTMLInputElement>(null);

  // The bar being edited: the explicitly-selected one, else the most recent bar
  // (so the controls are never editing "nothing" while bars exist).
  const selected: PlacedTextBar | null =
    textBars.find((b) => b.id === selectedBarId) ?? textBars[textBars.length - 1] ?? null;
  const cfg = selected ? selected.config : bottomBar;
  const hasBars = textBars.length > 0;

  /**
   * Any text/style change applies to the selected bar live. With no bar yet, the
   * FIRST change seeds the draft then creates+selects the bar — so a single
   * keystroke or slogan tap makes the bar appear on the frame. The text input is
   * the same element before and after, so focus survives the create.
   */
  const setCfg = (u: Partial<BottomBarConfig>) => {
    if (selected) {
      updateTextBar(selected.id, u);
      return;
    }
    updateBottomBar(u);
    addTextBar();
  };

  // Start a fresh bar and drop the cursor in the field so you can just type.
  const startAnotherBar = () => {
    addTextBar();
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  return (
    <div className="bsk-panel-pink space-y-4 rounded-xl border border-surface-700/50 bg-surface-800/50 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none" aria-hidden>🪧</span>
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#1e1b17]">Text Bars</h3>
        {hasBars && (
          <span className="ml-auto rounded-full bg-[#1e1b17]/10 px-2 py-0.5 text-[11px] font-bold text-[#1e1b17]/70">
            {textBars.length} on frame
          </span>
        )}
      </div>

      {/* Placed-bars list + "add another" (only once bars exist). Kept as a single
          child slot so the editor card below stays put and never remounts. */}
      {hasBars && (
        <div className="space-y-2">
          <ul className="space-y-1.5">
            {textBars.map((b, i) => (
              <BarRow
                key={b.id}
                bar={b}
                index={i}
                selected={b.id === (selected?.id ?? null)}
                onSelect={() => selectBar(b.id)}
                onRemove={() => removeTextBar(b.id)}
              />
            ))}
          </ul>
          <button
            type="button"
            onClick={startAnotherBar}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#1e1b17]/15
              bg-white/55 px-3 py-2 text-sm font-bold text-[#1e1b17] transition-all hover:bg-white
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ed5aa0]"
          >
            <span aria-hidden>＋</span> Add another bar
          </button>
        </div>
      )}

      {/* Editor card — ALWAYS rendered. When there are no bars this IS the entry
          point: type or tap a slogan and the bar appears on your frame. */}
      <div className="space-y-4 rounded-2xl border-2 border-[#1e1b17] bg-white/70 p-3.5 shadow-[3px_3px_0_#1e1b17]">
        <p className="text-[12px] font-bold uppercase tracking-wide text-[#ed5aa0]">
          {hasBars ? `Editing the ${selected?.row === "top" ? "top" : "bottom"} bar` : "Add a phrase to your frame"}
        </p>

        {/* 1 · Type your phrase */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">Your text</span>
            <span className="text-[10px] font-semibold text-[#1e1b17]/45">
              {cfg.text.length}/{BOTTOM_BAR_MAX_CHARS}
            </span>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={cfg.text}
            onChange={(e) => setCfg({ text: e.target.value.toUpperCase().slice(0, BOTTOM_BAR_MAX_CHARS) })}
            maxLength={BOTTOM_BAR_MAX_CHARS}
            placeholder="Type your phrase…"
            className="w-full rounded-lg border-2 border-[#1e1b17]/15 bg-white px-3 py-2.5 text-base font-bold
              text-[#1e1b17] placeholder:text-[#1e1b17]/35 focus:border-[#ed5aa0] focus:outline-none"
          />

          {/* Slogan chips — one tap fills (and creates) the bar. */}
          <div>
            <span className="text-[11px] font-semibold text-[#1e1b17]/55">Or tap a ready-made one:</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {JULY4_SLOGANS.map((s) => {
                const active = cfg.text === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setCfg({ text: s })}
                    className={`rounded-full border-2 px-2.5 py-1 text-[12px] font-bold transition-all active:scale-95 motion-safe:hover:-translate-y-0.5
                      ${active
                        ? "border-[#1e1b17] bg-[#ed5aa0] text-white shadow-[2px_2px_0_#1e1b17]"
                        : "border-[#1e1b17]/15 bg-white text-[#1e1b17] hover:border-[#ed5aa0] hover:bg-[#ed5aa0]/10"}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Style controls appear once there's a bar to style. */}
        {hasBars && (
          <>
            <FontSelector value={cfg.fontFamily} onChange={(fontFamily) => setCfg({ fontFamily })} />

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">Colors</span>
              <div className="flex gap-4">
                <ColorPicker label="Text" value={cfg.textColor} onChange={(textColor) => setCfg({ textColor })} />
                <ColorPicker label="Background" value={cfg.backgroundColor} onChange={(backgroundColor) => setCfg({ backgroundColor })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">Text Size</span>
                <span className="text-xs font-semibold tabular-nums text-[#1e1b17]/70">
                  {Math.round((cfg.fontSize ?? 0.85) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={40}
                max={100}
                step={1}
                value={Math.round((cfg.fontSize ?? 0.85) * 100)}
                onChange={(e) => setCfg({ fontSize: Number(e.target.value) / 100 })}
                className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-[#1e1b17]/15
                  [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ed5aa0]
                  [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
              />
            </div>

            <PinkSlider
              label="Letter Spacing"
              value={cfg.letterSpacing}
              min={0}
              max={12}
              onChange={(letterSpacing) => setCfg({ letterSpacing })}
            />

            {selected && textBars[0]?.id === selected.id && (
              <p className="rounded-lg bg-[#1e1b17]/[0.06] px-3 py-2 text-[11px] font-semibold text-[#1e1b17]/65">
                Your QR code rides on this bar — scan-to-shop, baked right in.
              </p>
            )}
          </>
        )}
      </div>

      {/* Secondary: grab the bar and drop it on an exact top/bottom run. */}
      <DragToPlace />
    </div>
  );
}

/* Pink-skinned slider for the light editor card. */
function PinkSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-[#1e1b17]/70">{value}px</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-[#1e1b17]/15
          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ed5aa0]
          [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
      />
    </label>
  );
}
