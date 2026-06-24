"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * A spotlight coachmark tour for the /build designer.
 *
 * Each step points at a REAL piece of UI: it dims the whole screen except a
 * rounded "hole" cut over the target, rings the target, draws an arrow, and
 * shows a short caption with Back / Next / Skip. Fully keyboard accessible
 * (role=dialog, focus moves to the caption, Escape closes, Tab is trapped to
 * the caption controls) and never auto-repeats — the caller gates it on
 * first-visit localStorage.
 *
 * Targets are resolved by a `resolve()` selector per step so we never have to
 * edit the order-flow / canvas / text-editor components to add markers.
 */

export interface TourStep {
  /** Stable key (used for analytics / React keys). */
  key: string;
  /** Finds the element to highlight. Return null to fall back to a centered card. */
  resolve: () => HTMLElement | null;
  title: string;
  body: string;
  /** Preferred caption placement relative to the target. */
  placement?: "top" | "bottom" | "auto";
}

interface CoachmarkTourProps {
  steps: TourStep[];
  onClose: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8; // breathing room around the spotlight hole
const CARD_W = 300;
const CARD_GAP = 16; // gap between target and caption card / arrow

export function CoachmarkTour({ steps, onClose }: CoachmarkTourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  // Remember focus to restore on close.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    return () => previouslyFocused.current?.focus?.();
  }, []);

  // Measure the current target (and keep it fresh on scroll / resize).
  const measure = useCallback(() => {
    const el = step?.resolve() ?? null;
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  // Scroll the target into view, then measure. Re-run when the step changes.
  useLayoutEffect(() => {
    const el = step?.resolve() ?? null;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    // Measure after the smooth scroll settles, plus an immediate pass.
    measure();
    const t = window.setTimeout(measure, 320);
    return () => window.clearTimeout(t);
  }, [step, measure]);

  useEffect(() => {
    const onChange = () => measure();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [measure]);

  const goNext = useCallback(() => {
    if (isLast) onClose();
    else setIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [isLast, onClose, steps.length]);

  const goBack = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Move focus into the caption on each step; trap Tab; Escape closes.
  useEffect(() => {
    cardRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
        return;
      }
      if (e.key !== "Tab") return;
      const node = cardRef.current;
      if (!node) return;
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>("button")
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
  }, [index, goNext, goBack, onClose]);

  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;

  // Spotlight hole geometry (clamped to viewport).
  const hole = rect
    ? {
        top: Math.max(rect.top - PADDING, 0),
        left: Math.max(rect.left - PADDING, 0),
        width: Math.min(rect.width + PADDING * 2, vw),
        height: Math.min(rect.height + PADDING * 2, vh),
      }
    : null;

  // Decide whether the caption sits above or below the target.
  const placeBelow = (() => {
    if (!hole) return true;
    if (step?.placement === "top") return false;
    if (step?.placement === "bottom") return true;
    const spaceBelow = vh - (hole.top + hole.height);
    const spaceAbove = hole.top;
    return spaceBelow >= spaceAbove;
  })();

  // Caption card position.
  const cardStyle: React.CSSProperties = hole
    ? (() => {
        const centerX = hole.left + hole.width / 2;
        const left = Math.min(Math.max(centerX - CARD_W / 2, 12), vw - CARD_W - 12);
        const top = placeBelow
          ? Math.min(hole.top + hole.height + CARD_GAP, vh - 12)
          : undefined;
        const bottom = placeBelow ? undefined : Math.max(vh - hole.top + CARD_GAP, 12);
        return { left, top, bottom, width: CARD_W };
      })()
    : { left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: CARD_W };

  // Arrow position (points from the caption toward the target edge).
  const arrowStyle: React.CSSProperties | null = hole
    ? (() => {
        const centerX = Math.min(
          Math.max(hole.left + hole.width / 2, 24),
          vw - 24
        );
        return placeBelow
          ? { left: centerX - 9, top: hole.top + hole.height + 2 }
          : { left: centerX - 9, top: hole.top - 14 };
      })()
    : null;

  return (
    <div className="fixed inset-0 z-[60]" aria-live="polite">
      {/* Dimming overlay with a spotlight hole punched over the target. */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        width={vw}
        height={vh}
      >
        <defs>
          <mask id="ff-tour-mask">
            <rect x={0} y={0} width={vw} height={vh} fill="white" />
            {hole && (
              <rect
                x={hole.left}
                y={hole.top}
                width={hole.width}
                height={hole.height}
                rx={12}
                ry={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x={0}
          y={0}
          width={vw}
          height={vh}
          fill="rgba(0,0,0,0.72)"
          mask="url(#ff-tour-mask)"
        />
      </svg>

      {/* Backdrop click (outside the hole) advances; clicks inside the hole pass
          through visually but we keep the layer so the page stays inert. */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={goNext}
        className="absolute inset-0 h-full w-full cursor-default focus:outline-none"
      />

      {/* Ring around the target. */}
      {hole && (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-brand-gold
            shadow-[0_0_0_4px_rgba(248,197,59,0.25)] transition-all duration-200"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
          }}
        />
      )}

      {/* Arrow pointing at the target. */}
      {arrowStyle && (
        <div
          className="pointer-events-none absolute h-0 w-0"
          style={{
            ...arrowStyle,
            borderLeft: "9px solid transparent",
            borderRight: "9px solid transparent",
            ...(placeBelow
              ? { borderBottom: "12px solid #f8c53b" }
              : { borderTop: "12px solid #f8c53b" }),
          }}
        />
      )}

      {/* Caption card. */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ff-tour-title"
        tabIndex={-1}
        className="absolute rounded-2xl border-2 border-[#1e1b17] bg-surface-800 p-4
          shadow-2xl focus:outline-none"
        style={cardStyle}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-gold text-xs font-extrabold text-black">
            {index + 1}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-surface-400">
            Step {index + 1} of {steps.length}
          </span>
        </div>
        <h2 id="ff-tour-title" className="text-base font-extrabold text-surface-50">
          {step?.title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-surface-300">{step?.body}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xs font-medium text-surface-400
              hover:bg-surface-700 hover:text-surface-100
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold transition-colors"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={goBack}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-surface-200
                  hover:bg-surface-700
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              className="rounded-lg bg-gradient-to-r from-brand-gold to-yellow-500 px-4 py-2
                text-sm font-bold text-black hover:from-yellow-400 hover:to-yellow-500 active:scale-95
                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold transition-all"
            >
              {isLast ? "Got it!" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
