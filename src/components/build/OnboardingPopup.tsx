"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { CoachmarkTour, type TourStep } from "./CoachmarkTour";

const STORAGE_KEY = "ff:onboarding:build:v2";

type View = "intro" | "tour";

/**
 * Resolve the four tour targets WITHOUT editing the order-flow / canvas /
 * text-editor components. We tag what we own with `data-tour` (the tile tray,
 * and — in DesignerHeader — the Order button) and locate the rest by stable,
 * already-present anchors:
 *   • tiles  → [data-tour="tiles"]            (mobile tray, or desktop palette)
 *   • text   → .bsk-panel-pink                (the Text Bar editor card)
 *   • canvas → the .relative wrapper that precedes the text editor in the
 *              main content column (Designer renders State → canvas → editor)
 *   • order  → [data-tour="order"]            (the header CTA)
 */
function resolveTiles(): HTMLElement | null {
  // Prefer the element actually on screen (mobile tray vs desktop column).
  const all = Array.from(
    document.querySelectorAll<HTMLElement>('[data-tour="tiles"]')
  );
  const visible = all.find((el) => el.offsetParent !== null);
  return visible ?? all[0] ?? null;
}

function resolveText(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".bsk-panel-pink");
}

function resolveCanvas(): HTMLElement | null {
  const editor = resolveText();
  const prev = editor?.previousElementSibling;
  if (prev instanceof HTMLElement) return prev;
  return null;
}

function resolveOrder(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-tour="order"]');
}

const TOUR_STEPS: TourStep[] = [
  {
    key: "tiles",
    resolve: resolveTiles,
    title: "Pick a tile",
    body: "These are your 4th-of-July tiles. On your phone they live in the tray down here — scroll sideways to browse them.",
    placement: "auto",
  },
  {
    key: "canvas",
    resolve: resolveCanvas,
    title: "Drag or tap to place it",
    body: "Tap a tile to drop it into the next open spot, or drag it straight onto any slot on the frame.",
    placement: "auto",
  },
  {
    key: "text",
    resolve: resolveText,
    title: "Add your text",
    body: "Type your slogan here, pick a font and colors, then drag the text bar onto the top or bottom of the frame.",
    placement: "auto",
  },
  {
    key: "order",
    resolve: resolveOrder,
    title: "When you love it, hit Order",
    body: "Happy with your design? Tap Order and we’ll make it and ship it to you.",
    placement: "bottom",
  },
];

/**
 * First-visit-only onboarding for the /build designer.
 *
 * Shown exactly once per browser (gated by localStorage). A short intro card
 * offers a guided, spotlighted walkthrough that points an arrow at each real
 * piece of UI in turn (tiles → canvas → text → order). Skippable, never
 * stacked, never auto-repeating. Fully accessible: role=dialog, aria-modal,
 * labelled headings, Escape to close, a focus trap, and focus restore.
 */
export function OnboardingPopup() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("intro");

  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // First-visit gate. Client-only (SSR-safe).
  useEffect(() => {
    let seen = true;
    try {
      seen = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      seen = true; // blocked storage: treat as seen so we never nag.
    }
    if (!seen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    }
  }, []);

  const markSeen = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore storage failures.
    }
  }, []);

  // Close the intro card (without starting the tour).
  const close = useCallback(() => {
    markSeen();
    setOpen(false);
    previouslyFocused.current?.focus?.();
  }, [markSeen]);

  // Finish (either after the tour or skipping it).
  const finishTour = useCallback(() => {
    markSeen();
    track("builder_tutorial_complete");
    setOpen(false);
    setView("intro");
    previouslyFocused.current?.focus?.();
  }, [markSeen]);

  const startTour = useCallback(() => {
    track("builder_tutorial_start");
    setView("tour");
  }, []);

  // Intro-card focus trap + Escape (the tour manages its own keys).
  useEffect(() => {
    if (!open || view !== "intro") return;
    const node = dialogRef.current;
    if (!node) return;

    const focusFirst = () => {
      const focusable = node.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable ?? node).focus();
    };
    focusFirst();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, view, close]);

  if (!open) return null;

  if (view === "tour") {
    return <CoachmarkTour steps={TOUR_STEPS} onClose={finishTour} />;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ff-onboarding-title"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl border border-surface-700
          bg-surface-800 p-6 shadow-2xl focus:outline-none"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full
            text-surface-400 hover:text-surface-100 hover:bg-surface-700
            focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold transition-colors"
        >
          <span aria-hidden="true" className="text-lg leading-none">×</span>
        </button>

        <h2 id="ff-onboarding-title" className="pr-8 text-xl font-bold text-surface-50">
          Welcome to the Builder 🎆
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-surface-300">
          Building your 4th-of-July plate frame takes about a minute. Want a quick
          tour? We’ll point out exactly where everything is.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={close}
            className="order-2 sm:order-1 rounded-lg px-4 py-2.5 text-sm font-medium
              text-surface-300 hover:text-surface-100 hover:bg-surface-700
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold transition-colors"
          >
            Skip, I got this
          </button>
          <button
            type="button"
            onClick={startTour}
            className="order-1 sm:order-2 rounded-lg px-5 py-2.5 text-sm font-bold text-black
              bg-gradient-to-r from-brand-gold to-yellow-500
              hover:from-yellow-400 hover:to-yellow-500 active:scale-95
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold transition-all"
          >
            Show me around
          </button>
        </div>
      </div>
    </div>
  );
}
