"use client";

import { useState } from "react";

// Sticker-styled email capture for the footer. Posts to the same stubbed
// /api/subscribe endpoint the classic site uses; only flips to the success
// state once the endpoint accepts.
type Status = "idle" | "submitting" | "success" | "error";

export function EmailForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = (await res.json()) as { ok?: boolean };
      if (data.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p role="status" className="rounded-[10px] border-[3px] border-[#faf0d6] bg-[#2a2620] px-3.5 py-3 text-sm font-semibold text-[#faf0d6]">
        You&apos;re on the list — watch your inbox for new tile drops.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex gap-2">
        <label htmlFor="sticker-email" className="sr-only">
          Email address
        </label>
        <input
          id="sticker-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="you@email.com"
          aria-invalid={status === "error"}
          className="min-w-0 flex-1 rounded-[10px] border-[3px] border-[#faf0d6] bg-[#2a2620] px-3 py-2.5 text-sm font-semibold text-[#faf0d6] placeholder:text-[#8f8975]"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="s-display cursor-pointer rounded-[10px] border-[3px] border-[#faf0d6] bg-[#ed5aa0] px-4 py-2.5 text-sm font-semibold text-[#fff9ec] disabled:opacity-70"
        >
          {status === "submitting" ? "…" : "Join"}
        </button>
      </div>
      {status === "error" && (
        <p role="alert" className="mt-2 text-[13px] font-bold text-[#f8c53b]">
          Something went wrong — check your email and try again.
        </p>
      )}
    </form>
  );
}
