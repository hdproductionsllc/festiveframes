"use client";

import { useState } from "react";

// Small client island: email capture form. Posts to the stubbed
// /api/subscribe endpoint and only shows the success state after the endpoint
// accepts. Kept tiny so the homepage stays near-zero client JS.
type Status = "idle" | "submitting" | "success" | "error";

export function EmailCaptureForm() {
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
      <p
        role="status"
        className="rounded-md border border-brand-gold/60 bg-brand-navy-soft/40 px-4 py-3 text-base font-medium text-brand-cream"
      >
        You are on the list. Watch your inbox for the next kit drop.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      <div className="flex w-full flex-col gap-3 sm:flex-row">
      <label htmlFor="email-capture" className="sr-only">
        Email address
      </label>
      <input
        id="email-capture"
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
        placeholder="you@example.com"
        aria-invalid={status === "error"}
        aria-describedby={status === "error" ? "email-capture-error" : undefined}
        className="w-full rounded-md border border-brand-navy-soft/60 bg-brand-cream-soft px-4 py-3 text-base text-brand-ink placeholder:text-brand-ink/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex shrink-0 items-center justify-center rounded-md bg-brand-red px-6 py-3 text-base font-semibold uppercase tracking-wide text-brand-white transition-colors hover:bg-brand-red/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold disabled:opacity-70"
      >
        {status === "submitting" ? "Joining..." : "Join the list"}
      </button>
      </div>
      {status === "error" && (
        <p
          id="email-capture-error"
          role="alert"
          className="mt-2 text-sm font-medium text-brand-gold"
        >
          Something went wrong. Please check your email and try again.
        </p>
      )}
    </form>
  );
}
