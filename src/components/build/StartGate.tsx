"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDesignStore, defaultDesignStore } from "@/stores/design-store";
import { StateSelector } from "@/components/frame/StateSelector";
import { LOOK_PRESETS } from "@/data/look-presets";
import { track } from "@/lib/analytics";

/** localStorage flag set once the start gate is completed, so it never re-prompts. */
export const STARTED_KEY = "ff:started";

/**
 * Read the started flag (SSR-safe). Blocked storage is treated as "started" so
 * we never trap a user behind a modal we can't dismiss persistently.
 */
function readStarted(): boolean {
  try {
    return window.localStorage.getItem(STARTED_KEY) === "1";
  } catch {
    return true;
  }
}

/** The zustand persist store name (see design-store.ts). */
const PERSIST_KEY = "festive-frames-design-v5";

/**
 * Did a REAL design exist in persistence at page load? We read the raw persisted
 * blob rather than the live store on purpose: the Designer seed effect populates
 * the in-memory store with a starter design for fresh visitors, so the live
 * `slots`/`textBars` cannot tell a brand-new visitor (just seeded) apart from a
 * returning one (restored). The persisted blob CAN — only a returning user's
 * saved design is on disk; the seed never writes until the user edits.
 */
function hasPersistedDesign(): boolean {
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { state?: { slots?: unknown; textBars?: unknown[] } };
    const state = parsed?.state;
    if (!state) return false;
    const slotCount =
      state.slots && typeof state.slots === "object" ? Object.keys(state.slots).length : 0;
    const barCount = Array.isArray(state.textBars) ? state.textBars.length : 0;
    return slotCount > 0 || barCount > 0;
  } catch {
    return false;
  }
}

/**
 * Snapshot, captured at module-eval time on the client — i.e. BEFORE any React
 * effect (notably the Designer seed) has run — of whether a real design was on
 * disk at page load. Reading it here, rather than inside the gate's effect,
 * makes the decision immune to the seed persisting a starter design first.
 */
const PERSISTED_DESIGN_AT_LOAD =
  typeof window !== "undefined" ? hasPersistedDesign() : false;

/**
 * Decide whether a brand-new visitor should be gated. A RETURNING user whose
 * design was restored from persistence (any saved slots OR text bars) is never
 * gated, and neither is anyone who has already completed the gate (ff:started).
 */
function shouldGate(): boolean {
  if (readStarted()) return false;
  return !PERSISTED_DESIGN_AT_LOAD;
}

/**
 * The friendly default name to pre-fill. A visitor arriving from a homepage
 * "Build this look" link (/build?look=<id>) gets that look's name; otherwise we
 * start from the store's current name (its default placeholder), pre-selected so
 * a single keystroke replaces it.
 */
function initialName(): string {
  const current = defaultDesignStore.getState().designName;
  if (typeof window === "undefined") return current;
  const look = new URLSearchParams(window.location.search).get("look");
  const preset = look ? LOOK_PRESETS[look] : undefined;
  return preset?.name ?? current;
}

/**
 * Start gate for the /build designer.
 *
 * The FIRST thing a brand-new visitor sees: a blocking, sticker-themed modal
 * that asks them to (1) name their design and (2) confirm their State before the
 * builder becomes usable. The themed seed (Designer.tsx) runs BEHIND this modal,
 * so a starting design — and the picked plate state — are already applied when
 * they finish. On submit we persist the name+state (already in the store), set
 * the `ff:started` flag, and reveal the builder.
 *
 * `onComplete` is called whenever the gate is finished OR was never needed, so
 * the parent can sequence the (lower-priority) onboarding tour to run AFTER it.
 */
