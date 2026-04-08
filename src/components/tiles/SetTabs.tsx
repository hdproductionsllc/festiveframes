"use client";

import { useState } from "react";
import { tileSets } from "@/data/sets";
import { usePaletteStore } from "@/stores/palette-store";
import type { TileStyle } from "@/lib/types";

const hasRealistic = tileSets.some((s) => s.style === "photorealistic");

export function SetTabs() {
  const activeSetId = usePaletteStore((s) => s.activeSetId);
  const setActiveSet = usePaletteStore((s) => s.setActiveSet);
  const [styleFilter, setStyleFilter] = useState<TileStyle>("emoji");

  const filtered = tileSets.filter(
    (s) => (s.style ?? "emoji") === styleFilter
  );

  return (
    <div className="space-y-2">
      {hasRealistic && (
        <div className="flex rounded-lg bg-surface-800 p-0.5">
          <button
            onClick={() => setStyleFilter("emoji")}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
              styleFilter === "emoji"
                ? "bg-surface-600 text-surface-50 shadow-sm"
                : "text-surface-400 hover:text-surface-200"
            }`}
          >
            Emoji
          </button>
          <button
            onClick={() => setStyleFilter("photorealistic")}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
              styleFilter === "photorealistic"
                ? "bg-surface-600 text-surface-50 shadow-sm"
                : "text-surface-400 hover:text-surface-200"
            }`}
          >
            Realistic
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-1">
        {filtered.map((set) => {
          const isActive = activeSetId === set.id;
          return (
            <button
              key={set.id}
              onClick={() => setActiveSet(set.id)}
              className={`
                flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left transition-all
                ${isActive
                  ? "bg-surface-600 text-surface-50 shadow-sm ring-1 ring-surface-500"
                  : "bg-surface-800 text-surface-400 hover:text-surface-200 hover:bg-surface-700/70"
                }
              `}
            >
              <span className="text-base leading-none flex-shrink-0">{set.icon}</span>
              <span className="text-xs font-medium truncate">{set.name}</span>
              <span className="ml-auto text-[9px] text-surface-400 font-medium flex-shrink-0">${set.price.toFixed(2)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
