"use client";

import { useState } from "react";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "sending" | "sent" | "error"; msg?: string; devLink?: string }>({
    kind: "idle",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.kind === "sending") return;
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string; devLink?: string };
      if (res.ok && data.ok) setState({ kind: "sent", msg: data.message, devLink: data.devLink });
      else setState({ kind: "error", msg: data.error || "Couldn't send a link right now." });
    } catch {
      setState({ kind: "error", msg: "Couldn't send a link right now." });
    }
  };

  if (state.kind === "sent") {
    return (
      <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-[14px] text-emerald-900">
        <p>{state.msg} Check your inbox — the link works once and expires in 15 minutes.</p>
        {state.devLink && (
          <a href={state.devLink} className="mt-2 block break-all text-[12px] underline">
            {state.devLink}
          </a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-[13px] font-semibold text-stone-800">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-lg border border-stone-300 px-3 text-[16px] font-normal"
        />
      </label>
      {state.kind === "error" && (
        <p role="alert" className="text-[13px] font-semibold text-red-700">
          {state.msg}
        </p>
      )}
      <button
        type="submit"
        disabled={state.kind === "sending"}
        className="h-11 rounded-lg bg-[#1b2a4a] text-[15px] font-semibold text-white disabled:opacity-60"
      >
        {state.kind === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
