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

/**
 * The 📷 was this button's only glyph and the button is the discoverable entry point
 * for the whole upload flow, so it is REPLACED rather than dropped. House spec:
 * 24x24 box, no fill, 1.5 stroke, round caps and joins, 16px, `currentColor`.
 */
function ImageIcon() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
      <path d="M3 15.5l4.5-4.5 4 4 3-3L21 17" />
      <circle cx="8.5" cy="9" r="1.25" />
    </svg>
  );
}

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
    <div className="ff-panel p-3">
      {/* A <label> wrapping a visually-hidden (NOT display:none) input. On iOS this
          is the reliable pattern: tapping the label opens the picker AND the native
          label→input link fires `change` on selection. A `display:none` input opens
          the picker but often never fires `change` on iOS — the tap looked dead. */}
      <label className="ff-btn ff-btn-primary ff-btn-block cursor-pointer">
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            void onPick(e.target.files?.[0]);
            e.target.value = ""; // let the same file be re-picked / re-cropped
          }}
        />
        <ImageIcon />
        Upload a photo
      </label>
      <p className="ff-help mt-2">
        Add your own photo, mascot, or logo. Pick where it goes, then drag it and pull
        the handles to resize.
      </p>

      {/* Loading overlay — immediate feedback while the phone decodes the photo. */}
      {phase.kind === "loading" && (
        <Overlay>
        <div className="ff-school-portal ff-scrim fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="ff-modal w-full max-w-[320px] p-5 text-center">
            <p className="ff-h2 mb-3">Loading your photo...</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ff-line)]">
              <div className="ff-upload-bar h-full rounded-full bg-[var(--ff-accent)]" />
            </div>
          </div>
        </div>
        </Overlay>
      )}

      {/* Placement prompt — "where should it go?" One tap per panel with room. */}
      {phase.kind === "placing" && (
        <Overlay>
        <div
          className="ff-school-portal ff-scrim fixed inset-0 z-[110] flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setPhase({ kind: "idle" })}
        >
          <div
            className="ff-modal w-full max-w-[360px] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="ff-h2 mb-1">Where should it go?</h3>
            <p className="ff-help mb-3">
              Pick a spot to place your photo - you can drag and resize it after.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {phase.panels.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => choosePanel(phase.file, phase.aspect, id)}
                  className="ff-btn ff-btn-secondary ff-btn-block"
                >
                  {SECTION_LABELS[id]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPhase({ kind: "idle" })}
              className="ff-btn ff-btn-secondary ff-btn-sm mt-3 w-full"
            >
              Cancel
            </button>
          </div>
        </div>
        </Overlay>
      )}

      {phase.kind === "full" && (
        <p className="ff-well mt-2 px-2.5 py-1.5 text-[12px] text-[var(--ff-ink-2)]">
          Every panel is full or set to text. Clear a tile or switch a panel back to{" "}
          <span className="font-medium text-[var(--ff-ink)]">Badges</span>, then tap Upload again.
        </p>
      )}

      {cropModal}
    </div>
  );
}
