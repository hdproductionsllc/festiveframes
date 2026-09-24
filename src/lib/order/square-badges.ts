import type { PartsRow } from "@/lib/order/parts-list";
import { SCHOOL_VARIANTS } from "@/data/school-variants";
import { badgeRule } from "@/lib/utils/snappet";

// ─── The square rule, at the order boundary ──────────────────────────────────
//
// The builder refuses a non-square badge (`canPlace`, reason "shape"), but the
// order route cannot see the builder: it receives a print file and a parts list
// from the client. The parts list is where a badge's footprint is stated in the
// one unit that is the same on every lattice, its PHYSICAL size, so that is where
// the server checks it.
//
// What this is, honestly: a check against a STALE BUILDER (a tab opened before the
// rule shipped), not a lock against a hand-made POST. It runs only when a parts
// list is sent, and it trusts the `size` each row states — a request that omits
// the list, or states false sizes, passes. The real protection is the builder's
// own `canPlace` gate; this is defence in depth. BOTH school order doors run it:
// /api/school/submit on the list it is sent, and /api/checkout (kind
// "school-frame") on the list stashed in the order draft — where a MISSING list is
// refused too, because a paid order with no parts list cannot be produced.

/**
 * Every frame the school order routes take orders for carries THE SQUARE RULE (a
 * badge is a square; FrameConfig.badgeShape). Derived from the variants rather
 * than assumed, so a future school geometry without the rule is not silently
 * refused.
 */
export const SCHOOL_BADGES_ARE_SQUARE = Object.values(SCHOOL_VARIANTS).every(
  (v) => badgeRule(v.config).square,
);

/** What a parent is told when an order breaks the rule — one wording, both doors. */
export const SQUARE_RULE_MESSAGE =
  "Every badge on the frame must be square. Reload the builder (your design is kept) and send it again.";

/** Sizes are sent at 2dp ("2.25 x 2.25"); a hundredth of rounding either way. */
const TOLERANCE_IN = 0.011;

const SIZE_RE = /^\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i;

/**
 * Direct-print PANEL parts (a banner in text mode, a panel printed as one image)
 * are the panel's own rectangle by nature — an 11 x 0.75 runner is not a badge.
 * Everything else in the list is a badge.
 */
function isPanelPart(row: Pick<PartsRow, "pieceId">): boolean {
  return row.pieceId.startsWith("panel:");
}

/**
 * The badge rows that are not square, or whose size cannot be read (a badge the
 * server cannot measure is a badge it cannot vouch for). Empty = the order obeys
 * the rule.
 */
export function nonSquareBadgeRows(rows: ReadonlyArray<Pick<PartsRow, "pieceId" | "size">>): string[] {
  const bad: string[] = [];
  for (const row of rows) {
    if (isPanelPart(row)) continue;
    const m = SIZE_RE.exec(row.size);
    const w = m ? Number(m[1]) : NaN;
    const h = m ? Number(m[2]) : NaN;
    if (!Number.isFinite(w) || !Number.isFinite(h) || Math.abs(w - h) > TOLERANCE_IN) {
      bad.push(`${row.pieceId} (${row.size || "no size"})`);
    }
  }
  return bad;
}
