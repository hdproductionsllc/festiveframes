/**
 * place-fx.ts — a featherweight pub/sub so the builder's place sites can fire a
 * one-shot "a tile just LANDED here" signal that the matching cell turns into a
 * festive snap + sparkle. This keeps the celebration EVENT-driven (it fires only
 * on a real user placement) instead of being derived from prop diffing, and it
 * touches neither the design store nor the order pipeline.
 *
 * It is intentionally tiny: a Set of listeners keyed by nothing — every listener
 * receives every slotId and decides if it's theirs. There are only a few dozen
 * cells, so this is cheaper and simpler than a per-slot registry.
 */
type Listener = (slotId: string) => void;

const listeners = new Set<Listener>();

/** Announce that a tile landed in `slotId` (placed or moved-into). */
export function emitTilePlaced(slotId: string): void {
  for (const fn of listeners) fn(slotId);
}

/** Subscribe to placement events. Returns an unsubscribe fn. */
export function onTilePlaced(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
