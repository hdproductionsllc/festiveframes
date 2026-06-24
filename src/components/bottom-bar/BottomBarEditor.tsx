"use client";

import { useDraggable } from "@dnd-kit/core";
import { useDesignStore } from "@/stores/design-store";
import { BOTTOM_BAR_MAX_CHARS } from "@/lib/constants/frame";
import { JULY4_SLOGANS } from "@/data/slogans";
import { FontSelector } from "./FontSelector";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { Slider } from "@/components/ui/Slider";
import { AlignmentSelector } from "@/components/ui/AlignmentSelector";

/** The draggable text-bar object — drops a NEW bar onto the top/bottom row. */
function TextBarChip() {
  const bottomBar = useDesignStore((s) => s.bottomBar);
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: "textbar",
    data: { type: "textbar" },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      title="Drag onto the top or bottom of the frame"
      className={`inline-flex w-fit max-w-full items-center gap-2 rounded-md border border-dashed
        border-surface-600 bg-surface-900 p-2 cursor-grab active:cursor-grabbing transition-opacity
        ${isDragging ? "opacity-50" : ""}`}
    >
      <span className="select-none text-surface-500">⠿</span>
      <div className="overflow-hidden rounded-[3px] px-2 py-1" style={{ background: bottomBar.backgroundColor }}>
        <span
          className="block truncate text-sm font-bold"
          style={{ fontFamily: bottomBar.fontFamily, color: bottomBar.textColor, letterSpacing: bottomBar.letterSpacing }}
        >
          {bottomBar.text || "YOUR TEXT HERE"}
        </span>
      </div>
    </div>
  );
}

