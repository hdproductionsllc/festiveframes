"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { season } from "@/config/season";
import { track } from "@/lib/analytics";
import { useBuyStore } from "./useBuyStore";

// Client island. The ONE /buy popup. Fires once per visitor (localStorage
// "ff:popup:july4"), about 2 seconds after load. Title/body come from season
// config. "Claim It" pins the FOURTH code chip near the buy button (store
// flag). X dismisses, Escape closes, focus is trapped, focus returns to the
// page on close, and it never re-fires. It must never appear during the
// checkout redirect (we only ever schedule it once, right after load).

const LS_KEY = "ff:popup:july4";
const DELAY_MS = 2000;

export function July4Popup() {
  const [open, setOpen] = useState(false);
  const claimPromo = useBuyStore((s) => s.claimPromo);

  const dialogRef = useRef<HTMLDivElement>(null);
  const claimRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const markSeen = useCallback(() => {
    try {
      window.localStorage.setItem(LS_KEY, "1");
    } catch {
      // ignore storage failures; the timer below won't re-arm this session
    }
  }, []);

  // Schedule the single appearance ~2s after mount, only if never seen.
  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(LS_KEY) === "1";
    } catch {
      seen = false;
    }
    if (seen) return;

    const id = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  const close = useCallback(() => {
    markSeen();
    setOpen(false);
    previouslyFocused.current?.focus();
  }, [markSeen]);

  const claim = useCallback(() => {
    track("popup_claim", {});
    claimPromo();
    close();
  }, [claimPromo, close]);

  // On open: remember focus, move focus into the dialog, lock body scroll.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    claimRef.current?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Escape to close + focus trap (Tab cycles within the dialog).
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;

      const root = dialogRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
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
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy-deep/70 p-4"
      onClick={close}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="july4-popup-title"
        aria-describedby="july4-popup-body"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-xl border border-brand-gold/40 bg-brand-cream-soft p-6 text-center shadow-2xl"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-md p-1 text-2xl leading-none text-brand-navy/60 hover:text-brand-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
        >
          <span aria-hidden="true">×</span>
        </button>

        <h2
          id="july4-popup-title"
          className="font-mkt-display text-2xl font-bold uppercase tracking-tight text-brand-navy"
        >
          {season.popup.title}
        </h2>
        <p id="july4-popup-body" className="mt-3 text-base text-brand-ink/85">
          {season.popup.body}
        </p>

        <button
          ref={claimRef}
          type="button"
          onClick={claim}
          className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-brand-red px-6 py-3 text-base font-semibold uppercase tracking-wide text-brand-white transition-colors hover:bg-brand-red/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
        >
          Claim It
        </button>
      </div>
    </div>
  );
}
