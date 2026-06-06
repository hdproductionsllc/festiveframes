"use client";

import { useState } from "react";
import { tileSets } from "@/data/sets";
import { usePaletteStore } from "@/stores/palette-store";
import type { TileStyle } from "@/lib/types";

const hasRealistic = tileSets.some((s) => s.style === "photorealistic");
const LAUNCH_SET_ID = "july4th";

export function SetTabs() {
  const activeSetId = usePaletteStore((s) => s.activeSetId);
  const setActiveSet = usePaletteStore((s) => s.setActiveSet);
  const [styleFilter, setStyleFilter] = useState<TileStyle>("emoji");
  const [expanded, setExpanded] = useState(false);

  const launch = tileSets.find((s) => s.id === LAUNCH_SET_ID);
  const others = tileSets.filter((s) => s.id !== LAUNCH_SET_ID);
  const filteredOthers = others.filter((s) => (s.style ?? "emoji") === styleFilter);

  return (
    <div className="space-y-2">
      {/* Launch set — 4th of July, front and center */}
      {launch && (
        <button
          onClick={() => setActiveSet(launch.id)}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-all
            ${
              activeSetId === launch.id
                ? "bg-surface-600 text-surface-50 shadow-sm ring-1 ring-brand-gold/50"
                : "bg-surface-800 text-surface-300 hover:bg-surface-700/70"
            }`}
        >
          <span className="text-lg leading-none">{launch.icon}</span>
          <span className="text-sm font-semibold">{launch.name}</span>
          <span className="ml-auto rounded bg-brand-red/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-red">
            Launch
          </span>
        </button>
      )}

      {/* Everything else stays out of the way until expanded */}
      {others.length > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full rounded-md py-1 text-[11px] font-medium text-surface-400 hover:text-surface-200"
        >
          {expanded ? "Hide other tile sets ▲" : `More tile sets (${others.length}) ▾`}
        </button>
      )}

      {expanded && (
        <div className="space-y-2 border-t border-surface-700/50 pt-2">
          {hasRealistic && (
            <div className="flex rounded-lg bg-surface-800 p-0.5">
              <button
                onClick={() => setStyleFilter("emoji")}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${
                  styleFilter === "emoji"
                    ? "bg-surface-600 text-surface-50 shadow-sm"
                    : "text-surface-400 hover:text-surface-200"
                }`}
              >
                Emoji
              </button>
              <button
                onClick={() => setStyleFilter("photorealistic")}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${
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
            {filteredOthers.map((set) => {
              const isActive = activeSetId === set.id;
              return (
                <button
                  key={set.id}
                  onClick={() => setActiveSet(set.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-all
                    ${
                      isActive
                        ? "bg-surface-600 text-surface-50 shadow-sm ring-1 ring-surface-500"
                        : "bg-surface-800 text-surface-400 hover:bg-surface-700/70 hover:text-surface-200"
                    }`}
                >
                  <span className="flex-shrink-0 text-base leading-none">{set.icon}</span>
                  <span className="truncate text-xs font-medium">{set.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
