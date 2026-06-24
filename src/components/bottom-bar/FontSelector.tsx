"use client";

import { useState, useRef, useEffect } from "react";
import { BOTTOM_BAR_FONTS } from "@/lib/constants/frame";

interface FontSelectorProps {
  value: string;
  onChange: (fontFamily: string) => void;
}

// Order the category headers — lead with the cartoon/sticker brand faces, then
// scripts, display, and classic workhorses.
const FONT_CATEGORY_ORDER = ["Cartoon", "Script", "Display", "Classic"] as const;

export function FontSelector({ value, onChange }: FontSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentFont = BOTTOM_BAR_FONTS.find((f) => f.family === value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="space-y-1" ref={ref}>
      <span className="text-xs text-surface-400">Font</span>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 rounded-md bg-surface-900 border border-surface-700
          text-surface-100 text-sm cursor-pointer text-left
          focus:outline-none focus:border-brand-gold/50 transition-colors
          flex items-center justify-between"
        style={{ fontFamily: currentFont?.family }}
      >
        <span>{currentFont?.name ?? "Select font"}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" className={`text-surface-400 transition-transform ${open ? "rotate-180" : ""}`}>
          <path fill="currentColor" d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="relative z-50">
          <div className="absolute top-0 left-0 right-0 bg-surface-900 border border-surface-700 rounded-md shadow-xl max-h-52 overflow-y-auto">
            {FONT_CATEGORY_ORDER.map((category) => {
              const fonts = BOTTOM_BAR_FONTS.filter((f) => f.category === category);
              if (fonts.length === 0) return null;
              return (
                <div key={category}>
                  <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-surface-500 select-none">
                    {category}
                  </div>
                  {fonts.map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => { onChange(font.family); setOpen(false); }}
                      className={`w-full px-3 py-2 text-sm text-left transition-colors
                        ${value === font.family
                          ? "bg-brand-navy text-white"
                          : "text-surface-300 hover:bg-surface-700"
                        }`}
                      style={{ fontFamily: font.family }}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
