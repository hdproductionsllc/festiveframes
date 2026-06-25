"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useDesignStore } from "@/stores/design-store";
import { useUIStore } from "@/stores/ui-store";

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

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Production tools (parts sheet / CSV / eufy print) are for the team only.
  // Hidden from customers; reveal on a device by visiting /build?prod=1 (sticks
  // via localStorage), hide again with /build?prod=0.
  const [prodMode, setProdMode] = useState(false);
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get("prod");
      if (p === "1") localStorage.setItem("ff:prod", "1");
      else if (p === "0") localStorage.removeItem("ff:prod");
      setProdMode(localStorage.getItem("ff:prod") === "1");
    } catch {}
  }, []);

  const lastSaved = mounted && updatedAt
    ? new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const hasDesign = Object.keys(slots).length > 0;

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-[#1e1b17] bg-[#1e1b17] px-4 py-2">
      {/* Logo + name */}
      <div className="flex items-center gap-3">
        <a href="/" aria-label="Festive Frames home" className="flex items-center">
          <Image
            src="/redesign/logo.png"
            alt="Festive Frames"
            width={1408}
            height={1425}
            priority
            className="h-20 w-auto sm:h-28"
          />
        </a>
        <div className="hidden sm:block h-6 w-px bg-[#faf0d6]/25" />
        <input
          type="text"
          value={designName}
          onChange={(e) => setDesignName(e.target.value)}
          placeholder="Name your design"
          className="hidden sm:block max-w-[200px] border-b border-transparent bg-transparent px-1 py-0.5
            text-sm font-semibold text-[#faf0d6] placeholder:text-[#faf0d6]/45
            transition-colors hover:border-[#faf0d6]/40 focus:border-[#f8c53b] focus:outline-none"
        />
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
          className="rounded-full border-2 border-[#1e1b17] bg-[#3fb0e6] px-4 py-1.5 text-sm font-semibold text-[#fff9ec]
            transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
        >
          {exportState === "exporting" ? "Saving…" : "Save Image"}
        </button>
        {/* Production-only parts sheet — hidden from customers, shown when the
            team enables prod mode (/build?prod=1). */}
        {prodMode && (
          <button
            onClick={onExportParts}
            disabled={!hasDesign}
            title="Production parts sheet (team)"
            className="rounded-full border border-[#f8c53b]/40 px-2 py-1 text-xs font-medium text-[#f8c53b] transition-colors hover:bg-white/10 disabled:opacity-30"
          >
            Parts ⚙
          </button>
        )}
        {/* Primary call to action: place the made-to-order frame order. When
            it's disabled (empty frame) explain why via tooltip + a small hint so
            the dead-looking button isn't a mystery. */}
        <div className="relative flex flex-col items-end">
          <button
            data-tour="order"
            onClick={onOrder}
            disabled={!hasDesign || ordering}
            title={hasDesign ? "Order your custom frame" : "Add at least one tile to your frame to order"}
            className="rounded-full border-2 border-[#1e1b17] bg-[#f8c53b] px-6 py-2 text-sm font-extrabold uppercase tracking-wide text-[#1e1b17]
              shadow-[0_2px_0_#1e1b17] transition-all hover:brightness-105 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
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
    </header>
  );
}
