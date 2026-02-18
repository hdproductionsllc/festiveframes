"use client";

import { useDesignStore } from "@/stores/design-store";
import { BOTTOM_BAR_MAX_CHARS } from "@/lib/constants/frame";
import { FontSelector } from "./FontSelector";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { Slider } from "@/components/ui/Slider";
import { AlignmentSelector } from "@/components/ui/AlignmentSelector";

export function BottomBarEditor() {
  const bottomBar = useDesignStore((s) => s.bottomBar);
  const qrCode = useDesignStore((s) => s.qrCode);
  const updateBottomBar = useDesignStore((s) => s.updateBottomBar);
  const updateQRCode = useDesignStore((s) => s.updateQRCode);

  return (
    <div className="space-y-4 p-4 bg-surface-800/50 rounded-xl border border-surface-700/50">
      <h3 className="text-sm font-semibold text-surface-200">Bottom Bar</h3>

      {/* Text input */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-surface-400">Text</span>
          <span className="text-[10px] text-surface-500">
            {bottomBar.text.length}/{BOTTOM_BAR_MAX_CHARS}
          </span>
        </div>
        <input
          type="text"
          value={bottomBar.text}
          onChange={(e) => {
            const value = e.target.value.toUpperCase().slice(0, BOTTOM_BAR_MAX_CHARS);
            updateBottomBar({ text: value });
          }}
          maxLength={BOTTOM_BAR_MAX_CHARS}
          placeholder="YOUR TEXT HERE"
          className="w-full px-3 py-2 rounded-md bg-surface-900 border border-surface-700
            text-surface-100 text-sm placeholder:text-surface-600
            focus:outline-none focus:border-brand-gold/50 transition-colors"
        />
      </div>

      {/* Font selector */}
      <FontSelector
        value={bottomBar.fontFamily}
        onChange={(fontFamily) => updateBottomBar({ fontFamily })}
      />

      {/* Colors */}
      <div className="flex gap-4">
        <ColorPicker
          label="Text"
          value={bottomBar.textColor}
          onChange={(textColor) => updateBottomBar({ textColor })}
        />
        <ColorPicker
          label="Background"
          value={bottomBar.backgroundColor}
          onChange={(backgroundColor) => updateBottomBar({ backgroundColor })}
        />
      </div>

      {/* Alignment */}
      <div className="space-y-1">
        <span className="text-xs text-surface-400">Alignment</span>
        <AlignmentSelector
          value={bottomBar.textAlign}
          onChange={(textAlign) => updateBottomBar({ textAlign })}
        />
      </div>

      {/* Font size */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-surface-400">Text Size</span>
          <span className="text-xs text-surface-300 tabular-nums">
            {Math.round((bottomBar.fontSize ?? 0.42) * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={25}
          max={75}
          step={1}
          value={Math.round((bottomBar.fontSize ?? 0.42) * 100)}
          onChange={(e) => updateBottomBar({ fontSize: Number(e.target.value) / 100 })}
          className="w-full h-1.5 rounded-full bg-surface-700 appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-brand-gold [&::-webkit-slider-thumb]:shadow-md"
        />
      </div>

      {/* Letter spacing */}
      <Slider
        label="Letter Spacing"
        value={bottomBar.letterSpacing}
        min={0}
        max={12}
        onChange={(letterSpacing) => updateBottomBar({ letterSpacing })}
      />

      {/* QR Code toggle */}
      <div className="pt-2 border-t border-surface-700/50 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={qrCode.enabled}
            onChange={(e) => updateQRCode({ enabled: e.target.checked })}
            className="w-4 h-4 rounded bg-surface-700 border-surface-600 text-brand-gold
              focus:ring-brand-gold/30 cursor-pointer accent-[#FFD700]"
          />
          <span className="text-xs text-surface-300">Show QR Code</span>
        </label>
        {qrCode.enabled && (
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
