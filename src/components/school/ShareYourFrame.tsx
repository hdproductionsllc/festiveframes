"use client";

import { useState } from "react";

import "./share-your-frame.css";

// ─── The share loop ──────────────────────────────────────────────────────────
//
// A school fundraiser's distribution is the parent group chat, and until now
// nothing in the product made the SECOND parent want one after seeing the first.
// Every order ended at a receipt.
//
// The moment to ask is here, on the confirmation page: the parent has just spent
// money on something they are pleased with, which is the highest-intent second
// anyone has for telling other people about it.
//
// The message names the SCHOOL and the donation, not us. A parent forwarding
// "look what I bought" is an advert; a parent forwarding "this sends money to
// our booster club" is a recommendation, and it is also the true thing.

export function ShareYourFrame({
  schoolShortName,
  schoolUrl,
}: {
  schoolShortName: string;
  schoolUrl: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "shared">("idle");

  // NO FIGURE. Checkout is parked until one end-to-end test payment has run, and
  // this message is forwarded into a group chat where a number would be repeated
  // by people we cannot correct. NO NAME either: the owner's rule (2026-09-23) is
  // that the frame leads with the year and what they do, not the kid's name.
  const message =
    `I just made a ${schoolShortName} license plate frame — their activities, their year. ` +
    `Every one sends a donation back to the school. If you'd like to make one too, here's the link:`;

  async function share() {
    // Web Share on a phone puts the school's link straight into the group chat
    // the parent is already in, which is the entire point. Desktop falls back to
    // the clipboard rather than showing nothing.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `${schoolShortName} frames`, text: message, url: schoolUrl });
        setState("shared");
        return;
      } catch {
        // A cancelled share is not a failure; fall through to copy so the button
        // still does something rather than appearing broken.
      }
    }
    try {
      await navigator.clipboard.writeText(`${message} ${schoolUrl}`);
      setState("copied");
    } catch {
      setState("idle");
    }
  }

  return (
    <div className="msf-share">
      <h2 className="msf-share-title">Would other {schoolShortName} parents like one?</h2>
      <p className="msf-share-body">
        Every frame sends a donation to the school, and if you&apos;d like to
        help that add up, the group chat you&apos;re already in is the easiest
        place to share it.
      </p>
      <button type="button" className="msf-share-btn" onClick={share}>
        {state === "copied"
          ? "Copied — paste it in the chat"
          : state === "shared"
            ? "Thanks for sharing"
            : "Share with your team's parents"}
      </button>
      <p className="msf-share-link">{schoolUrl}</p>
    </div>
  );
}
