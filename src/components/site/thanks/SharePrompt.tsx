"use client";

import { useState } from "react";

// Small client island for the /thanks page. Uses the Web Share API when
// available (mobile), and falls back to copy-to-clipboard everywhere else.
// No analytics, no external deps.

interface SharePromptProps {
  url: string;
  shareText: string;
}

type CopyState = "idle" | "copied" | "error";

export function SharePrompt({ url, shareText }: SharePromptProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  async function handleShare() {
    // Native share sheet (mobile / supported browsers).
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Festive Frames", text: shareText, url });
        return;
      } catch {
        // User cancelled or share failed; fall through to copy.
      }
    }

    // Copy-link fallback.
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("error");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleShare}
        className="s-press inline-flex items-center justify-center rounded-full border-[3px] border-[#1e1b17] bg-[#ed5aa0] px-6 py-3 text-base font-extrabold text-[#fff9ec] shadow-[5px_5px_0_#1e1b17] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e1b17]"
        style={{
          ["--press-shadow-lift" as string]: "7px 7px 0 #1e1b17",
          ["--press-shadow-press" as string]: "2px 2px 0 #1e1b17",
        }}
      >
        Share Festive Frames
      </button>
      <p role="status" aria-live="polite" className="min-h-5 text-sm font-bold text-[#3a352c]">
        {copyState === "copied" && "Link copied to your clipboard."}
        {copyState === "error" && "Could not copy. Long-press the address bar to share."}
      </p>
    </div>
  );
}
