"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useDesignStore } from "@/stores/design-store";
import { SECTION_LABELS } from "@/lib/utils/sections";
import type { SectionId } from "@/lib/types";
import {
  useSnappetUpload,
  uploadableSections,
  readImageAspect,
} from "./useSnappetUpload";

/** Render fixed overlays into <body> so no transformed/clipping ancestor can trap
 *  them (a real iOS failure mode). No-op during SSR (document is undefined). */
function Overlay({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

// The PROMINENT, always-visible upload entry point for the school builder. The
// per-section "Add art" in SectionEditor shares the same crop flow (useSnappetUpload),
// but it's only reachable after selecting a panel — this is the discoverable one.
//
// Mobile-friendly flow (a tap must never feel dead while a big phone photo decodes):
//   tap → file picker → LOADING overlay (immediate feedback while we read the image)
//        → "where should it go?" PROMPT (pick a panel) → crop → placed snappet.
// The photo lands as a snappet you can then drag anywhere and resize.

type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "placing"; file: File; aspect: number; panels: SectionId[] }
  | { kind: "full" };

export function UploadPhotoButton() {
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const slots = useDesignStore((s) => s.slots);
  const sections = useDesignStore((s) => s.sections);
  const textBars = useDesignStore((s) => s.textBars);
  const selectSection = useDesignStore((s) => s.selectSection);
  const { begin, cropModal } = useSnappetUpload();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const onPick = async (file?: File) => {
    if (!file) return;
    setPhase({ kind: "loading" }); // immediate feedback before the (possibly slow) decode
    const aspect = await readImageAspect(file);
    const panels = uploadableSections(frameConfig, slots, sections, textBars);
    if (panels.length === 0) {
      setPhase({ kind: "full" });
      return;
    }
    setPhase({ kind: "placing", file, aspect, panels });
  };

  const choosePanel = (file: File, aspect: number, panel: SectionId) => {
    setPhase({ kind: "idle" });
    selectSection(panel); // reflect it in the Sections panel + SectionEditor below
    void begin(file, panel, aspect); // hands off to the crop modal (already decoded)
  };

  return (
    <div className="rounded-2xl border-2 border-[#1e1b17] bg-[#f8c53b] p-3 shadow-[3px_3px_0_#1e1b17]">
      {/* A <label> wrapping a visually-hidden (NOT display:none) input. On iOS this
          is the reliable pattern: tapping the label opens the picker AND the native
          label→input link fires `change` on selection. A `display:none` input opens
          the picker but often never fires `change` on iOS — the tap looked dead. */}
      <label
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-[3px]
          border-[#1e1b17] bg-[#3fb0e6] px-4 py-3 text-base font-extrabold uppercase tracking-wide
          text-white shadow-[3px_3px_0_#1e1b17] transition-all hover:brightness-105 active:translate-y-0.5"
      >
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            void onPick(e.target.files?.[0]);
            e.target.value = ""; // let the same file be re-picked / re-cropped
          }}
        />
        <span aria-hidden className="text-lg">📷</span>
        Upload a photo
      </label>
      <p className="mt-2 text-[11px] font-semibold leading-relaxed text-[#1e1b17]/70">
        Add your own photo, mascot, or logo. Pick where it goes, then drag it and pull
        the handles to resize.
      </p>

      {/* Loading overlay — immediate feedback while the phone decodes the photo. */}
      {phase.kind === "loading" && (
        <Overlay>
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-[320px] rounded-2xl border-[3px] border-[#1e1b17] bg-[#faf0d6] p-5 text-center shadow-[6px_6px_0_#1e1b17]">
            <p className="mb-3 text-sm font-extrabold uppercase tracking-wide text-[#1e1b17]">
              Loading your photo…
            </p>
            <div className="h-2.5 w-full overflow-hidden rounded-full border-2 border-[#1e1b17] bg-white">
              <div className="ff-upload-bar h-full rounded-full bg-[#3fb0e6]" />
            </div>
          </div>
        </div>
        </Overlay>
      )}

      {/* Placement prompt — "where should it go?" One tap per panel with room. */}
      {phase.kind === "placing" && (
        <Overlay>
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setPhase({ kind: "idle" })}
        >
          <div
            className="w-full max-w-[360px] rounded-2xl border-[3px] border-[#1e1b17] bg-[#faf0d6] p-5 shadow-[6px_6px_0_#1e1b17]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 text-sm font-extrabold uppercase tracking-wide text-[#1e1b17]">
              Where should it go?
            </h3>
            <p className="mb-3 text-[11px] font-semibold text-[#1e1b17]/60">
              Pick a spot to place your photo — you can drag and resize it after.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {phase.panels.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => choosePanel(phase.file, phase.aspect, id)}
                  className="rounded-xl border-[3px] border-[#1e1b17] bg-[#3fb0e6] px-3 py-3 text-sm
                    font-extrabold uppercase tracking-wide text-white shadow-[3px_3px_0_#1e1b17]
                    transition-all hover:brightness-105 active:translate-y-0.5"
                >
                  {SECTION_LABELS[id]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPhase({ kind: "idle" })}
              className="mt-3 w-full rounded-lg border-2 border-[#1e1b17]/20 bg-white px-3 py-1.5
                text-xs font-bold uppercase tracking-wide text-[#1e1b17] hover:bg-white/70"
            >
              Cancel
            </button>
          </div>
        </div>
        </Overlay>
      )}

      {phase.kind === "full" && (
        <p className="mt-2 rounded-lg border-2 border-[#1e1b17] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#1e1b17]">
          Every panel is full or set to text. Clear a tile or switch a panel back to{" "}
          <span className="font-extrabold">Tiles</span>, then tap Upload again.
        </p>
      )}

      {cropModal}
    </div>
  );
}
