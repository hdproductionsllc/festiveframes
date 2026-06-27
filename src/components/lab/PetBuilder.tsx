"use client";

import { useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// PET FRAME BUILDER — INTERNAL PROTOTYPE (/lab)
// Full flow: upload a pet photo → cartoonize via /api/cartoonize (Ideogram) →
// preview on the wing → approve → "send to production" (/api/lab/pet-submit).
// One-pet layout (pet + name plate) and two-pet layout (a pet on each wing).
// Isolated from the live tile builder. Art/print is the V2 direct-print line.
// ─────────────────────────────────────────────────────────────────────────────

type Status = "empty" | "loading" | "ready" | "error";

interface Slot {
  name: string;
  original: string | null; // uploaded data URL
  cartoon: string | null; // cartoonized data URL
  status: Status;
  error: string | null;
}

const emptySlot = (): Slot => ({ name: "", original: null, cartoon: null, status: "empty", error: null });

const fileToDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

export function PetBuilder() {
  const [mode, setMode] = useState<"one" | "two">("two");
  const [left, setLeft] = useState<Slot>(emptySlot());
  const [right, setRight] = useState<Slot>(emptySlot());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<null | "done" | "error">(null);

  // Which slots are "pet" slots: two-pet = both; one-pet = left only (right = name plate).
  const petSlots: ("left" | "right")[] = mode === "two" ? ["left", "right"] : ["left"];
  const setSlot = (side: "left" | "right", s: Slot) => (side === "left" ? setLeft(s) : setRight(s));
  const getSlot = (side: "left" | "right") => (side === "left" ? left : right);

  async function cartoonize(side: "left" | "right", dataUrl: string) {
    const base = { ...getSlot(side), original: dataUrl, cartoon: null, status: "loading" as Status, error: null };
    setSlot(side, base);
    try {
      const res = await fetch("/api/cartoonize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = (await res.json().catch(() => ({}))) as { image?: string; error?: string; needsKey?: boolean };
      if (res.ok && data.image) {
        setSlot(side, { ...base, cartoon: data.image, status: "ready" });
      } else {
        setSlot(side, {
          ...base,
          status: "error",
          error: data.needsKey ? "Cartoonizer needs IDEOGRAM_API_KEY set on the server." : data.error || "Couldn't cartoonize. Try another photo.",
        });
      }
    } catch {
      setSlot(side, { ...base, status: "error", error: "Network error. Try again." });
    }
  }

  async function onPick(side: "left" | "right", file: File | undefined) {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    void cartoonize(side, dataUrl);
  }

  const petsReady = petSlots.every((s) => getSlot(s).status === "ready" && getSlot(s).name.trim());
  const namePlateOk = mode === "two" ? true : left.name.trim().length > 0; // one-pet uses left.name on the right plate

  async function submit() {
    if (!petsReady || !namePlateOk || submitting) return;
    setSubmitting(true);
    setSubmitted(null);
    try {
      const pets = petSlots.map((s) => ({ name: getSlot(s).name.trim(), image: getSlot(s).cartoon! }));
      const res = await fetch("/api/lab/pet-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, pets }),
      });
      setSubmitted(res.ok ? "done" : "error");
    } catch {
      setSubmitted("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#13110e] text-[#faf0d6]">
      <div className="border-b-2 border-[#f8c53b]/40 bg-[#f8c53b]/10 px-4 py-2 text-center text-sm font-bold text-[#f8c53b]">
        🐾 PET FRAME BUILDER — INTERNAL PROTOTYPE · upload → cartoonize (Ideogram) → approve → production
      </div>

      <div className="mx-auto max-w-5xl p-5">
        {/* Mode toggle */}
        <div className="mb-5 flex justify-center gap-2">
          {(["two", "one"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full border-2 px-5 py-2 text-sm font-bold transition-colors ${
                mode === m ? "border-[#f8c53b] bg-[#f8c53b]/15 text-[#f8c53b]" : "border-white/15 text-white/60 hover:border-white/40"
              }`}
            >
              {m === "two" ? "Two pets" : "One pet + name"}
            </button>
          ))}
        </div>

        {/* The frame preview: [wing] [plate] [wing] */}
        <div className="flex items-stretch justify-center gap-2 rounded-2xl border border-white/10 bg-[#1c1915] p-5">
          <WingSlot
            kind="pet"
            slot={left}
            onPick={(f) => onPick("left", f)}
            onRegen={() => left.original && cartoonize("left", left.original)}
            onName={(n) => setLeft({ ...left, name: n })}
            onClear={() => setLeft(emptySlot())}
          />

          {/* Center plate frame */}
          <div className="flex w-[300px] flex-none items-center justify-center rounded-[10px] border-[6px] border-black bg-black p-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
            <div className="flex aspect-[2/1] w-full items-center justify-center rounded-[4px] bg-[#f6f7f9] text-center">
              <span className="text-2xl font-extrabold tracking-widest text-[#2b3a67]">FF1&nbsp;250</span>
            </div>
          </div>

          {mode === "two" ? (
            <WingSlot
              kind="pet"
              slot={right}
              onPick={(f) => onPick("right", f)}
              onRegen={() => right.original && cartoonize("right", right.original)}
              onName={(n) => setRight({ ...right, name: n })}
              onClear={() => setRight(emptySlot())}
            />
          ) : (
            <NamePlateWing name={left.name} />
          )}
        </div>

        <p className="mt-2 text-center text-sm text-white/50">
          ~3″ die-cut wings flank a real 2:1 plate · upload a photo, we cartoonize it to the house style
        </p>

        {/* Submit */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            onClick={submit}
            disabled={!petsReady || !namePlateOk || submitting}
            className="s-display rounded-full border-[3px] border-[#1e1b17] bg-[#f8c53b] px-8 py-3 text-base font-bold text-[#1e1b17] shadow-[4px_4px_0_#1e1b17] transition-all active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Sending…" : "Approve & send to production →"}
          </button>
          {!petsReady && <p className="text-xs text-white/45">Upload, cartoonize, and name {mode === "two" ? "both pets" : "your pet"} to continue.</p>}
          {submitted === "done" && <p className="text-sm font-bold text-green-400">✓ Sent to production (prototype) — cartoon art emailed to the team.</p>}
          {submitted === "error" && <p className="text-sm font-bold text-[#ed5aa0]">Something went wrong sending it. Try again.</p>}
        </div>
      </div>
    </div>
  );
}

/* ── A pet wing: upload → loading → cartoon preview, with name + regen ── */
function WingSlot({
  slot,
  onPick,
  onRegen,
  onName,
  onClear,
}: {
  kind: "pet";
  slot: Slot;
  onPick: (f: File | undefined) => void;
  onRegen: () => void;
  onName: (n: string) => void;
  onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex w-[140px] flex-none flex-col">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
      <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border-2 border-white/15 bg-white/5" style={{ minHeight: 200 }}>
        {slot.status === "ready" && slot.cartoon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slot.cartoon} alt={slot.name || "pet"} className="h-full w-full object-contain" />
        ) : slot.status === "loading" ? (
          <span className="px-2 text-center text-xs font-semibold text-white/60">Cartoonizing…</span>
        ) : slot.status === "error" ? (
          <span className="px-2 text-center text-[11px] font-semibold text-[#ed5aa0]">{slot.error}</span>
        ) : (
          <button onClick={() => fileRef.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-1 text-white/60 hover:text-white/90">
            <span className="text-2xl">＋</span>
            <span className="text-xs font-semibold">Upload pet</span>
          </button>
        )}
      </div>
      {/* Name */}
      <input
        value={slot.name}
        onChange={(e) => onName(e.target.value)}
        placeholder="Pet name"
        maxLength={16}
        className="mt-2 w-full rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-center text-sm font-bold text-[#faf0d6] placeholder:text-white/30 focus:border-[#f8c53b] focus:outline-none"
      />
      {/* Actions */}
      {(slot.status === "ready" || slot.status === "error") && (
        <div className="mt-1.5 flex justify-center gap-2 text-[11px] font-bold">
          <button onClick={onRegen} className="text-[#3fb0e6] hover:underline">↻ Regenerate</button>
          <button onClick={onClear} className="text-white/45 hover:underline">Clear</button>
        </div>
      )}
    </div>
  );
}

/* ── One-pet layout: the opposite wing is a styled name plate ── */
function NamePlateWing({ name }: { name: string }) {
  return (
    <div className="flex w-[140px] flex-none flex-col">
      <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-[#f8c53b]/40 bg-[#f8c53b]/10 p-2" style={{ minHeight: 200 }}>
        <span className="s-display text-center text-xl font-extrabold leading-tight text-[#f8c53b]">
          {name ? name.toUpperCase() : "NAME"}
        </span>
      </div>
      <p className="mt-2 text-center text-[11px] text-white/40">name wing</p>
    </div>
  );
}
