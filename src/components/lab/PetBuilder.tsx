"use client";

import { useEffect, useRef, useState } from "react";
import { CAPTION_VOICES, type CaptionVoice } from "@/lib/pet-caption";

// ─────────────────────────────────────────────────────────────────────────────
// PET FRAME BUILDER — INTERNAL PROTOTYPE (/lab)
// Full flow: upload a pet photo → cartoonize via /api/cartoonize (Nano Banana) →
// preview on the wing → approve → "send to production" (/api/lab/pet-submit).
// Layouts:
//   • Pet + thought — pet on one wing, an AI "what my pet thinks" bumper line
//     (/api/pet-caption, Claude vision) in a thought bubble on the other wing.
//   • Two pets — a pet on each wing.
//   • One pet + name — pet + a styled name plate.
// Isolated from the live tile builder. Art/print is the V2 direct-print line.
// ─────────────────────────────────────────────────────────────────────────────

type Status = "empty" | "loading" | "ready" | "error";
type Mode = "thought" | "two" | "one";

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

const MODES: { id: Mode; label: string }[] = [
  { id: "thought", label: "Pet + thought 💭" },
  { id: "two", label: "Two pets" },
  { id: "one", label: "One pet + name" },
];

export function PetBuilder() {
  const [mode, setMode] = useState<Mode>("thought");
  const [left, setLeft] = useState<Slot>(emptySlot());
  const [right, setRight] = useState<Slot>(emptySlot());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<null | "done" | "error">(null);

  // Thought-mode state (the line printed opposite the pet).
  const [voice, setVoice] = useState<CaptionVoice>("funny");
  const [caption, setCaption] = useState("");
  const [captionStatus, setCaptionStatus] = useState<Status>("empty");
  const [captionGenerated, setCaptionGenerated] = useState(false); // false = curated sample
  const [captionError, setCaptionError] = useState<string | null>(null);

  // Which slots are "pet" slots: two-pet = both; others = left only.
  const petSlots: ("left" | "right")[] = mode === "two" ? ["left", "right"] : ["left"];
  const setSlot = (side: "left" | "right", s: Slot) => (side === "left" ? setLeft(s) : setRight(s));
  const getSlot = (side: "left" | "right") => (side === "left" ? left : right);

  async function regenCaption(v?: CaptionVoice) {
    // Caption from the CARTOON cut-out (no background) so the line never
    // references scenery the print removed; fall back to the photo if needed.
    const photo = left.cartoon || left.original;
    if (!photo) return;
    const useVoice = v ?? voice;
    setCaptionStatus("loading");
    setCaptionError(null);
    try {
      const res = await fetch("/api/pet-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photo, voice: useVoice, petName: left.name.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { line?: string; generated?: boolean; error?: string };
      if (res.ok && typeof data.line === "string") {
        setCaption(data.line);
        setCaptionGenerated(!!data.generated);
        setCaptionStatus("ready");
      } else {
        setCaptionStatus("error");
        setCaptionError(data.error || "Couldn't write a line.");
      }
    } catch {
      setCaptionStatus("error");
      setCaptionError("Network error. Try again.");
    }
  }

  // Auto-write a line once the pet is cartoonized in thought mode.
  useEffect(() => {
    if (mode === "thought" && left.status === "ready" && left.original && captionStatus === "empty") {
      void regenCaption();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, left.status]);

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
          error: data.needsKey ? "Cartoonizer not configured yet — set GEMINI_API_KEY on the server." : data.error || "Couldn't cartoonize. Try another photo.",
        });
      }
    } catch {
      setSlot(side, { ...base, status: "error", error: "Network error. Try again." });
    }
  }

  async function onPick(side: "left" | "right", file: File | undefined) {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    if (side === "left") {
      // New pet → the thought is stale; reset so it regenerates for this photo.
      setCaption("");
      setCaptionStatus("empty");
      setCaptionGenerated(false);
      setCaptionError(null);
    }
    void cartoonize(side, dataUrl);
  }

  const nameRequired = mode !== "thought"; // the thought wing shows no name
  const petsReady = petSlots.every((s) => getSlot(s).status === "ready" && (!nameRequired || getSlot(s).name.trim()));
  const namePlateOk = mode === "one" ? left.name.trim().length > 0 : true;
  const captionOk = mode !== "thought" || (captionStatus === "ready" && caption.trim().length > 0);
  const canSubmit = petsReady && namePlateOk && captionOk && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitted(null);
    try {
      const pets = petSlots.map((s) => ({ name: getSlot(s).name.trim() || "(unnamed)", image: getSlot(s).cartoon! }));
      const res = await fetch("/api/lab/pet-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, pets, ...(mode === "thought" ? { caption: caption.trim(), voice } : {}) }),
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
        🐾 PET FRAME BUILDER — INTERNAL PROTOTYPE · upload → cartoonize (Nano Banana) → thought line (Claude) → approve → production
      </div>

      <div className="mx-auto max-w-5xl p-5">
        {/* Mode toggle */}
        <div className="mb-5 flex flex-wrap justify-center gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-full border-2 px-5 py-2 text-sm font-bold transition-colors ${
                mode === m.id ? "border-[#f8c53b] bg-[#f8c53b]/15 text-[#f8c53b]" : "border-white/15 text-white/60 hover:border-white/40"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* The frame preview: [wing] [plate] [wing] */}
        <div className="flex items-stretch justify-center gap-2 rounded-2xl border border-white/10 bg-[#1c1915] p-5">
          <WingSlot
            slot={left}
            onPick={(f) => onPick("left", f)}
            onRegen={() => left.original && cartoonize("left", left.original)}
            onName={(n) => setLeft({ ...left, name: n })}
            onClear={() => setLeft(emptySlot())}
            hideName={mode === "thought"}
          />

          {/* Center plate frame */}
          <div className="flex w-[300px] flex-none items-center justify-center rounded-[10px] border-[6px] border-black bg-black p-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
            <div className="flex aspect-[2/1] w-full items-center justify-center rounded-[4px] bg-[#f6f7f9] text-center">
              <span className="text-2xl font-extrabold tracking-widest text-[#2b3a67]">FF1&nbsp;250</span>
            </div>
          </div>

          {mode === "two" ? (
            <WingSlot
              slot={right}
              onPick={(f) => onPick("right", f)}
              onRegen={() => right.original && cartoonize("right", right.original)}
              onName={(n) => setRight({ ...right, name: n })}
              onClear={() => setRight(emptySlot())}
            />
          ) : mode === "one" ? (
            <NamePlateWing name={left.name} />
          ) : (
            <ThoughtWing status={captionStatus} caption={caption} error={captionError} hasPet={left.status === "ready"} />
          )}
        </div>

        <p className="mt-2 text-center text-sm text-white/50">
          ~3″ die-cut wings flank a real 2:1 plate · upload a photo, we cartoonize it to the house style
        </p>

        {/* Thought controls — voice, edit, regenerate (thought mode only) */}
        {mode === "thought" && (
          <div className="mx-auto mt-4 max-w-xl rounded-xl border border-white/10 bg-[#1c1915] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
              <span className="mr-1 text-xs font-bold uppercase tracking-wide text-white/45">Voice</span>
              {CAPTION_VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setVoice(v.id);
                    if (left.original) void regenCaption(v.id);
                  }}
                  disabled={!left.original || captionStatus === "loading"}
                  className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors disabled:opacity-40 ${
                    voice === v.id ? "border-[#f8c53b] bg-[#f8c53b]/15 text-[#f8c53b]" : "border-white/15 text-white/55 hover:border-white/40"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-white/45">The line (edit freely)</label>
            <div className="flex gap-2">
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 34))}
                placeholder={left.status === "ready" ? "Writing your pet's thought…" : "Upload a pet first"}
                disabled={left.status !== "ready"}
                maxLength={34}
                className="flex-1 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-center text-base font-extrabold uppercase tracking-wide text-[#faf0d6] placeholder:text-white/30 placeholder:normal-case placeholder:font-normal focus:border-[#f8c53b] focus:outline-none disabled:opacity-40"
              />
              <button
                onClick={() => regenCaption()}
                disabled={!left.original || captionStatus === "loading"}
                className="flex-none rounded-md border border-[#3fb0e6]/50 px-3 py-2 text-xs font-bold text-[#3fb0e6] transition-colors hover:bg-[#3fb0e6]/10 disabled:opacity-40"
              >
                {captionStatus === "loading" ? "…" : "↻ New line"}
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px]">
              <span className="text-white/35">{caption.length}/34 · short reads best from a car</span>
              {captionStatus === "error" ? (
                <span className="font-semibold text-[#ed5aa0]">{captionError}</span>
              ) : captionStatus === "ready" && !captionGenerated ? (
                <span className="text-white/35">sample line — set ANTHROPIC_API_KEY for photo-aware lines</span>
              ) : null}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="s-display rounded-full border-[3px] border-[#1e1b17] bg-[#f8c53b] px-8 py-3 text-base font-bold text-[#1e1b17] shadow-[4px_4px_0_#1e1b17] transition-all active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Sending…" : "Approve & send to production →"}
          </button>
          {!canSubmit && !submitting && (
            <p className="text-xs text-white/45">
              {mode === "two"
                ? "Upload, cartoonize, and name both pets to continue."
                : mode === "one"
                  ? "Upload, cartoonize, and name your pet to continue."
                  : "Upload a pet and get its thought line to continue."}
            </p>
          )}
          {submitted === "done" && <p className="text-sm font-bold text-green-400">✓ Sent to production (prototype) — art{mode === "thought" ? " + thought line" : ""} emailed to the team.</p>}
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
  hideName,
}: {
  slot: Slot;
  onPick: (f: File | undefined) => void;
  onRegen: () => void;
  onName: (n: string) => void;
  onClear: () => void;
  hideName?: boolean;
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
      {!hideName && (
        <input
          value={slot.name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Pet name"
          maxLength={16}
          className="mt-2 w-full rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-center text-sm font-bold text-[#faf0d6] placeholder:text-white/30 focus:border-[#f8c53b] focus:outline-none"
        />
      )}
      {/* Actions */}
      {(slot.status === "ready" || slot.status === "error") && (
        <div className={`flex justify-center gap-2 text-[11px] font-bold ${hideName ? "mt-2" : "mt-1.5"}`}>
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

/* ── Thought layout: the opposite wing is a speech/thought bubble ── */
function ThoughtWing({ status, caption, error, hasPet }: { status: Status; caption: string; error: string | null; hasPet: boolean }) {
  return (
    <div className="flex w-[140px] flex-none flex-col">
      <div className="relative flex flex-1 items-center justify-center" style={{ minHeight: 200 }}>
        {/* bubble */}
        <div className="flex h-full w-full items-center justify-center rounded-2xl border-2 border-white/80 bg-white p-3 text-center shadow-[0_6px_16px_rgba(0,0,0,0.35)]">
          {status === "ready" && caption ? (
            <span className="s-display text-lg font-extrabold uppercase leading-tight tracking-tight text-[#1e1b17]">{caption}</span>
          ) : status === "loading" ? (
            <span className="text-xs font-semibold text-[#1e1b17]/50">Thinking…</span>
          ) : status === "error" ? (
            <span className="px-1 text-[11px] font-semibold text-[#c0345f]">{error}</span>
          ) : (
            <span className="text-xs font-semibold text-[#1e1b17]/40">{hasPet ? "Writing the thought…" : "Upload a pet →"}</span>
          )}
        </div>
        {/* thought-bubble tail pointing toward the pet (left) */}
        <span className="absolute -left-1 bottom-7 h-3 w-3 rounded-full border-2 border-white/80 bg-white" />
        <span className="absolute -left-3 bottom-3 h-2 w-2 rounded-full border-2 border-white/80 bg-white" />
      </div>
      <p className="mt-2 text-center text-[11px] text-white/40">thought wing 💭</p>
    </div>
  );
}
