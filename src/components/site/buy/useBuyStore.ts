"use client";

import { create } from "zustand";
import { getKit, getActiveKits } from "@/config/kits";
import { offer, ALPHABET_ADDON, type OfferSelection } from "@/config/offers";

// ─────────────────────────────────────────────────────────────
// Buy-page client state. Holds the visitor's current selection so the
// hero, kit picker, offer block, and sticky bar all stay in sync, and
// so a cancel-return to /buy restores exactly what they had.
//
// PERSISTENCE / URL CONTRACT:
//   - On mount, hydrate selectedKitId from ?kit=<id> first (if it is a
//     valid ACTIVE kit), else from localStorage "ff:selectedKit", else
//     fall back to "american-classic".
//   - On every selectedKitId change, write localStorage AND update the
//     ?kit= query via history.replaceState (no navigation, no scroll).
//
// PRICING: this store never holds or computes a charge amount. The
// server is the only pricing authority. We only carry the inputs the
// checkout contract needs: { selection, kitIds, quantity }.
// ─────────────────────────────────────────────────────────────

const LS_KEY = "ff:selectedKit";
const DEFAULT_KIT_ID = "american-classic";
const MIN_QTY = 1;
const MAX_QTY = 5;

/** True only for ids that map to an active storefront kit. */
function isActiveKitId(id: string | null | undefined): id is string {
  if (!id) return false;
  const kit = getKit(id);
  return Boolean(kit?.active);
}

/** Clamp any number to an integer in [1, 5]. */
function clampQty(n: number): number {
  if (!Number.isFinite(n)) return MIN_QTY;
  return Math.min(MAX_QTY, Math.max(MIN_QTY, Math.round(n)));
}

/** Clamp the letter-set add-on quantity to an integer in [0, max]. */
function clampAddon(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(ALPHABET_ADDON.maxQty, Math.max(0, Math.round(n)));
}

interface BuyState {
  selectedKitId: string;
  selection: OfferSelection;
  /** Second kit in a bundle (the optional "mix kits" choice). */
  secondKitId: string;
  quantity: number;
  /** Whether the store has hydrated from the URL/localStorage yet. */
  hydrated: boolean;
  /** Visitor claimed the FOURTH promo from the popup; show the code chip. */
  promoClaimed: boolean;
  /** A-Z & 0-9 letter-set add-on quantity (+$10 each, 0 = none). */
  alphabetQty: number;

  hydrate: (kitParam: string | null) => void;
  setSelectedKit: (id: string) => void;
  setSelection: (selection: OfferSelection) => void;
  setSecondKit: (id: string) => void;
  setQuantity: (n: number) => void;
  claimPromo: () => void;
  setAlphabetQty: (n: number) => void;
}

/** Mirror the current selected kit into localStorage + the ?kit= query. */
function persistSelectedKit(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, id);
  } catch {
    // Private mode / storage disabled: selection still works for the session.
  }
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("kit", id);
    window.history.replaceState(window.history.state, "", url);
  } catch {
    // history unavailable: non-fatal, state is still in memory.
  }
}

export const useBuyStore = create<BuyState>((set, get) => ({
  selectedKitId: DEFAULT_KIT_ID,
  selection: offer.defaultSelection,
  secondKitId: DEFAULT_KIT_ID,
  quantity: MIN_QTY,
  hydrated: false,
  promoClaimed: false,
  alphabetQty: 0,

  hydrate: (kitParam) => {
    // Already hydrated once; do not stomp user interaction on re-mounts.
    if (get().hydrated) return;

    let resolved = DEFAULT_KIT_ID;
    if (isActiveKitId(kitParam)) {
      resolved = kitParam;
    } else if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(LS_KEY);
        if (isActiveKitId(stored)) resolved = stored;
      } catch {
        // ignore storage read failures
      }
    }

    set({
      selectedKitId: resolved,
      secondKitId: resolved,
      hydrated: true,
    });
    persistSelectedKit(resolved);
  },

  setSelectedKit: (id) => {
    if (!isActiveKitId(id)) return;
    // Keep the bundle's second kit pinned to the primary unless the
    // visitor has explicitly mixed; default behavior is "two of the same".
    set((state) => ({
      selectedKitId: id,
      secondKitId: state.secondKitId === state.selectedKitId ? id : state.secondKitId,
    }));
    persistSelectedKit(id);
  },

  setSelection: (selection) => set({ selection }),

  setSecondKit: (id) => {
    if (!isActiveKitId(id)) return;
    set({ secondKitId: id });
  },

  setQuantity: (n) => set({ quantity: clampQty(n) }),

  claimPromo: () => set({ promoClaimed: true }),

  setAlphabetQty: (n) => set({ alphabetQty: clampAddon(n) }),
}));

export { MIN_QTY, MAX_QTY, DEFAULT_KIT_ID, isActiveKitId, clampQty };
export const ACTIVE_KITS = getActiveKits();
