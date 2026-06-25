"use client";

import { useDraggable } from "@dnd-kit/core";
import { useDesignStore } from "@/stores/design-store";
import { BOTTOM_BAR_MAX_CHARS } from "@/lib/constants/frame";
import { JULY4_SLOGANS } from "@/data/slogans";
import { FontSelector } from "./FontSelector";
import { ColorPicker } from "@/components/ui/ColorPicker";
import type { BottomBarConfig, PlacedTextBar } from "@/lib/types";

/**
 * TEXT-BAR EDITOR — direct manipulation.
 *
 * Model: there is no visible "draft." You either have NO bars (empty state with
 * one big "Add a text bar" call to action) or you have bars and are editing the
 * SELECTED one live. If you start typing / styling with nothing selected, a bar
 * is auto-created + selected for you so your change is immediately visible on the
 * frame. Drag-to-place is kept as a clearly-labeled secondary way to choose the
 * exact top/bottom spot.
 */

/* ── Drag handle: drop a bar onto a precise top/bottom run ─────────────────── */
function DragToPlace({ label }: { label: string }) {
  const bottomBar = useDesignStore((s) => s.bottomBar);
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: "textbar",
    data: { type: "textbar" },
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      // Drag only — a plain click is handled by the primary "Add" button, so we
      // intentionally do NOT add a bar on click here (avoids a confusing double
      // add when the user just taps the drag handle).
      title="Drag me onto the top or bottom of the frame to place a bar exactly"
      className={`flex w-full items-center gap-2.5 rounded-xl border-2 border-dashed border-[#1e1b17]/30
        bg-white/60 px-3 py-2.5 text-left cursor-grab active:cursor-grabbing
        transition-all hover:bg-white active:scale-[0.99]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ed5aa0]
        ${isDragging ? "opacity-50" : ""}`}
    >
      <span className="select-none text-lg leading-none text-[#1e1b17]/50" aria-hidden>⠿</span>
      <div className="flex min-w-0 flex-col">
        <span className="text-[13px] font-bold text-[#1e1b17]">{label}</span>
        <span className="text-[11px] font-medium text-[#1e1b17]/55">Drag onto the top or bottom row</span>
      </div>
      <div className="ml-auto overflow-hidden rounded-[4px] px-2 py-1" style={{ background: bottomBar.backgroundColor }}>
        <span
          className="block max-w-[110px] truncate text-xs font-bold"
          style={{ fontFamily: bottomBar.fontFamily, color: bottomBar.textColor, letterSpacing: bottomBar.letterSpacing }}
        >
          {bottomBar.text || "YOUR TEXT"}
        </span>
      </div>
    </button>
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
      {/* Live mini-swatch of the bar so the list reads like the frame */}
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

  // The bar being edited: the explicitly-selected one, else (so the controls are
  // never editing "nothing" while bars exist) the most recently added bar.
  const selected: PlacedTextBar | null =
    textBars.find((b) => b.id === selectedBarId) ?? textBars[textBars.length - 1] ?? null;
  const cfg = selected ? selected.config : bottomBar;
  const hasBars = textBars.length > 0;

  /**
   * The heart of direct manipulation: any styling/text change applies to the
   * selected bar LIVE. With no bar yet, the first change auto-creates + selects
   * one (via the store, which also selects it) so the user sees their edit land
   * on the frame instantly — no invisible draft to reason about.
   */
  const setCfg = (u: Partial<BottomBarConfig>) => {
    if (selected) {
      updateTextBar(selected.id, u);
      return;
    }
    // No bar yet — seed the draft so the new bar is born with this change, then
    // create + select it. addTextBar() copies the current draft into the bar.
    updateBottomBar(u);
    addTextBar();
  };

  // Keep the panel pointed at a real bar: if the user clicks one on the frame it
  // selects; if they delete the selected one, fall through to the newest bar.
  const editingId = selected?.id ?? null;

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

      {!hasBars ? (
        /* ── EMPTY STATE — one obvious, inviting action ─────────────────── */
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => addTextBar()}
            className="flex w-full flex-col items-center gap-1 rounded-2xl border-[3px] border-dashed border-[#ed5aa0]
              bg-white/70 px-4 py-6 text-center transition-all hover:bg-white active:scale-[0.99]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ed5aa0]"
          >
            <span className="text-3xl leading-none">➕</span>
            <span className="text-base font-extrabold uppercase tracking-wide text-[#ed5aa0]">Add a text bar</span>
            <span className="text-[12px] font-semibold text-[#1e1b17]/65">
              Add a slogan or message — then style it right here
            </span>
          </button>
          <DragToPlace label="Want to choose the spot?" />
        </div>
      ) : (
        <>
          {/* Placed bars list — tap to edit, icon to remove */}
          <ul className="space-y-1.5">
            {textBars.map((b, i) => (
              <BarRow
                key={b.id}
                bar={b}
                index={i}
                selected={b.id === editingId}
                onSelect={() => selectBar(b.id)}
                onRemove={() => removeTextBar(b.id)}
              />
            ))}
          </ul>

          {/* Add another */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => addTextBar()}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#ed5aa0] bg-[#ed5aa0]
                px-3 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-[2px_2px_0_#1e1b17]
                transition-all hover:brightness-105 active:translate-y-0.5 active:shadow-none
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1b17]"
            >
              <span aria-hidden>＋</span> Add another bar
            </button>
            <DragToPlace label="Place precisely" />
          </div>

          {/* ── Editor for the selected bar ──────────────────────────────── */}
          <div className="space-y-4 rounded-2xl border-2 border-[#1e1b17] bg-white/70 p-3.5 shadow-[3px_3px_0_#1e1b17]">
            <p className="text-[12px] font-bold uppercase tracking-wide text-[#ed5aa0]">
              Editing the {selected?.row === "top" ? "top" : "bottom"} bar
            </p>

            {/* 1 · Text */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">Text</span>
                <span className="text-[10px] font-semibold text-[#1e1b17]/45">
                  {cfg.text.length}/{BOTTOM_BAR_MAX_CHARS}
                </span>
              </div>
              <input
                type="text"
                value={cfg.text}
                onChange={(e) => setCfg({ text: e.target.value.toUpperCase().slice(0, BOTTOM_BAR_MAX_CHARS) })}
                maxLength={BOTTOM_BAR_MAX_CHARS}
                placeholder="YOUR TEXT HERE"
                className="w-full rounded-lg border-2 border-[#1e1b17]/15 bg-white px-3 py-2.5 text-sm font-semibold
                  text-[#1e1b17] placeholder:text-[#1e1b17]/35
                  focus:border-[#ed5aa0] focus:outline-none"
              />
              {/* Slogan quick-fill */}
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) setCfg({ text: e.target.value });
                }}
                className="w-full rounded-lg border-2 border-[#1e1b17]/15 bg-white px-3 py-2 text-sm
                  text-[#1e1b17] focus:border-[#ed5aa0] focus:outline-none"
              >
                <option value="">Quick-fill a 4th of July slogan…</option>
                {JULY4_SLOGANS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* 2 · Font */}
            <FontSelector value={cfg.fontFamily} onChange={(fontFamily) => setCfg({ fontFamily })} />

            {/* 3 · Colors */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">Colors</span>
              <div className="flex gap-4">
                <ColorPicker label="Text" value={cfg.textColor} onChange={(textColor) => setCfg({ textColor })} />
                <ColorPicker label="Background" value={cfg.backgroundColor} onChange={(backgroundColor) => setCfg({ backgroundColor })} />
              </div>
            </div>

            {/* 4 · Size */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">Text Size</span>
                <span className="text-xs font-semibold tabular-nums text-[#1e1b17]/70">
                  {Math.round((cfg.fontSize ?? 0.8) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={40}
                max={100}
                step={1}
                value={Math.round((cfg.fontSize ?? 0.8) * 100)}
                onChange={(e) => setCfg({ fontSize: Number(e.target.value) / 100 })}
                className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-[#1e1b17]/15
                  [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ed5aa0]
                  [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
              />
            </div>

            {/* Letter spacing */}
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
          </div>
        </>
      )}
    </div>
  );
}

/* Pink-skinned slider for the light editor card (the shared Slider is tuned for
   the dark panels; this matches the editor's white card + pink accent). */
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
