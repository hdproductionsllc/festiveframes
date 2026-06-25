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
        className="rounded-[14px] border-[3px] border-[#1e1b17] bg-[#fff9ec] px-4 py-3 text-base font-bold text-[#1e1b17] shadow-[4px_4px_0_#1e1b17]"
      >
        You are on the list. Watch your inbox for new tile drops and seasonal
        sets.
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
        className="w-full rounded-[14px] border-[3px] border-[#1e1b17] bg-[#fff9ec] px-4 py-3 text-base font-semibold text-[#1e1b17] placeholder:font-medium placeholder:text-[#6a6354] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e1b17]"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="s-press inline-flex shrink-0 items-center justify-center rounded-[14px] border-[3px] border-[#1e1b17] bg-[#f8c53b] px-6 py-3 text-base font-extrabold text-[#1e1b17] shadow-[5px_5px_0_#1e1b17] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e1b17] disabled:opacity-70"
        style={{
          ["--press-shadow-lift" as string]: "7px 7px 0 #1e1b17",
          ["--press-shadow-press" as string]: "2px 2px 0 #1e1b17",
        }}
      >
        {status === "submitting" ? "Joining..." : "Join the list"}
      </button>
      </div>
      {status === "error" && (
        <p
          id="email-capture-error"
          role="alert"
          className="mt-2 inline-block rounded-full bg-[#1e1b17] px-3 py-1 text-sm font-bold text-[#fff9ec]"
        >
          Something went wrong. Please check your email and try again.
        </p>
      )}
    </form>
  );
}
