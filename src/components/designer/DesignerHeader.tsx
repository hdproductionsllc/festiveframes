"use client";

import { useState, useEffect } from "react";
import { useDesignStore } from "@/stores/design-store";
import { useUIStore } from "@/stores/ui-store";

interface DesignerHeaderProps {
  onExport: () => void;
  onOrder: () => void;
  isOrdering?: boolean;
}

export function DesignerHeader({ onExport, onOrder, isOrdering }: DesignerHeaderProps) {
  const designName = useDesignStore((s) => s.designName);
  const setDesignName = useDesignStore((s) => s.setDesignName);
  const updatedAt = useDesignStore((s) => s.updatedAt);
  const slots = useDesignStore((s) => s.slots);
  const exportState = useUIStore((s) => s.exportState);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const toggleSound = useUIStore((s) => s.toggleSound);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const lastSaved = mounted && updatedAt
    ? new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const hasDesign = Object.keys(slots).length > 0;

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-surface-800">
      {/* Logo + name */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-brand-red tracking-tight">
          Festive Frames
        </h1>
        <div className="hidden sm:block h-5 w-px bg-surface-700" />
        <input
          type="text"
          value={designName}
          onChange={(e) => setDesignName(e.target.value)}
          className="hidden sm:block bg-transparent text-sm text-surface-300 border-b border-transparent
            hover:border-surface-600 focus:border-brand-gold/50 focus:outline-none
            transition-colors px-1 py-0.5 max-w-[200px]"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {lastSaved && (
          <span className="text-[10px] text-surface-500 hidden sm:block">
            Saved {lastSaved}
          </span>
        )}
        <button
          onClick={toggleSound}
          title={soundEnabled ? "Mute sounds" : "Enable sounds"}
          className="p-2 rounded-md text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
        >
          {soundEnabled ? "🔊" : "🔇"}
        </button>
        <button
          onClick={onExport}
          disabled={exportState === "exporting"}
          className="px-3 py-2 rounded-lg bg-surface-700 text-surface-300 text-sm font-medium
            hover:bg-surface-600 active:scale-95 disabled:opacity-50 transition-all"
        >
          {exportState === "exporting" ? "Saving..." : "Save Image"}
        </button>
        <button
          onClick={onOrder}
          disabled={!hasDesign || isOrdering}
          className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all active:scale-95
            disabled:opacity-40 disabled:cursor-not-allowed
            bg-gradient-to-r from-brand-gold to-yellow-500 text-black
            hover:from-yellow-400 hover:to-yellow-500
            shadow-[0_0_12px_rgba(255,215,0,0.3)] hover:shadow-[0_0_20px_rgba(255,215,0,0.5)]"
        >
          {isOrdering ? "Preparing..." : "Order This Design"}
        </button>
      </div>
    </header>
  );
}