export function BottomBarEditor() {
  const bottomBar = useDesignStore((s) => s.bottomBar);
  const qrCode = useDesignStore((s) => s.qrCode);
  const textBars = useDesignStore((s) => s.textBars);
  const selectedBarId = useDesignStore((s) => s.selectedBarId);
  const updateBottomBar = useDesignStore((s) => s.updateBottomBar);
  const updateQRCode = useDesignStore((s) => s.updateQRCode);
  const removeTextBar = useDesignStore((s) => s.removeTextBar);
  const selectBar = useDesignStore((s) => s.selectBar);
  const updateTextBar = useDesignStore((s) => s.updateTextBar);
  const updateTextBarQr = useDesignStore((s) => s.updateTextBarQr);

  // When a placed bar is selected, every control edits THAT bar live;
  // otherwise the controls configure the draft for the next bar to be dragged.
  const selected = textBars.find((b) => b.id === selectedBarId) ?? null;
  const cfg = selected ? selected.config : bottomBar;
  const qrEnabled = selected ? selected.qr : qrCode.enabled;
  // The first banner is required to carry the QR — its toggle is locked on.
  const isFirstBar = selected != null && textBars[0]?.id === selected.id;
  const qrLocked = isFirstBar;
  const setCfg = (u: Partial<typeof bottomBar>) =>
    selected ? updateTextBar(selected.id, u) : updateBottomBar(u);
  const setQr = (enabled: boolean) =>
    selected ? updateTextBarQr(selected.id, enabled) : updateQRCode({ enabled });

  return (
    <div className="bsk-panel-pink space-y-4 p-4 bg-surface-800/50 rounded-xl border border-surface-700/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#ed5aa0]">Text Bar</h3>
        {selected && (
          <button
            onClick={() => selectBar(null)}
            className="text-[10px] font-medium text-brand-gold hover:underline"
          >
            + New bar
          </button>
        )}
      </div>
      <p className="text-[10px] text-surface-500">
        {selected
          ? `Editing the “${selected.config.text || "—"}” bar — changes apply live.`
          : "Setting up a new bar. Drag it onto the frame, or click a placed bar to edit it."}
      </p>

      {/* Slogan presets */}
      <div className="space-y-1">
        <span className="text-xs text-surface-400">4th of July slogans</span>
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) setCfg({ text: e.target.value });
          }}
          className="w-full px-3 py-2 rounded-md bg-surface-900 border border-surface-700
            text-surface-100 text-sm focus:outline-none focus:border-brand-gold/50 transition-colors"
        >
          <option value="">Pick a slogan…</option>
          {JULY4_SLOGANS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Text input */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-surface-400">Text</span>
          <span className="text-[10px] text-surface-500">
            {cfg.text.length}/{BOTTOM_BAR_MAX_CHARS}
          </span>
        </div>
        <input
          type="text"
          value={cfg.text}
          onChange={(e) => setCfg({ text: e.target.value.toUpperCase().slice(0, BOTTOM_BAR_MAX_CHARS) })}
          maxLength={BOTTOM_BAR_MAX_CHARS}
          placeholder="YOUR TEXT HERE"
          className="w-full px-3 py-2 rounded-md bg-surface-900 border border-surface-700
            text-surface-100 text-sm placeholder:text-surface-600
            focus:outline-none focus:border-brand-gold/50 transition-colors"
        />
      </div>

      {/* Placed bars + drag-to-add */}
      <div className="space-y-2">
        {textBars.length > 0 && (
          <ul className="space-y-1">
            {textBars.map((b) => (
              <li
                key={b.id}
                onClick={() => selectBar(b.id)}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-xs
                  ${b.id === selectedBarId ? "bg-surface-700 ring-1 ring-brand-gold/50" : "bg-surface-900 hover:bg-surface-800"}`}
              >
                <span className="truncate text-surface-300">
                  “{b.config.text || "—"}” · {b.row} · {b.widthUnits} tiles
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTextBar(b.id);
                  }}
                  className="shrink-0 font-medium text-brand-red hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <TextBarChip />
        <p className="text-[10px] text-surface-500">
          Drag the bar onto the top or bottom row to add it — auto-sizes to your text and snaps to
          whole tiles. Add as many as you like; drag one off the frame to trash it.
        </p>
      </div>

      {/* Font selector */}
      <FontSelector value={cfg.fontFamily} onChange={(fontFamily) => setCfg({ fontFamily })} />

      {/* Colors */}
      <div className="flex gap-4">
        <ColorPicker label="Text" value={cfg.textColor} onChange={(textColor) => setCfg({ textColor })} />
        <ColorPicker label="Background" value={cfg.backgroundColor} onChange={(backgroundColor) => setCfg({ backgroundColor })} />
      </div>

      {/* Alignment */}
      <div className="space-y-1">
        <span className="text-xs text-surface-400">Alignment</span>
        <AlignmentSelector value={cfg.textAlign} onChange={(textAlign) => setCfg({ textAlign })} />
      </div>

      {/* Font size */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-surface-400">Text Size</span>
          <span className="text-xs text-surface-300 tabular-nums">
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
          className="w-full h-1.5 rounded-full bg-surface-700 appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-brand-gold [&::-webkit-slider-thumb]:shadow-md"
        />
      </div>

      {/* Letter spacing */}
      <Slider
        label="Letter Spacing"
        value={cfg.letterSpacing}
        min={0}
        max={12}
        onChange={(letterSpacing) => setCfg({ letterSpacing })}
      />

      {/* QR Code toggle */}
      <div className="pt-2 border-t border-surface-700/50 space-y-2">
        <label className={`flex items-center gap-2 ${qrLocked ? "cursor-not-allowed" : "cursor-pointer"}`}>
          <input
            type="checkbox"
            checked={qrLocked ? true : qrEnabled}
            disabled={qrLocked}
            onChange={(e) => setQr(e.target.checked)}
            className={`w-4 h-4 rounded bg-surface-700 border-surface-600 text-brand-gold
              focus:ring-brand-gold/30 accent-[#FFD700]
              ${qrLocked ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
          />
          <span className="text-xs text-surface-300">Show QR Code (festiveframes.co)</span>
        </label>
        {qrLocked && (
          <p className="text-[10px] text-surface-500">Required on your first banner.</p>
        )}
        {qrEnabled && (
          <input
            type="url"
            value={qrCode.url}
            onChange={(e) => updateQRCode({ url: e.target.value })}
            placeholder="https://..."
            className="w-full px-3 py-1.5 rounded-md bg-surface-900 border border-surface-700
              text-surface-100 text-xs placeholder:text-surface-600
              focus:outline-none focus:border-brand-gold/50 transition-colors"
          />
        )}
      </div>
    </div>
  );
}
