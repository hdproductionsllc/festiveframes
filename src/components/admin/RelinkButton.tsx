"use client";

import { useState } from "react";

/** Issue a parent a fresh design link (their old one stops working). */
export function RelinkButton({ designId }: { designId: string }) {
  const [state, setState] = useState<{ kind: "idle" | "confirm" | "busy" | "done" | "error"; url?: string; msg?: string }>({
    kind: "idle",
  });

  const issue = async () => {
    setState({ kind: "busy" });
    try {
      const res = await fetch(`/api/admin/designs/${designId}/relink`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) setState({ kind: "done", url: data.url });
      else setState({ kind: "error", msg: data.error || "Couldn't issue a link." });
    } catch {
      setState({ kind: "error", msg: "Couldn't issue a link." });
    }
  };

  if (state.kind === "done") {
    return (
      <div className="rounded-lg bg-emerald-50 p-3 text-[13px] text-emerald-900">
        <p className="mb-1 font-semibold">New link — send it to the parent:</p>
        <p className="break-all font-mono text-[12px]">{state.url}</p>
        <button
          type="button"
          className="mt-2 rounded-md border border-emerald-700 px-2.5 py-1 text-[13px]"
          onClick={() => navigator.clipboard?.writeText(state.url!)}
        >
          Copy
        </button>
      </div>
    );
  }
  if (state.kind === "confirm") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span>The old link will stop working. Continue?</span>
        <button type="button" onClick={() => void issue()} className="rounded-md bg-[#1b2a4a] px-3 py-1.5 font-semibold text-white">
          Yes, issue a new link
        </button>
        <button type="button" onClick={() => setState({ kind: "idle" })} className="rounded-md border border-stone-300 px-3 py-1.5">
          Cancel
        </button>
      </div>
    );
  }
  return (
    <div>
      <button
        type="button"
        disabled={state.kind === "busy"}
        onClick={() => setState({ kind: "confirm" })}
        className="rounded-md border border-stone-300 px-3 py-1.5 text-[13px] font-semibold disabled:opacity-60"
      >
        {state.kind === "busy" ? "Issuing…" : "Issue a new link"}
      </button>
      {state.kind === "error" && <p className="mt-1 text-[13px] text-red-700">{state.msg}</p>}
    </div>
  );
}
