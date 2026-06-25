"use client";

import { useEffect, useRef } from "react";
import { usePaletteStore } from "@/stores/palette-store";

/**
 * The loud, impossible-to-miss "you've armed a tile — now tap the frame" cue.
 *
 * The moment a palette tile is armed (selected for tap-to-place) this banner
 * appears, spelling out the exact next step in plain language for someone who
 * read no directions. It renders in two spots (near the frame and in the mobile
 * tray) via the `placement` prop, and disappears the instant nothing is armed.
 *
 * The very first time a tile is armed this session, the frame-side banner also
 * shows a one-shot animated 👆 finger tapping toward the frame, teaching the
 * arm→tap-frame flow wordlessly. It's marked "seen" right after so it never
 * nags again.
 */
export function ArmedBanner({ placement = "frame" }: { placement?: "frame" | "tray" }) {
  const selectedPieceId = usePaletteStore((s) => s.selectedPieceId);
  const clearSelection = usePaletteStore((s) => s.clearSelection);
  const armHintSeen = usePaletteStore((s) => s.armHintSeen);
  const markArmHintSeen = usePaletteStore((s) => s.markArmHintSeen);
  const bannerRef = useRef<HTMLDivElement>(null);

  // First-arm finger hint: only on the frame-side banner, only once per session.
  const showFinger = placement === "frame" && !armHintSeen && selectedPieceId != null;
  useEffect(() => {
    if (selectedPieceId != null && !armHintSeen) {
      const t = window.setTimeout(() => markArmHintSeen(), 2800);
      return () => window.clearTimeout(t);
    }
  }, [selectedPieceId, armHintSeen, markArmHintSeen]);

  // The frame-side banner lives ABOVE the canvas. The user usually arms a tile
  // from the palette/tools BELOW the canvas, so on desktop the "now tap the
  // frame" cue (and the frame itself) can be scrolled off the top of the
  // viewport — the user would never see it. When this banner appears, pull the
  // frame back into view so the just-armed cue is always on screen. Only acts if
  // the banner is actually off-screen, so it never yanks the page when the frame
  // is already visible.
  useEffect(() => {
    if (placement !== "frame" || selectedPieceId == null) return;
    const el = bannerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const offscreen = r.top < 0 || r.bottom > window.innerHeight;
    if (offscreen) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [placement, selectedPieceId]);

  if (!selectedPieceId) return null;

  return (
    <div
      ref={bannerRef}
      role="status"
      aria-live="polite"
      className="relative flex items-center gap-2 rounded-xl border-2 border-[#1e1b17] bg-brand-gold
        px-3 py-2 text-center shadow-[3px_3px_0_#1e1b17] motion-safe:animate-tile-snap"
    >
      {showFinger && (
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 text-3xl
            motion-safe:ff-finger-hint motion-reduce:hidden"
        >
          👆
        </span>
      )}
      <span className="flex-1 text-[13px] font-extrabold leading-snug text-[#1e1b17]">
        👆 Now tap any spot on your frame to drop it — or drag a tile on.
      </span>
      <button
        type="button"
        onClick={clearSelection}
        className="shrink-0 rounded-full border-2 border-[#1e1b17] bg-white px-2.5 py-1 text-[11px]
          font-bold text-[#1e1b17] active:scale-95"
      >
        Done
      </button>
    </div>
  );
}
