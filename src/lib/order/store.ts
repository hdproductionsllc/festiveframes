// ─────────────────────────────────────────────────────────────
// In-memory order draft store + idempotency guard.
//
// A custom order's design + rendered artifacts are POSTed to /api/order/draft
// BEFORE the customer is sent to Stripe, and stashed here keyed by orderId.
// After payment, fulfillment can fire from two places (the /thanks success
// page relay and the Stripe webhook); both converge on fulfillOrder(), and
// markFulfilled() guarantees the production emails send exactly once.
//
// NOTE: this is per-process memory. It is correct for a single Railway
// instance (today's deploy). The /thanks relay also carries the payload in
// the customer's localStorage, so fulfillment still works across a restart or
// a second instance. A shared Postgres/Redis store is the documented V2 for
// horizontal scaling. Nothing here is a hard dependency — missing data
// degrades to a failure alert, never a silent drop.
// ─────────────────────────────────────────────────────────────

import type { PartsList } from "@/lib/order/parts-list";
import type { NamedImage } from "@/lib/email-production";

export interface OrderArtifacts {
  proof: NamedImage | null;
  printSheets: NamedImage[];
  banners: NamedImage[];
}

export interface OrderDraft {
  orderId: string;
  parts: PartsList;
  artifacts: OrderArtifacts;
  /** Raw design JSON, kept so Bill can regenerate a print sheet on desktop. */
  design?: unknown;
  savedAt: number;
}

const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const drafts = new Map<string, OrderDraft>();
const fulfilled = new Set<string>();

function sweep(): void {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, d] of drafts) if (d.savedAt < cutoff) drafts.delete(id);
}

export function saveDraft(draft: Omit<OrderDraft, "savedAt">): void {
  sweep();
  drafts.set(draft.orderId, { ...draft, savedAt: Date.now() });
}

export function getDraft(orderId: string): OrderDraft | undefined {
  return drafts.get(orderId);
}

/**
 * Atomically claims fulfillment for an orderId. Returns true only for the
 * FIRST caller; every subsequent caller (webhook retry, page refresh, the
 * other trigger) gets false and must no-op. Node is single-threaded, so the
 * check-and-set below is atomic.
 */
export function markFulfilled(orderId: string): boolean {
  if (fulfilled.has(orderId)) return false;
  fulfilled.add(orderId);
  return true;
}

/** Release a claim so a later trigger can retry (used when a claim can't proceed). */
export function unmarkFulfilled(orderId: string): void {
  fulfilled.delete(orderId);
}
