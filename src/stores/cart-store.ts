"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MAX_CART_FRAMES, priceForFramesCents, bulkSavingsCents, offer } from "@/config/offers";

// ─────────────────────────────────────────────────────────────
// The cart — a list of finished designs the buyer is about to order.
//
// THE CART *IS* THE ORDER: a single frame is just a cart of length 1. Each line
// is one design (already rendered + stashed server-side as an order draft) plus
// how many of that exact design to make. The heavy design/artifacts live in the
// server draft keyed by `orderId`; the cart only carries light metadata, so it
// stays tiny in localStorage and survives the Stripe round-trip.
//
// PRICING is never decided here. priceForFramesCents() mirrors the server's
// authoritative pairs pricing for DISPLAY; the checkout API re-derives the real
// charge from the stored drafts. We never send an amount.
// ─────────────────────────────────────────────────────────────

export interface CartLine {
  /** orderId of the stored design draft (the server-side carrier). */
  orderId: string;
  designName: string;
  /** Small proof thumbnail (data URL) for the cart row. */
  thumbDataUrl: string | null;
  /** How many of this exact design to make (>= 1). */
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  addLine: (line: CartLine) => void;
  setQuantity: (orderId: string, quantity: number) => void;
  removeLine: (orderId: string) => void;
  clear: () => void;
}

/** Total frames already in the cart (sum of quantities). */
export function cartTotalFrames(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],

      addLine: (line) =>
        set((state) => {
          // Never exceed the production cap. A fresh line starts at qty 1 (or
          // less if only a sliver of headroom remains — defensive, normally 1).
          const used = cartTotalFrames(state.lines);
          const room = Math.max(0, MAX_CART_FRAMES - used);
          if (room <= 0) return state; // full — drop silently; UI guards too
          const quantity = Math.min(Math.max(1, Math.floor(line.quantity || 1)), room);
          return { lines: [...state.lines, { ...line, quantity }] };
        }),

      setQuantity: (orderId, quantity) =>
        set((state) => {
          const otherFrames = cartTotalFrames(state.lines.filter((l) => l.orderId !== orderId));
          const room = Math.max(1, MAX_CART_FRAMES - otherFrames);
          const q = Math.min(Math.max(1, Math.floor(quantity)), room);
          return {
            lines: state.lines.map((l) => (l.orderId === orderId ? { ...l, quantity: q } : l)),
          };
        }),

      removeLine: (orderId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.orderId !== orderId) })),

      clear: () => set({ lines: [] }),
    }),
    { name: "ff:cart" },
  ),
);

// ── Display-only pricing helpers (server re-derives the real charge) ──────────

export interface CartTotals {
  frames: number;
  /** Sum at the flat single price (what it would cost with no bulk discount). */
  fullCents: number;
  /** Authoritative pairs-priced subtotal for the frames. */
  subtotalCents: number;
  /** fullCents - subtotalCents (>= 0). */
  savingsCents: number;
  shippingCents: number;
  totalCents: number;
}

export function cartTotals(lines: CartLine[], shippingCents: number): CartTotals {
  const frames = cartTotalFrames(lines);
  const subtotalCents = priceForFramesCents(frames);
  const fullCents = frames * offer.singlePrice;
  const ship = frames > 0 ? shippingCents : 0;
  return {
    frames,
    fullCents,
    subtotalCents,
    savingsCents: bulkSavingsCents(frames),
    shippingCents: ship,
    totalCents: subtotalCents + ship,
  };
}
