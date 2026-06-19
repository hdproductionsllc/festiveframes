"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";

const STORAGE_KEY = "ff:onboarding:build:v2";

type View = "intro" | "tour";

const TOUR_STEPS = [
  { n: 1, title: "Drag tiles onto the frame", body: "The frame opens with a random design — drag tiles from the left panel onto any slot to make it your own." },
  { n: 2, title: "Add a text bar", body: "Drag the text bar onto the top or bottom row, type your slogan, and style it. Click a placed bar anytime to edit it." },
  { n: 3, title: "Send to production", body: "When it looks right, hit Send to Production for the print sheet — the eufyMake tile sheet, plus a parts CSV and printable text bars." },
] as const;

/**
 * First-visit-only onboarding for the /build designer.
 *
 * Shown exactly once per browser (gated by localStorage "ff:onboarding:build").
 * This is the ONLY popup that may appear on /build — the July 4 marketing promo
 * popup must never mount here. Fully accessible: role=dialog, aria-modal,
 * labelled heading, Escape to close, an explicit X, a focus trap, and focus
 * restore to the previously focused element on close.
 */
export function OnboardingPopup() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("intro");

  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // First-visit gate. Runs only on the client after mount (SSR-safe).
  useEffect(() => {
    let seen = true;
    try {
      seen = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Private mode / blocked storage: treat as seen so we never nag.
      seen = true;
    }
    if (!seen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    }
  }, []);

  const close = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore storage failures; the popup simply won't be re-suppressed.
    }
    setOpen(false);
    // Restore focus to whatever was focused before the dialog opened.
    previouslyFocused.current?.focus?.();
  }, []);

  const startTour = useCallback(() => {
    track("builder_tutorial_start");
    setView("tour");
  }, []);

  // Move focus into the dialog when it opens, and trap Tab/Escape.
  useEffect(() => {
    if (!open) return;

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
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, view, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        // Click on the backdrop (not the dialog) dismisses.
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

        {view === "intro" ? (
          <>
            <h2
              id="ff-onboarding-title"
              className="pr-8 text-xl font-bold text-surface-50"
            >
              Welcome to the Builder
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-surface-300">
              Let us show you a quick tutorial of the Builder.
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
                Show Me
              </button>
            </div>
          </>
        ) : (
          <>
            <h2
              id="ff-onboarding-title"
              className="pr-8 text-xl font-bold text-surface-50"
            >
              Three steps to your frame
            </h2>
            <ol className="mt-4 flex flex-col gap-3">
              {TOUR_STEPS.map((step) => (
                <li key={step.n} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full
                      bg-brand-gold text-sm font-bold text-black"
                  >
                    {step.n}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-surface-100">{step.title}</p>
                    <p className="text-xs leading-relaxed text-surface-400">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-lg px-5 py-2.5 text-sm font-bold text-black
                  bg-gradient-to-r from-brand-gold to-yellow-500
                  hover:from-yellow-400 hover:to-yellow-500 active:scale-95
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold transition-all"
              >
                Start building
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
