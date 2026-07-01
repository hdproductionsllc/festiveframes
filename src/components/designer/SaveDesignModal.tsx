"use client";

import { useState } from "react";
import { useDesignStore } from "@/stores/design-store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * "Save my design" — captures a name + email, serializes the FULL design (the same
 * fields the store persists), POSTs it to /api/save-design, and shows the emailed
 * "continue your design" link. Doubles as email capture. Fixed-overlay dialog;
 * click the backdrop or Cancel to close.
 */
export function SaveDesignModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const designName = useDesignStore((s) => s.designName);
  const [name, setName] = useState(designName && designName !== "My Frame Design" ? designName : "");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const submit = async () => {
    if (!EMAIL_RE.test(email.trim())) {
      setMessage("Please enter a valid email address.");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setMessage(null);
    const s = useDesignStore.getState();
    const design = {
      designName: s.designName,
      plateState: s.plateState,
      slots: s.slots,
      textBars: s.textBars,
      bottomBar: s.bottomBar,
      qrCode: s.qrCode,
      frameConfig: s.frameConfig,
      dieCut: s.dieCut,
    };
    try {
      const res = await fetch("/api/save-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || null, design }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string; emailed?: boolean };
      if (!res.ok) {
        setMessage(data.error || "Could not save right now. Please try again.");
        setStatus("error");
        return;
      }
      setLink(data.url ?? null);
      setMessage(
        data.emailed
          ? "Saved! We emailed you a link to pick up where you left off."
          : "Saved! Bookmark the link below to continue anytime.",
      );
      setStatus("done");
      onSaved?.();
    } catch {
      setMessage("Network error. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Save your design"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border-[3px] border-[#1e1b17] bg-[#faf0d6] p-6 shadow-[6px_6px_0_#1e1b17]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-extrabold text-[#1e1b17]">Save your design</h2>
        <p className="mt-1 text-sm leading-relaxed text-[#1e1b17]/70">
          We&rsquo;ll email you a link so you can pick up right where you left off &mdash;
          no account needed.
        </p>

        {status === "done" ? (
          <div className="mt-5 space-y-3">
            <p className="rounded-lg bg-[#3fb0e6]/15 px-3 py-2.5 text-sm font-semibold text-[#1e1b17]">
              {message}
            </p>
            {link && (
              <a
                href={link}
                className="block break-all rounded-lg border-2 border-[#1e1b17]/15 bg-white px-3 py-2 text-xs font-semibold text-[#3fb0e6] hover:underline"
              >
                {link}
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border-[3px] border-[#1e1b17] bg-[#f8c53b] px-4 py-2.5 text-sm font-extrabold uppercase tracking-wide text-[#1e1b17] shadow-[3px_3px_0_#1e1b17] active:translate-y-0.5 active:shadow-[1px_1px_0_#1e1b17]"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">Name (optional)</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1 w-full rounded-lg border-2 border-[#1e1b17]/15 bg-white px-3 py-2.5 text-base font-semibold text-[#1e1b17] placeholder:text-[#1e1b17]/35 focus:border-[#ed5aa0] focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-[#1e1b17]/70">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder="you@email.com"
                autoFocus
                className="mt-1 w-full rounded-lg border-2 border-[#1e1b17]/15 bg-white px-3 py-2.5 text-base font-semibold text-[#1e1b17] placeholder:text-[#1e1b17]/35 focus:border-[#ed5aa0] focus:outline-none"
              />
            </label>
            {message && status === "error" && (
              <p className="text-sm font-semibold text-[#b3261e]">{message}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border-2 border-[#1e1b17]/15 bg-white px-4 py-2.5 text-sm font-bold text-[#1e1b17] hover:bg-white/70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={status === "saving"}
                className="flex-1 rounded-xl border-[3px] border-[#1e1b17] bg-[#ed5aa0] px-4 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-[3px_3px_0_#1e1b17] transition-all hover:brightness-105 active:translate-y-0.5 active:shadow-[1px_1px_0_#1e1b17] disabled:opacity-60"
              >
                {status === "saving" ? "Saving…" : "Save & email me"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
