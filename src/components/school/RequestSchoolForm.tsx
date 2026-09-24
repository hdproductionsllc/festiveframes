"use client";

import { useState } from "react";

// ─── "We don't have your school" ─────────────────────────────────────────────
//
// Shown inline UNDER the finder when a real search comes back empty. That is the
// whole design: it is not a page, not a modal and not a link somewhere else,
// because the moment worth catching is the second after a parent types their
// school's name and sees nothing.
//
// Four fields, one of them optional, and copy that promises only what we can do.
// "We'll add it" is not ours to promise — the pilot decides which schools come
// next — and "we'll email you when it's ready" was a promise no system keeps:
// nothing here mails the requester (see api/school/request). What is true is
// that the address is kept with the request so a person can choose to write back
// if the school is added, and it is used for nothing else. That is what it says.
//
// The prefill FOLLOWS its prop until the parent edits the School field. The
// finder above it re-renders this on every keystroke; the form used to be keyed
// on the query to pick up the new name, which remounted it and wiped a
// half-filled city, state and email (and a "sent" confirmation) each time.
//
// Styling rides `find-my-school.css` so it inherits the finder's tone and works
// on the pages that never load the landing stylesheet.

export function RequestSchoolForm({
  /** Prefilled from what they searched for. It is nearly always the school name. */
  schoolName: suggestedName = "",
  /** Prefilled when the page already knows where the school is (the not-ready
   *  page for a school we have a record of). */
  city: initialCity = "",
  state: initialState = "",
  /** "dark" on a navy ground, matching the finder it sits inside. */
  tone = "light",
}: {
  schoolName?: string;
  city?: string;
  state?: string;
  tone?: "light" | "dark";
}) {
  // null until the parent types in the School field; until then it mirrors the
  // prop, so the finder's query keeps flowing in without a remount.
  const [editedName, setEditedName] = useState<string | null>(null);
  const schoolName = editedName ?? suggestedName;
  const [city, setCity] = useState(initialCity);
  const [state, setState] = useState(initialState.toUpperCase().slice(0, 2));
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const ready = schoolName.trim().length >= 2 && city.trim().length >= 2 && /^[A-Za-z]{2}$/.test(state.trim());

  if (status === "sent") {
    return (
      <div className="msf-request" data-tone={tone}>
        <p className="msf-request-done">
          <strong>Got it — {schoolName.trim()} is on the list.</strong> We&apos;re
          adding schools a few at a time, and requests decide which come next.
          {email.trim() ? " Your email stays with your request so we can write back, and is used for nothing else." : ""}
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
      <p className="msf-request-lede">Let us know which school you&apos;d like. Requests help us decide which schools come next.
        An email is optional: it stays with your request so we can write back, and is used for nothing else.</p>
      <label className="msf-request-field">
        <span>School</span>
        <input
          value={schoolName}
          onChange={(e) => setEditedName(e.target.value)}
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
        We&apos;ll only use it to write to you about this school, and we won&apos;t add you to any list or newsletter.
      </p>
      <button className="msf-find-cta" type="submit" disabled={!ready || status === "sending"}>
        {status === "sending" ? "Sending…" : "Request my school"}
      </button>
      {status === "failed" ? (
        <p className="msf-request-fine" role="alert">
          Sorry, that didn&apos;t go through. Could you try once more in a moment?
        </p>
      ) : null}
    </form>
  );
}
