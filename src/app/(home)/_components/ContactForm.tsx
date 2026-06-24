"use client";

import { useState } from "react";

const INK = "#1e1b17";

// Custom-order inquiry form for the "Custom orders for your crew" panel.
// Posts to /api/contact, which emails the team via Resend. Lives on the blue
// panel, so it's a cream sticker card with thick ink borders to match the
// rest of the (home) sticker theme.
type Status = "idle" | "submitting" | "success" | "error";

const fieldClass =
  "w-full rounded-[10px] border-[3px] border-[#1e1b17] bg-[#fff9ec] px-3 py-2.5 text-sm font-semibold text-[#1e1b17] placeholder:text-[#9a917c] focus:outline-none focus:ring-2 focus:ring-[#f8c53b]";
const labelClass = "mb-1.5 block text-[13px] font-extrabold tracking-[0.5px] text-[#1e1b17]";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (res.ok && data.ok) {
        setStatus("success");
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="relative z-[1]">
      <div
        className="rounded-[18px] border-[3px] border-[#1e1b17] bg-[#fff9ec] p-5 sm:p-6"
        style={{ boxShadow: `6px 6px 0 ${INK}` }}
      >
        {status === "success" ? (
          <div className="py-6 text-center">
            <div className="mb-2 text-[15px] font-extrabold tracking-[1.5px] text-[#ed5aa0]">
              GOT IT
            </div>
            <p
              role="status"
              className="m-0 text-xl font-bold leading-snug text-[#1e1b17]"
            >
              Thanks — we&apos;ll be in touch within a day.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3.5">
              <label htmlFor="contact-name" className={labelClass}>
                Name
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                placeholder="Your name"
                className={fieldClass}
              />
            </div>
            <div className="mb-3.5">
              <label htmlFor="contact-email" className={labelClass}>
                Email
              </label>
              <input
                id="contact-email"
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
                className={fieldClass}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="contact-message" className={labelClass}>
                What you&apos;re celebrating
              </label>
              <textarea
                id="contact-message"
                name="message"
                required
                rows={4}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                placeholder="Quantity, event, date — tell us what you have in mind."
                className={`${fieldClass} resize-y`}
              />
            </div>
            <button
              type="submit"
              disabled={status === "submitting"}
              className="s-display s-press w-full cursor-pointer rounded-full border-[3px] border-[#1e1b17] bg-[#f8c53b] px-[30px] py-[13px] text-lg font-semibold text-[#1e1b17] disabled:cursor-default disabled:opacity-70"
              style={{
                boxShadow: `5px 5px 0 ${INK}`,
                ["--press-shadow-lift" as string]: `7px 7px 0 ${INK}`,
                ["--press-shadow-press" as string]: `2px 2px 0 ${INK}`,
              }}
            >
              {status === "submitting" ? "Sending…" : "Send inquiry"}
            </button>
            {status === "error" && (
              <p role="alert" className="mt-3 text-[13px] font-bold text-[#c8102e]">
                Something went wrong. Email us directly at{" "}
                <a
                  href="mailto:hello@festiveframes.co?subject=Custom%20order%20%E2%80%94%20Festive%20Frames"
                  className="underline"
                >
                  hello@festiveframes.co
                </a>
                .
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
