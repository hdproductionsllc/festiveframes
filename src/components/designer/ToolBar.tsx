"use client";

import { usePaletteStore } from "@/stores/palette-store";
import { useUIStore } from "@/stores/ui-store";
import type { DesignTool } from "@/lib/types";
import { playSound } from "@/lib/utils/sound";

const tools: Array<{ id: DesignTool; label: string; icon: string; shortcut: string }> = [
  { id: "paint", label: "Place", icon: "🖌️", shortcut: "P" },
  { id: "eraser", label: "Remove", icon: "✕", shortcut: "R" },
];

export function ToolBar() {
  const activeTool = usePaletteStore((s) => s.activeTool);
  const setTool = usePaletteStore((s) => s.setTool);
  const soundEnabled = useUIStore((s) => s.soundEnabled);

  return (
    <div className="flex gap-1 p-1 bg-surface-800 rounded-lg">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => { setTool(tool.id); if (soundEnabled) playSound("tick"); }}
          title={`${tool.label} (${tool.shortcut})`}
          className={`
            flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors
            ${activeTool === tool.id
              ? "bg-brand-navy text-white"
              : "text-surface-400 hover:text-surface-200 hover:bg-surface-700/50"
            }
          `}
        >
          <span className="text-base">{tool.icon}</span>
          <span className="hidden sm:inline">{tool.label}</span>
        </button>
      ))}
    </div>
  );
}
