"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { LOOK_PRESETS } from "@/data/look-presets";
import { useDesignStore } from "@/stores/design-store";
import { usePaletteStore } from "@/stores/palette-store";
import { useUIStore } from "@/stores/ui-store";
import { playSound } from "@/lib/utils/sound";

// "Start from a look" — surfaces the 6 marketing LOOK_PRESETS (the same designs
// behind the homepage "Build this look" buttons) INSIDE the builder, so a blank /
// "design another" / stuck visitor can drop in a finished design and restyle it.
//
// Applying a look is a single, undoable canvas replace (design-store.applyLook),
// so the "Applied … — Undo" toast reverts the whole thing in one step. The looks
// are the July 4th set's; if another set is active there are none to show.
const LOOKS = Object.entries(LOOK_PRESETS); // [id, look] in display order
const JULY4TH = "july4th";

export function LooksPicker() {
  const activeSetId = usePaletteStore((s) => s.activeSetId);
  const applyLook = useDesignStore((s) => s.applyLook);
  const undo = useDesignStore((s) => s.undo);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const [applied, setApplied] = useState<string | null>(null);

  // Auto-dismiss the "Applied" toast.
  useEffect(() => {
    if (!applied) return;
    const t = window.setTimeout(() => setApplied(null), 5000);
    return () => window.clearTimeout(t);
  }, [applied]);

  if (activeSetId !== JULY4TH || LOOKS.length === 0) return null;

  const handleApply = (look: (typeof LOOKS)[number][1]) => {
    applyLook(look, JULY4TH);
    if (soundEnabled) playSound("stamp");
    setApplied(look.name ?? "look");
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-gold">✨ Start from a look</span>
        <span className="text-[11px] text-surface-400">tap to drop in a design</span>
      </div>

      {/* Horizontal thumbnail row — finished designs you can restyle. */}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {LOOKS.map(([id, look]) => (
          <button
            key={id}
            type="button"
            onClick={() => handleApply(look)}
            title={`Start from “${look.name}” — replaces your current design (undoable)`}
            className="group shrink-0 overflow-hidden rounded-lg border-2 border-surface-700
              bg-surface-800 transition-all hover:border-brand-gold/70 active:scale-95"
            style={{ width: 132 }}
          >
            <Image
              src={`/redesign/looks/${id}.png`}
              alt={`${look.name} look`}
              width={264}
              height={142}
              sizes="132px"
              className="block h-auto w-full"
            />
            <span className="block whitespace-normal px-1.5 py-1 text-center text-[11px] font-semibold leading-tight text-surface-200">
              {look.name}
            </span>
          </button>
        ))}
      </div>

      {/* "Applied — Undo" toast: applyLook is one history step, so undo() reverts
          the whole look. Fixed overlay so it reads above the canvas. */}
      {applied && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-full
            border-2 border-[#1e1b17] bg-[#f8c53b] px-4 py-2 text-sm font-bold text-[#1e1b17]
            shadow-[3px_3px_0_#1e1b17]"
        >
          <span>Applied “{applied}”</span>
          <button
            type="button"
            onClick={() => { undo(); setApplied(null); }}
            className="rounded-full border-2 border-[#1e1b17] bg-[#fff9ec] px-3 py-0.5 text-xs font-extrabold
              uppercase tracking-wide active:scale-95"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
