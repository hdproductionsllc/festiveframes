"use client";

import { useState } from "react";

// Post-purchase review prompt. Submits to /api/review (emails the team to vet,
// then publish genuine ones). Honest by design — nothing is auto-published.
export function LeaveReview() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating || body.trim().length < 4 || !name.trim()) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating, body: body.trim(), name: name.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="rounded-lg border border-brand-gold/50 bg-brand-navy-soft/30 px-6 py-5 text-base font-medium text-brand-navy">
        Thank you — we read every review and feature the real ones on the site.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-brand-navy-soft/40 bg-brand-cream-soft px-6 py-6">
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            aria-pressed={rating === n}
            className={`text-3xl leading-none transition-colors ${
              n <= (hover || rating) ? "text-brand-gold" : "text-brand-navy-soft/30"
            }`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 1000))}
        placeholder="What did you do with it, and how did it go?"
        rows={3}
        className="mt-4 w-full rounded-md border border-brand-navy/20 bg-white px-3 py-2 text-sm text-brand-ink placeholder:text-brand-ink/50 focus:border-brand-navy/50 focus:outline-none"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 80))}
        placeholder="Your name and town (e.g. Dana R., St. Louis)"
        className="mt-3 w-full rounded-md border border-brand-navy/20 bg-white px-3 py-2 text-sm text-brand-ink placeholder:text-brand-ink/50 focus:border-brand-navy/50 focus:outline-none"
      />

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-4 inline-flex items-center justify-center rounded-md bg-brand-red px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-brand-white transition-colors hover:bg-brand-red/90 disabled:opacity-70"
      >
        {status === "sending" ? "Sending..." : "Submit review"}
      </button>
      {status === "error" && (
        <p role="alert" className="mt-2 text-sm font-medium text-brand-red">
          Add a rating, a few words, and your name, then try again.
        </p>
      )}
    </form>
  );
}
