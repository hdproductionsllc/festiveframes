import type { PlacedTile } from "@/lib/types";
import { UPLOAD_RIGHTS_VERSION } from "@/content/upload-rights";

// ─── Uploaded artwork on an ORDER ────────────────────────────────────────────
//
// The gate collects the attestation (see `components/designer/UploadRightsGate`);
// this module is what the ORDER knows about it. Four callers, one answer:
//
//   • the builder, deciding whether to ask before letting a design be submitted;
//   • `/api/school/submit`, the path school orders actually take today;
//   • `/api/checkout`, which writes the record into Stripe metadata;
//   • the production email, which tells the team the art was customer-supplied.
//
// It is a separate module from the store on purpose: the server must be able to
// validate and record an attestation without importing a client store, and the
// TYPE has to be the same one on both sides or the two halves of this can drift
// while everything still compiles.

/** A recorded acceptance of the uploaded-artwork terms. */
export interface ArtworkRights {
  /** `UPLOAD_RIGHTS_VERSION` as it stood when the customer accepted. */
  version: string;
  /** Epoch ms. */
  acceptedAt: number;
}

/**
 * Does this design carry art the CUSTOMER supplied?
 *
 * `tile.image` is the one marker for uploaded art — a set piece never carries it
 * (see `PlacedTile.image`), so this is exact rather than a heuristic. /build has
 * no upload path at all, which is why nothing there needs an attestation.
 */
export function designHasUploadedArt(slots: Record<string, PlacedTile>): boolean {
  return Object.values(slots).some((t) => Boolean(t?.image));
}

/**
 * Is this attestation the CURRENT one?
 *
 * Presence is not enough. If the wording changes, a record made under the old
 * words is not agreement to the new ones, so the gate fires again. That is the
 * whole reason the version is stored rather than a bare `true`.
 */
export function isCurrentAttestation(r: ArtworkRights | null | undefined): boolean {
  return r?.version === UPLOAD_RIGHTS_VERSION;
}

/**
 * Read an attestation off an untrusted request body.
 *
 * Returns null for anything malformed, which every caller treats as "not
 * attested" — the safe direction. It deliberately does NOT check the version
 * against the current one: a record of older wording is still a real record and
 * belongs in the order, and refusing it here would silently discard evidence.
 * Use `isCurrentAttestation` when the question is whether to ask again.
 */
export function coerceArtworkRights(value: unknown): ArtworkRights | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.version !== "string" || !v.version || v.version.length > 40) return null;
  if (typeof v.acceptedAt !== "number" || !Number.isFinite(v.acceptedAt) || v.acceptedAt <= 0) {
    return null;
  }
  return { version: v.version, acceptedAt: v.acceptedAt };
}

/**
 * One line describing the artwork on this order, for a human reading the record.
 *
 * Used by the production email and by Stripe metadata, so the team's inbox and
 * the payment record say the same thing. An order with no uploaded art says so
 * plainly rather than being silent — silence reads as "nobody checked".
 */
export function artworkRightsLine(
  hasUploadedArt: boolean,
  rights: ArtworkRights | null,
): string {
  if (!hasUploadedArt) return "No customer-uploaded artwork (our library only).";
  if (!rights) {
    // Reachable only by a direct POST: the builder asks before it submits. Worth
    // stating loudly rather than omitting, because this is the one an operator
    // must not print without looking at.
    return "Customer-uploaded artwork — NO RIGHTS ATTESTATION ON RECORD. Do not print without checking.";
  }
  const on = new Date(rights.acceptedAt).toISOString().replace("T", " ").slice(0, 16);
  return `Customer-uploaded artwork — rights attested (terms ${rights.version}) on ${on} UTC.`;
}

/**
 * Stripe metadata for the artwork on this order.
 *
 * Stripe caps metadata at 50 keys and 500 characters per value; this spends two
 * keys and short values. `artUploaded` is the field a report can filter on, and
 * `artRights` is the evidence beside it.
 */
export function artworkOrderMetadata(
  hasUploadedArt: boolean,
  rights: ArtworkRights | null,
): { artUploaded: string; artRights: string } {
  return {
    artUploaded: hasUploadedArt ? "yes" : "no",
    artRights: hasUploadedArt
      ? rights
        ? `${rights.version}@${new Date(rights.acceptedAt).toISOString()}`
        : "none"
      : "n/a",
  };
}
