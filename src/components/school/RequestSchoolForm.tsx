"use client";

import { useState } from "react";

// ─── "We don't have your school" ─────────────────────────────────────────────
//
// Shown inline UNDER the finder when a real search comes back empty. That is the
// whole design: it is not a page, not a modal and not a link somewhere else,
// because the moment worth catching is the second after a parent types their
// school's name and sees nothing.
//
// Four fields, two of them optional, and a success line that promises only what
// we can do. "We'll add it" is true. "We'll email you when it's ready" is not —
// nothing here mails the requester (see api/school/request), so nothing here says
// it will.
//
// Styling rides `find-my-school.css` so it inherits the finder's tone and works
// on the pages that never load the landing stylesheet.

export function RequestSchoolForm({
  /** Prefilled from what they searched for. It is nearly always the school name. */
  schoolName: initialName = "",
  /** "dark" on a navy ground, matching the finder it sits inside. */
  tone = "light",
}: {
  schoolName?: string;
  tone?: "light" | "dark";
}) {
  const [schoolName, setSchoolName] = useState(initialName);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const ready = schoolName.trim().length >= 2 && city.trim().length >= 2 && /^[A-Za-z]{2}$/.test(state.trim());

  if (status === "sent") {
    return (
      <div className="msf-request" data-tone={tone}>
        <p className="msf-request-done">
          <strong>Got it — {schoolName.trim()} is on the list.</strong> We add schools
          by hand, so this one gets built when it comes up. In the meantime the
          builder works for any school: start from a blank frame and put your
          student&apos;s name on it.
        </p>
      </div>
    );
  }

  return (
    <form
      className="msf-request"
      data-tone={tone}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ready || status === "sending") return;
        setStatus("sending");
        try {
          const res = await fetch("/api/school/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              schoolName: schoolName.trim(),
              city: city.trim(),
              state: state.trim().toUpperCase(),
              email: email.trim() || undefined,
            }),
          });
          const data = (await res.json()) as { ok?: boolean };
          setStatus(data.ok ? "sent" : "failed");
        } catch {
          setStatus("failed");
        }
      }}
    >
      <p className="msf-request-lede">Tell us which school and we&apos;ll add it.</p>
      <label className="msf-request-field">
        <span>School</span>
        <input
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          maxLength={120}
          required
          autoComplete="off"
        />
      </label>
      <div className="msf-request-row">
        <label className="msf-request-field">
          <span>City</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={80}
            required
            autoComplete="address-level2"
          />
        </label>
        <label className="msf-request-field msf-request-state">
          <span>State</span>
          <input
            value={state}
            // Two letters, upper-cased as they type: the route validates against
            // the real postal-code list and "Missouri" is a 400.
            onChange={(e) => setState(e.target.value.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase())}
            maxLength={2}
            required
            autoComplete="address-level1"
          />
        </label>
      </div>
      <label className="msf-request-field">
        <span>
          Email <em>(optional)</em>
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={160}
          autoComplete="email"
        />
      </label>
      {/* Said out loud, because a form that takes an address and says nothing is
          a form people assume will mail them. */}
      <p className="msf-request-fine">
        We only use it if we need to ask you something. No list, no newsletter.
      </p>
      <button className="msf-find-cta" type="submit" disabled={!ready || status === "sending"}>
        {status === "sending" ? "Sending…" : "Add my school"}
      </button>
      {status === "failed" ? (
        <p className="msf-request-fine" role="alert">
          That didn&apos;t go through. Try once more in a moment.
        </p>
      ) : null}
    </form>
  );
}
