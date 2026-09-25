"use client";

import { useState } from "react";

// ─── The saved design, as the parent sees it ─────────────────────────────────
//
// Two banners around lib/school-designs:
//   SavedDesignBanner — after a Send: the design's code and the link that reopens
//     it anywhere, with Copy and (on a phone) Share. The link is the product here:
//     a parent who can't find it again can't come back to their frame.
//   OpenSavedDesignPrompt — a link opened on a device that already holds a
//     DIFFERENT design. Opening replaces it, so we ask; with nothing saved here
//     the builder opens the link without asking.
//
// Same banner classes as the builder's other status lines (ff-banner-*), same
// phone-sized targets.

export interface SavedDesignInfo {
  code: string;
  revision: number;
  url: string | null;
  /** The email address the link went to, or null when it wasn't emailed. */
  emailedTo: string | null;
  /** The team email's outcome: sent, or the send path isn't switched on. */
  teamSent: boolean;
}

export function SavedDesignBanner({ info, onDismiss }: { info: SavedDesignInfo; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    if (!info.url) return;
    try {
      await navigator.clipboard.writeText(info.url);
      setCopied(true);
    } catch {
      // Clipboard blocked: the link is on screen to select by hand.
    }
  };
  const share = async () => {
    if (!info.url) return;
    try {
      await navigator.share({ title: "My frame design", text: `My frame design (${info.code})`, url: info.url });
    } catch {
      // Cancelled or unavailable — nothing to do.
    }
  };

  const lead = info.teamSent
    ? "Your design is on its way to our team, and it's saved."
    : "Your design is saved. Sending to our team isn't switched on yet, so no one has it yet.";
  const revisionNote = info.revision > 1 ? ` (version ${info.revision})` : "";

  return (
    <div role="status" className={`ff-banner ${info.teamSent ? "ff-banner-ok" : "ff-banner-warn"} flex flex-col gap-2 px-4 py-2.5`}>
      <p className="text-[13px] leading-snug">
        {lead} Design code <strong className="whitespace-nowrap">{info.code}</strong>
        {revisionNote}.
        {info.emailedTo ? <> We emailed the link to {info.emailedTo}.</> : null}
      </p>
      {info.url ? (
        <>
          <p className="break-all text-[12px] leading-snug opacity-80">{info.url}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void copy()} className="ff-btn ff-btn-primary ff-btn-sm max-lg:min-h-11">
              {copied ? "Link copied" : "Copy link"}
            </button>
            {canShare && (
              <button type="button" onClick={() => void share()} className="ff-btn ff-btn-secondary ff-btn-sm max-lg:min-h-11">
                Share
              </button>
            )}
            <button type="button" onClick={onDismiss} className="ff-chip ml-auto max-lg:min-h-11">
              Dismiss
            </button>
          </div>
          <p className="text-[12px] leading-snug opacity-80">
            Anyone with this link can open and change the design.
          </p>
        </>
      ) : (
        <div className="flex justify-end">
          <button type="button" onClick={onDismiss} className="ff-chip max-lg:min-h-11">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export function OpenSavedDesignPrompt({
  code,
  onOpen,
  onKeep,
}: {
  code: string;
  onOpen: () => void;
  onKeep: () => void;
}) {
  return (
    <div role="status" className="ff-banner ff-banner-info flex flex-wrap items-center justify-between gap-3 px-4 py-2">
      <p className="text-[13px] leading-snug">
        Open saved design <strong className="whitespace-nowrap">{code}</strong>? It replaces the design on this device.
      </p>
      <div className="flex shrink-0 items-center gap-3">
        <button type="button" onClick={onKeep} className="ff-btn ff-btn-secondary ff-btn-sm max-lg:min-h-11">
          Keep mine
        </button>
        <button type="button" onClick={onOpen} className="ff-btn ff-btn-primary ff-btn-sm max-lg:min-h-11">
          Open it
        </button>
      </div>
    </div>
  );
}
