"use client";

import { useEffect, useRef } from "react";

import "./first-run-tour.css";

// ─── First-run tour ──────────────────────────────────────────────────────────
//
// Was an amber band sitting in the column above the frame. On a desktop that is
// a stripe; on a phone it was three lines of instructions eating the top of the
// screen on the one view where vertical space is the entire budget — and it did
// so for every visitor on every visit until they found the "Got it" chip.
//
// Now it is `position: fixed`, so it occupies NO layout space at all: the frame
// sits exactly where it will sit forever, and the tour is a thing in front of it
// that leaves and never comes back. Shown once, remembered in localStorage.
//
// A bottom sheet on a phone (thumb reach) and a centred card on a desktop, which
// is the same component with one media query rather than two code paths.

export function FirstRunTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Focus the dismiss button so a keyboard user can leave immediately, and so
    // the sheet announces itself to a screen reader.
    btnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="msf-tour-scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="msf-tour-title"
      // Tapping the scrim dismisses. The tour is skippable by design: nothing
      // behind it is destructive and a parent who wants to get on with it should
      // not have to find a button.
      onClick={onClose}
    >
      <div className="msf-tour" onClick={(e) => e.stopPropagation()}>
        <h2 className="msf-tour-title" id="msf-tour-title">
          Make it theirs
        </h2>
        <p className="msf-tour-lede">
          Customize as much as you want, or just pick a preset and go.
        </p>
        <ol className="msf-tour-steps">
          <li>
            <span className="msf-tour-n">1</span>
            <span>Type their name. It lands on the banner.</span>
          </li>
          <li>
            <span className="msf-tour-n">2</span>
            <span>Tap a badge, then tap the frame. Or drag it on.</span>
          </li>
          <li>
            <span className="msf-tour-n">3</span>
            <span>Love it? Send it. Nothing prints until you say so.</span>
          </li>
        </ol>
        <button type="button" ref={btnRef} className="msf-tour-btn" onClick={onClose}>
          Start designing
        </button>
      </div>
    </div>
  );
}
