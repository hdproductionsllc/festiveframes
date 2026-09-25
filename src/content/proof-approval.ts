// ─────────────────────────────────────────────────────────────
// What a parent agrees to when they approve a proof — ONE statement of it.
//
// The proof sheet shows it, the approval route records `PROOF_APPROVAL_VERSION`
// on the revision, and the production email names the approval. Bump the version
// only when the MEANING changes: a stored approval then says which words were
// agreed to, the way UPLOAD_RIGHTS_VERSION does for artwork.
// ─────────────────────────────────────────────────────────────

export const PROOF_APPROVAL_VERSION = "2026-09-25";

export const PROOF_APPROVAL_STATEMENT =
  "I've checked this proof, including every letter of the names and words, and I'd like it made exactly as shown.";
