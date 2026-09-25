"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { PROOF_APPROVAL_STATEMENT } from "@/content/proof-approval";

// ─── The proof, before anything is paid for ──────────────────────────────────
//
// "Nothing prints until you've seen it and said yes" is a promise the site makes;
// this sheet is where the "yes" is given, and the approve route is where it is
// recorded (on the exact, immutable revision shown here). Production refuses an
// order without it (lib/order/fulfill-school).
//
// It shows the PRINT render — the file Bill prints — not the on-screen builder:
// the two are drawn by different renderers, and an approval has to be of what
// prints. Under it, every line of lettering as plain text, because a misspelt
// name is the most expensive mistake on a printed part and it hides best inside
// lettering on a frame.
//
// Same bottom-sheet / centred-card shape as SendDesignSheet.

export function ProofSheet({
  proof,
  code,
  revision,
  lettering,
  busy,
  error,
  onApprove,
  onClose,
}: {
  /** The overview print render of the saved revision. */
  proof: string;
  code: string;
  revision: number;
  /** Every line of text on the frame, as it will print. */
  lettering: string[];
  busy: boolean;
  error: string | null;
  onApprove: () => void;
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, busy]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="ff-school-portal ff-scrim fixed inset-0 z-[115] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => !busy && onClose()}
    >
      <div
        className="ff-modal flex max-h-[92dvh] w-full max-w-[480px] flex-col overflow-y-auto overscroll-contain rounded-b-none p-4 sm:rounded-b-[inherit]"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <h2 id={titleId} className="ff-h2">Check your proof</h2>
            <p className="ff-help">
              This is the file we print. Design <strong className="whitespace-nowrap">{code}</strong>
              {revision > 1 ? `, version ${revision}` : ""}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="ff-btn ff-btn-secondary ff-btn-icon shrink-0 max-lg:min-h-11 max-lg:min-w-11"
          >
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
            </svg>
          </button>
        </div>

        <div className="mb-2 rounded-[10px] bg-[var(--ff-sunk,#eceae6)] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={proof} alt="Your frame's print proof" className="h-auto w-full rounded-[4px]" />
        </div>
        <p className="ff-micro mb-3 text-center">The solid middle is where your own license plate will show.</p>

        {lettering.length > 0 && (
          <div className="mb-3">
            <p className="mb-1 text-[13px] font-semibold text-[var(--ff-ink)]">Check every letter</p>
            <ul className="flex flex-col gap-1">
              {lettering.map((line, i) => (
                <li
                  key={`${i}-${line}`}
                  className="rounded-lg border border-[var(--ff-line-strong)] bg-white px-3 py-2 text-[16px] font-semibold tracking-wide text-[var(--ff-ink)]"
                >
                  {line}
                </li>
              ))}
            </ul>
            <p className="ff-micro mt-1">Names and words print exactly as they&apos;re typed here.</p>
          </div>
        )}

        <p className="text-[13px] leading-snug text-[var(--ff-ink)]">{PROOF_APPROVAL_STATEMENT}</p>

        {error && (
          <p role="alert" className="mt-3 text-[13px] font-semibold text-[var(--ff-danger)]">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="ff-btn ff-btn-secondary min-h-11 flex-1">
            Keep editing
          </button>
          <button type="button" onClick={onApprove} disabled={busy} className="ff-btn ff-btn-primary min-h-11 flex-[2]">
            {busy ? "One moment…" : "Approve and pay"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