export function StartGate({ onComplete }: { onComplete: () => void }) {
  const setDesignName = useDesignStore((s) => s.setDesignName);
  const setPlateState = useDesignStore((s) => s.setPlateState);

  // Resolve the gating decision exactly once, on the client, after hydration.
  const [open, setOpen] = useState<boolean | null>(null);
  const [name, setName] = useState("");

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const completedRef = useRef(false);

  // Notify the parent the gate is done (or unneeded) exactly once.
  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  // First client render: decide whether to gate. If not needed, signal complete
  // immediately so onboarding can proceed; if needed, seed the name field.
  useEffect(() => {
    if (shouldGate()) {
      setName(initialName());
      setOpen(true);
      track("builder_start_gate_open");
    } else {
      setOpen(false);
      complete();
    }
  }, [complete]);

  const trimmed = name.trim();
  // Gate the CTA on a non-empty trimmed name. The store always carries a default
  // plateState, so a state is always "selected" — the picker lets the user
  // confirm/change it, and we treat the shown state as their choice.
  const canStart = trimmed.length > 0;

  const handleStart = useCallback(() => {
    if (!trimmed) return;
    setDesignName(trimmed);
    // plateState is already written live by StateSelector; re-assert the current
    // value so the flow reads as an explicit confirmation.
    setPlateState(defaultDesignStore.getState().plateState);
    try {
      window.localStorage.setItem(STARTED_KEY, "1");
    } catch {
      // Ignore storage failures — the in-memory state still unlocks the builder.
    }
    track("builder_start_gate_complete");
    setOpen(false);
    complete();
  }, [trimmed, setDesignName, setPlateState, complete]);

  // Focus + select the pre-filled name so a single keystroke replaces it, and
  // trap focus while the gate is open (it is a true blocking modal).
  useEffect(() => {
    if (open !== true) return;
    const node = dialogRef.current;
    if (!node) return;
    inputRef.current?.focus();
    inputRef.current?.select();

    const onKeyDown = (e: KeyboardEvent) => {
      // Intentionally NO Escape-to-close: the gate is blocking by design.
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
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
  }, [open]);

  if (open !== true) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#1e1b17]/70 backdrop-blur-sm"
      // Blocking: clicking the backdrop does nothing. No close affordance.
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ff-start-gate-title"
        tabIndex={-1}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border-[3px] border-[#1e1b17]
          bg-[#fff9ec] shadow-[5px_5px_0_#1e1b17] focus:outline-none"
      >
        {/* Gold header band with a playful badge. */}
        <div className="flex items-center gap-2 border-b-[3px] border-[#1e1b17] bg-[#f8c53b] px-5 py-3">
          <span aria-hidden="true" className="text-xl leading-none">🎆</span>
          <h2
            id="ff-start-gate-title"
            className="text-lg font-extrabold tracking-tight text-[#1e1b17]"
            style={{ fontFamily: '"Fredoka", var(--font-sans)' }}
          >
            Let&apos;s start your frame
          </h2>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleStart();
          }}
          className="p-5"
        >
          <p className="mb-4 text-sm font-semibold text-[#1e1b17]/75">
            Two quick things and you&apos;re designing — name it and tell us your state.
          </p>

          {/* Name your design */}
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">
              Name your design
            </span>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="e.g. The Johnsons' Jeep"
              className="w-full rounded-lg border-[3px] border-[#1e1b17] bg-white px-3 py-2.5 text-sm
                font-semibold text-[#1e1b17] shadow-[2px_2px_0_#1e1b17] placeholder:text-[#1e1b17]/35
                focus:outline-none focus:ring-2 focus:ring-[#ed5aa0]"
            />
          </label>

          {/* State (license plate) picker — reuses the shared StateSelector,
              which writes plateState through the design store. The .build-skin
              CSS reskins its dark default styling to the cream/ink sticker look. */}
          <div className="mt-4">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">
              Your state (license plate)
            </span>
            <StateSelector />
          </div>

          <button
            type="submit"
            disabled={!canStart}
            className="mt-6 w-full rounded-full border-[3px] border-[#1e1b17] bg-[#ed5aa0] px-5 py-3
              text-sm font-extrabold uppercase tracking-wide text-white shadow-[3px_3px_0_#1e1b17]
              transition-all hover:brightness-105 active:translate-y-0.5 active:translate-x-0.5
              active:shadow-[1px_1px_0_#1e1b17] disabled:cursor-not-allowed disabled:opacity-40
              disabled:hover:brightness-100"
          >
            Start designing →
          </button>
        </form>
      </div>
    </div>
  );
}
