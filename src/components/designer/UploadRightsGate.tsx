"use client";

import { useState } from "react";
import { ARTWORK_TAKEDOWN_EMAIL, UPLOAD_RIGHTS } from "@/content/upload-rights";

// ─── The upload-rights gate ──────────────────────────────────────────────────
//
// Shown ONCE per design, immediately before the first upload's crop step. It is
// rendered by `useSnappetUpload` rather than by any button, because that hook is
// the one chokepoint all three upload entry points already share — a gate that
// lives on a button is a gate the fourth caller forgets.
//
// WHY A GATE AND NOT A CHECKBOX IN THE CROP MODAL. This is a phone product. A
// checkbox on every upload is friction paid forever, and a box ticked in the
// corner of a busy crop screen is a weaker record than a screen that stops and
// says what is being agreed to. Stopping once is the honest trade: the parent
// reads it, and the next four uploads are one tap each.
//
// The words are NOT written here — they are `content/upload-rights.ts`, the same
// source the terms page renders, so the deal a parent agrees to and the deal the
// terms describe cannot drift apart.

export function UploadRightsGate({
  onAccept,
  onCancel,
}: {
  onAccept: () => void;
  onCancel: () => void;
}) {
  const [checked, setChecked] = useState(false);

  return (
    <div
      className="ff-school-portal ff-scrim fixed inset-0 z-[120] flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ff-rights-title"
      onClick={onCancel}
    >
      <div
        className="ff-modal w-full max-w-[400px] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="ff-rights-title" className="ff-h2 mb-2">
          {UPLOAD_RIGHTS.title}
        </h3>

        {UPLOAD_RIGHTS.body.map((line) => (
          <p key={line} className="ff-help mb-2">
            {line}
          </p>
        ))}

        {/* The label WRAPS the input so the whole sentence is the hit target —
            a 16px checkbox alone is not a tap target on a phone. */}
        <label className="ff-well mt-3 flex cursor-pointer items-start gap-2.5 px-2.5 py-2.5">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--ff-accent)]"
          />
          <span className="text-[13px] font-medium leading-snug text-[var(--ff-ink)]">
            {UPLOAD_RIGHTS.checkbox}
          </span>
        </label>

        <button
          type="button"
          disabled={!checked}
          onClick={onAccept}
          className="ff-btn ff-btn-primary ff-btn-block mt-3 disabled:opacity-40"
        >
          {UPLOAD_RIGHTS.confirm}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="ff-btn ff-btn-secondary ff-btn-sm mt-2 w-full"
        >
          {UPLOAD_RIGHTS.cancel}
        </button>

        {/* The takedown door, published where the question is actually being
            asked. A rights holder who finds this screen should not have to go
            hunting through the terms for an address. */}
        <p className="ff-help mt-3 text-[11px]">
          {UPLOAD_RIGHTS.takedownLead}{" "}
          <a className="underline" href={`mailto:${ARTWORK_TAKEDOWN_EMAIL}`}>
            {ARTWORK_TAKEDOWN_EMAIL}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
