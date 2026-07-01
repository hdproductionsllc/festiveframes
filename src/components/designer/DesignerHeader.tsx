"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useDesignStore } from "@/stores/design-store";
import { useUIStore } from "@/stores/ui-store";
import { celebrateOrder } from "@/lib/utils/celebrate";
import { StateSelector } from "@/components/frame/StateSelector";
import { surfacedSets } from "@/data/sets";
import { usePaletteStore } from "@/stores/palette-store";
import { LooksPicker } from "./LooksPicker";

interface DesignerHeaderProps {
  onExport: () => void;
  onExportParts: () => void;
  onOrder: () => void;
  ordering?: boolean;
}

export function DesignerHeader({ onExport, onExportParts, onOrder, ordering }: DesignerHeaderProps) {
  const designName = useDesignStore((s) => s.designName);
  const setDesignName = useDesignStore((s) => s.setDesignName);
  const updatedAt = useDesignStore((s) => s.updatedAt);
  const slots = useDesignStore((s) => s.slots);
  const exportState = useUIStore((s) => s.exportState);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const toggleSound = useUIStore((s) => s.toggleSound);
  const activeSetId = usePaletteStore((s) => s.activeSetId);
  const setActiveSet = usePaletteStore((s) => s.setActiveSet);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const lastSaved = mounted && updatedAt
    ? new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const hasDesign = Object.keys(slots).length > 0;

  // The dopamine hit: fire the red/white/blue fireworks the instant the user
  // commits to ordering, then hand straight off to the real order flow. The
  // celebration is purely visual chrome (auto-cleaning canvas, reduced-motion
  // aware) and never blocks or alters the checkout logic in `onOrder`.
  const handleOrderClick = () => {
    if (!hasDesign || ordering) return;
    celebrateOrder();
    onOrder();
  };

  return (
    <header className="border-b-[3px] border-[#1e1b17] bg-[#1e1b17]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
      {/* Logo + name */}
      <div className="flex items-center gap-3">
        <a href="/" aria-label="Festive Frames home" className="flex items-center">
          <Image
            src="/redesign/logo.png"
            alt="Festive Frames"
            width={420}
            height={425}
            priority
            className="h-20 w-auto sm:h-28"
          />
        </a>
        <div className="hidden sm:block h-10 w-px bg-[#faf0d6]/25" />
        {/* Name + state stack: the design name on top, the State selector
            directly beneath it. On mobile the name input is hidden (space), but
            the State selector stays visible so the plate's state is always
            reachable. */}
        <div className="flex flex-col gap-1">
          <input
            type="text"
            value={designName}
            onChange={(e) => setDesignName(e.target.value)}
            placeholder="Name your design"
            className="hidden sm:block max-w-[200px] border-b border-transparent bg-transparent px-1 py-0.5
              text-sm font-semibold text-[#faf0d6] placeholder:text-[#faf0d6]/45
              transition-colors hover:border-[#faf0d6]/40 focus:border-[#f8c53b] focus:outline-none"
          />
          <div className="flex items-center gap-2">
            {/* Snappet theme picker — auto-grows as more sets are surfaced
                (driven by `surfacedSets`). Today there's just "4th of July". */}
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:block px-1 text-[10px] uppercase tracking-wide text-[#faf0d6]/45">
                Theme
              </span>
              <select
                aria-label="Snappet theme"
                value={activeSetId}
                onChange={(e) => setActiveSet(e.target.value)}
                className="px-2 py-1 rounded-md bg-[#2a2620] border border-[#faf0d6]/20
                  text-[#faf0d6] text-xs font-medium
                  focus:outline-none focus:border-[#f8c53b]/70 transition-colors
                  cursor-pointer appearance-none
                  bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23faf0d6%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')]
                  bg-no-repeat bg-[right_0.5rem_center] pr-6"
              >
                {surfacedSets.map((set) => (
                  <option key={set.id} value={set.id} className="bg-[#2a2620] text-[#faf0d6]">
                    {set.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:block px-1 text-[10px] uppercase tracking-wide text-[#faf0d6]/45">
                State
              </span>
              <StateSelector theme="header" />
            </div>
          </div>
        </div>
      </div>

      {/* "Start from a Look" — lives in the logo row's middle space (bigger, out of
          the tile rail). Takes the remaining width and scrolls horizontally; on
          narrow screens flex-wrap drops it to its own line under the logo. */}
      <div className="order-last w-full min-w-0 lg:order-none lg:w-auto lg:flex-1 lg:px-2">
        <LooksPicker />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {lastSaved && (
          <span className="hidden text-[10px] text-[#faf0d6]/60 sm:block">
            Saved {lastSaved}
          </span>
        )}
        <button
          onClick={toggleSound}
          title={soundEnabled ? "Mute sounds" : "Enable sounds"}
          className="rounded-full p-2 text-base text-[#faf0d6]/80 transition-colors hover:bg-white/10"
        >
          {soundEnabled ? "🔊" : "🔇"}
        </button>
        <button
          onClick={onExport}
          disabled={exportState === "exporting"}
          className="ff-cta-shine relative overflow-hidden rounded-full border-2 border-[#1e1b17] bg-[#3fb0e6] px-4 py-1.5 text-sm font-semibold text-[#fff9ec]
            transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-95 disabled:opacity-50"
        >
          {exportState === "exporting" ? "Saving…" : "Save Image"}
        </button>
        {/* Subtle production-tools gear: opens the parts list + eufyMake print
            sheet. Discreet so it doesn't distract customers, always reachable. */}
        <button
          onClick={onExportParts}
          disabled={!hasDesign}
          title="Production files — parts list & eufyMake print sheet"
          aria-label="Production files"
          className="rounded-full p-2 text-base text-[#faf0d6]/35 transition-colors hover:bg-white/10 hover:text-[#faf0d6]/80 disabled:opacity-20"
        >
          ⚙
        </button>
        {/* Primary call to action: place the made-to-order frame order. When
            it's disabled (empty frame) explain why via tooltip + a small hint so
            the dead-looking button isn't a mystery. */}
        <div className="relative flex flex-col items-end">
          <button
            data-tour="order"
            onClick={handleOrderClick}
            disabled={!hasDesign || ordering}
            title={hasDesign ? "Order your custom frame" : "Add at least one tile to your frame to order"}
            className="ff-cta-shine ff-cta-pop relative overflow-hidden rounded-full border-2 border-[#1e1b17] bg-[#f8c53b] px-6 py-2 text-sm font-extrabold uppercase tracking-wide text-[#1e1b17]
              shadow-[0_2px_0_#1e1b17] transition-all hover:brightness-105 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 motion-safe:disabled:animate-none"
          >
            {ordering ? "Starting…" : "Order · $39"}
          </button>
          {!hasDesign && (
            <span className="pointer-events-none absolute top-full mt-1 whitespace-nowrap text-[10px] font-semibold text-[#f8c53b]/90">
              Add a tile to order
            </span>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}
