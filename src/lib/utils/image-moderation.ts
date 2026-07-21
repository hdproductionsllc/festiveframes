// ─── Content moderation integration point (NOT YET IMPLEMENTED) ──────────────
//
// User-uploaded images are PRINTED and shipped, so before this feature goes to
// production every upload MUST pass an automated content-moderation check (nudity /
// violence / hate) via a server-side vision moderation API, plus a manual review
// queue for flagged or low-confidence items. See tasks/CUSTOM_TILE_UPLOAD_PLAN.md §5.
//
// This is the SINGLE, deliberately-honest integration point. It does NOT run any
// check and does NOT fake an approval: it returns `unmoderated`, recording only
// that the image still needs a real gate. A green "approved" here would be a lie
// that could ship prohibited content to print — so the caller must treat
// `unmoderated` as "not cleared for production", never as a pass.
//
// TODO(moderation): replace the body with a real server-side call:
//   1. upload the full-res blob to the moderation endpoint (vision API),
//   2. block confirm/production on a REJECT verdict,
//   3. route low-confidence results to a manual review queue,
//   4. persist the verdict alongside the order.
// Client-side code cannot moderate trustworthily, so the check belongs on the
// server at upload/checkout — this function marks where that call plugs in.

export type ModerationStatus = "unmoderated" | "approved" | "rejected" | "pending";

export interface ModerationResult {
  status: ModerationStatus;
}

/**
 * Placeholder moderation hook. Returns `unmoderated` — the image has NOT been
 * checked. Wire a real server-side vision moderation call here before production
 * (see the TODO above). Never change this to return `approved` without a real
 * check behind it.
 */
export async function reviewUploadedImage(blob: Blob): Promise<ModerationResult> {
  // The real implementation uploads `blob` to a server-side vision moderation API
  // (see the TODO above). Until then it is intentionally unused — reference it so
  // the signature stays honest about what production will send.
  void blob;
  return { status: "unmoderated" };
}
