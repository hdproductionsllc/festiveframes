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
      <p className="rounded-[18px] border-[3px] border-[#1e1b17] bg-[#fff9ec] px-6 py-5 text-base font-bold text-[#1e1b17] shadow-[5px_5px_0_#1e1b17]">
        Thank you — we read every review and feature the real ones on the site.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[24px] border-[4px] border-[#1e1b17] bg-[#fff9ec] px-6 py-6 shadow-[8px_8px_0_#1e1b17]">
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
              n <= (hover || rating) ? "text-[#f8c53b]" : "text-[#1e1b17]/20"
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
        className="mt-4 w-full rounded-[12px] border-[3px] border-[#1e1b17] bg-[#faf0d6] px-3 py-2 text-sm font-semibold text-[#1e1b17] placeholder:font-medium placeholder:text-[#6a6354] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e1b17]"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 80))}
        placeholder="Your name and town (e.g. Dana R., St. Louis)"
        className="mt-3 w-full rounded-[12px] border-[3px] border-[#1e1b17] bg-[#faf0d6] px-3 py-2 text-sm font-semibold text-[#1e1b17] placeholder:font-medium placeholder:text-[#6a6354] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e1b17]"
      />

      <button
        type="submit"
        disabled={status === "sending"}
        className="s-press mt-4 inline-flex items-center justify-center rounded-full border-[3px] border-[#1e1b17] bg-[#f8c53b] px-5 py-2.5 text-sm font-extrabold text-[#1e1b17] shadow-[5px_5px_0_#1e1b17] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e1b17] disabled:opacity-70"
        style={{
          ["--press-shadow-lift" as string]: "7px 7px 0 #1e1b17",
          ["--press-shadow-press" as string]: "2px 2px 0 #1e1b17",
        }}
      >
        {status === "sending" ? "Sending..." : "Submit review"}
      </button>
      {status === "error" && (
        <p role="alert" className="mt-2 text-sm font-bold text-[#ed5aa0]">
          Add a rating, a few words, and your name, then try again.
        </p>
      )}
    </form>
  );
}
