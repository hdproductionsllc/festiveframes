"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MSF_PRIVACY_PATH, NOTHING_PRINTS_UNTIL_YES } from "@/content/msf-pages";
import { createPortal } from "react-dom";
import { BUYERS, type BuyerId } from "@/data/frame-buyers";
import {
  CONTACT_EMAIL_MAX,
  CONTACT_PHONE_MAX,
  CONTACT_PROBLEM_COPY,
  coerceOrderContact,
  type OrderContact,
} from "@/lib/order/order-contact";

// ─── The send sheet ──────────────────────────────────────────────────────────
//
// "Send design" used to be ONE tap from the header to a 6.5 MB POST: no confirm,
// and nothing about the sender, under a page promising "we'll follow up". A stray
// thumb in the header sent a half-made design nobody could answer. Every Send now
// opens this sheet: the frame exactly as it will be sent (the print render, not a
// screenshot), a REQUIRED email, an optional phone, who it's for, and a Send that
// is the only thing that actually sends.
//
// A bottom sheet on a phone (thumb reach, keyboard-friendly, safe-area padded), a
// centred card on a desktop. The contact rule is `coerceOrderContact` — the same
// function the route checks with, so the button cannot enable on something the
// server then refuses.

export function SendDesignSheet({
  preview,
  renderFailed,
  initialFor,
  sending,
  error,
  savedOnError = null,
  offerLinkEmail = false,
  onSend,
  onClose,
}: {
  /** The overview print render, or null while it is still rendering. */
  preview: string | null;
  renderFailed: boolean;
  /** The builder's current "who's it for", as the default answer here. */
  initialFor: BuyerId;
  sending: boolean;
  /** The last send's failure, shown in the sheet so the parent can retry. */
  error: string | null;
  /** The design WAS saved though delivery failed: its code and link, shown with
   *  the error so a failed send never hides them. Sending again reuses it. */
  savedOnError?: { code: string; url: string | null } | null;
  /** Offer "Email me a link to this design" — only while MySchoolFrame's own
   *  sender is configured (`designLinkEmailAvailable`, lib/email-msf). */
  offerLinkEmail?: boolean;
  onSend: (contact: OrderContact, opts: { emailLink: boolean }) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [forId, setForId] = useState<BuyerId>(initialFor);
  // Ticked by default: the parent is typing their address right here, and the
  // link is the one thing that lets them reopen this design somewhere else.
  const [emailLink, setEmailLink] = useState(true);
  const willEmailLink = offerLinkEmail && emailLink;
  // Errors show after the first Send attempt, not on the first keystroke.
  const [tried, setTried] = useState(false);
  const titleId = useId();
  const emailRef = useRef<HTMLInputElement>(null);

  const forWhom = BUYERS.find((b) => b.id === forId)?.chip;
  const verdict = coerceOrderContact({ email, phone, forWhom });
  const problem = verdict.ok ? null : verdict.problem;

  // Escape closes, and the page behind does not scroll under the sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sending) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, sending]);

  const submit = () => {
    setTried(true);
    if (!verdict.ok) {
      emailRef.current?.focus();
      return;
    }
    if (!preview || sending) return;
    onSend(verdict.contact, { emailLink: willEmailLink });
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="ff-school-portal ff-scrim fixed inset-0 z-[115] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => !sending && onClose()}
    >
      <form
        className="ff-modal flex max-h-[92dvh] w-full max-w-[480px] flex-col overflow-y-auto overscroll-contain rounded-b-none p-4 sm:rounded-b-[inherit]"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <h2 id={titleId} className="ff-h2">Send your design</h2>
            <p className="ff-help">We&apos;ll reply about ordering, and nothing is charged. {NOTHING_PRINTS_UNTIL_YES}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            aria-label="Close"
            className="ff-btn ff-btn-secondary ff-btn-icon shrink-0 max-lg:min-h-11 max-lg:min-w-11"
          >
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
            </svg>
          </button>
        </div>

        {/* THE FRAME AS IT WILL BE SENT — the print render itself. */}
        <div className="mb-3 flex min-h-[96px] items-center justify-center rounded-[10px] bg-[var(--ff-sunk,#eceae6)] p-2">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Your frame, as it will be sent" className="h-auto w-full rounded-[4px]" />
          ) : renderFailed ? (
            <p className="ff-help text-center text-[var(--ff-danger)]">Couldn&apos;t render your frame. Close this and try again.</p>
          ) : (
            <p className="ff-help text-center">Getting your frame ready…</p>
          )}
        </div>
        {/* This is the PRINT render, whose plate window is filled with the frame
            colour (the parent's own plate covers it). On a phone that read as a
            solid panel with no opening, so say what the middle is. */}
        {preview && (
          <p className="ff-micro -mt-2 mb-3 text-center">
            The solid middle is where your own license plate will show.
          </p>
        )}

        <label className="flex flex-col gap-1 text-[13px] font-semibold text-[var(--ff-ink)]">
          Your email
          <input
            ref={emailRef}
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={CONTACT_EMAIL_MAX}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={tried && problem?.startsWith("email") ? true : undefined}
            placeholder="you@example.com"
            className="h-11 rounded-lg border border-[var(--ff-line-strong)] bg-white px-3 text-[16px] font-normal text-[var(--ff-ink)]"
          />
        </label>
        <label className="mt-2 flex flex-col gap-1 text-[13px] font-semibold text-[var(--ff-ink)]">
          <span>
            Phone <span className="font-normal text-[var(--ff-ink-3)]">(optional)</span>
          </span>
          <input
            type="tel"
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            maxLength={CONTACT_PHONE_MAX}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={tried && problem === "phone-invalid" ? true : undefined}
            className="h-11 rounded-lg border border-[var(--ff-line-strong)] bg-white px-3 text-[16px] font-normal text-[var(--ff-ink)]"
          />
        </label>

        <fieldset className="mt-3">
          <legend className="mb-1 text-[13px] font-semibold text-[var(--ff-ink)]">Who&apos;s it for?</legend>
          <div role="radiogroup" className="flex flex-wrap gap-1.5">
            {BUYERS.map((b) => (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={b.id === forId}
                onClick={() => setForId(b.id)}
                className={
                  "min-h-11 rounded-full border px-3 text-[13px] font-semibold transition-colors " +
                  (b.id === forId
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-300 bg-white text-stone-700")
                }
              >
                {b.chip}
              </button>
            ))}
          </div>
        </fieldset>

        {offerLinkEmail && (
          <label className="mt-3 flex min-h-11 items-center gap-2.5 text-[13px] font-semibold text-[var(--ff-ink)]">
            <input
              type="checkbox"
              checked={emailLink}
              onChange={(e) => setEmailLink(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-stone-900"
            />
            Email me a link to this design
          </label>
        )}

        {tried && problem && (
          <p role="alert" className="mt-3 text-[13px] font-semibold text-[var(--ff-danger)]">
            {CONTACT_PROBLEM_COPY[problem]}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-[13px] font-semibold text-[var(--ff-danger)]">
            {error}
          </p>
        )}
        {error && savedOnError && <SavedButUndelivered saved={savedOnError} />}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="ff-btn ff-btn-secondary min-h-11 flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sending || !preview}
            className="ff-btn ff-btn-primary min-h-11 flex-[2]"
          >
            {sending ? "Sending…" : savedOnError ? "Try again" : "Send design"}
          </button>
        </div>
        <p className="ff-micro mt-2">
          Your email and phone go to our team with the design so a person can reply.
          {willEmailLink
            ? " The only email we'll send you automatically is your link."
            : " We won't email or text you automatically."}{" "}
          <a href={MSF_PRIVACY_PATH} target="_blank" rel="noopener" className="underline">
            Privacy
          </a>
        </p>
      </form>
    </div>,
    document.body,
  );
}

/**
 * "Saved, not delivered": the reassurance a failed send owes the parent. Their
 * design is on our server (with a code) even though our team's email did not go —
 * so they get the code and the link now, and "Try again" resends the SAME
 * revision (the server reuses unchanged content).
 */
function SavedButUndelivered({ saved }: { saved: { code: string; url: string | null } }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 rounded-lg border border-[var(--ff-line-strong)] bg-white p-3 text-[13px] leading-snug text-[var(--ff-ink)]">
      <p>
        Your design is saved as <strong className="whitespace-nowrap">{saved.code}</strong>, so nothing is lost.
        {saved.url ? " Keep this link to open it again:" : ""}
      </p>
      {saved.url && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1 break-all text-[12px] opacity-80">{saved.url}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(saved.url!).then(() => setCopied(true), () => {});
            }}
            className="ff-btn ff-btn-secondary ff-btn-sm max-lg:min-h-11"
          >
            {copied ? "Link copied" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
