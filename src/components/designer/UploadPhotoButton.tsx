"use client";


import { useState } from "react";
import { createPortal } from "react-dom";
import { useDesignStore } from "@/stores/design-store";
import { SECTION_LABELS } from "@/lib/utils/sections";
import { badgeSpots, type BadgeSpot } from "@/lib/utils/snappet";
import { getTotalWidthInches, getRenderHeightInches } from "@/lib/constants/frame";
import { getPlateArea } from "@/lib/utils/layout";
import type { SectionId } from "@/lib/types";
import { useUIStore } from "@/stores/ui-store";
import {
  badgeSpotLabel,
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
  // A frame without fixed badge positions (/lab's older geometries): pick a panel.
  | { kind: "placing"; file: File; aspect: number; panels: SectionId[] }
  // THE SHIPPING FRAME: pick ONE of its badges on a map of the frame.
  | { kind: "spot"; file: File; aspect: number; spots: BadgeSpot[] }
  | { kind: "full" };

/**
 * A map of the frame with every badge position as a button, drawn at the frame's
 * real proportions from `badgeSpots` — so the six squares sit where the six
 * badges are, and a frame with a different layout draws itself correctly. The
 * map is sized from its width and a 2.25" badge is 14.5% of a 15.5" frame, so a
 * button is about 43px wide on a 360px phone and 37px on a 320px one — just
 * under the 44px guideline on the narrowest screens.
 */
function BadgeSpotMap({
  spots,
  widthIn,
  heightIn,
  plate,
  onPick,
}: {
  spots: BadgeSpot[];
  widthIn: number;
  heightIn: number;
  /** The plate opening, in inches — the landmark that makes the map readable. */
  plate: { x: number; y: number; width: number; height: number };
  onPick: (spot: BadgeSpot) => void;
}) {
  return (
    <div
      className="relative w-full rounded-[10px] border border-[var(--ff-line-strong)] bg-[var(--ff-sunk,#eceae6)]"
      style={{ aspectRatio: `${widthIn} / ${heightIn}` }}
    >
      {/* The plate, where the frame puts it — for orientation. */}
      <div
        aria-hidden
        className="absolute flex items-center justify-center rounded-[6px] border border-dashed border-[var(--ff-line-strong)] text-[11px] font-semibold uppercase tracking-wide text-[var(--ff-ink-3)]"
        style={{
          left: `${(plate.x / widthIn) * 100}%`,
          top: `${(plate.y / heightIn) * 100}%`,
          width: `${(plate.width / widthIn) * 100}%`,
          height: `${(plate.height / heightIn) * 100}%`,
        }}
      >
        Plate
      </div>
      {spots.map((spot) => {
        const label = badgeSpotLabel(spots, spot.anchorSlotId);
        return (
          <button
            key={spot.anchorSlotId}
            type="button"
            aria-label={`${label}${spot.occupant?.image ? " (your photo — replace it)" : ""}`}
            onClick={() => onPick(spot)}
            className="absolute flex items-center justify-center rounded-[8px] border-2 border-[var(--ff-accent)] bg-[var(--ff-card)] text-[11px] font-bold text-[var(--ff-ink)] shadow-sm transition-transform active:scale-95"
            style={{
              left: `${(spot.rect.x / widthIn) * 100}%`,
              top: `${(spot.rect.y / heightIn) * 100}%`,
              width: `${(spot.rect.width / widthIn) * 100}%`,
              height: `${(spot.rect.height / heightIn) * 100}%`,
            }}
          >
            {spot.occupant?.image ? "Photo" : "+"}
          </button>
        );
      })}
    </div>
  );
}

export function UploadPhotoButton() {
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const slots = useDesignStore((s) => s.slots);
  const sections = useDesignStore((s) => s.sections);
  const textBars = useDesignStore((s) => s.textBars);
  const selectSection = useDesignStore((s) => s.selectSection);
  // The badge tapped on the frame. With one selected, that is where the photo
  // goes — no second question.
  const selectedSnappet = useUIStore((s) => s.selectedSnappetSlotId);
  const { begin, uploadOverlays } = useSnappetUpload();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const onPick = async (file?: File) => {
    if (!file) return;
    setPhase({ kind: "loading" }); // immediate feedback before the (possibly slow) decode
    const aspect = await readImageAspect(file);
    // The shipping frame: a photo is ONE badge. The tapped one if there is one,
    // otherwise the parent picks it on the map.
    const spots = badgeSpots(frameConfig, { slots, sections, textBars });
    if (spots.length > 0) {
      const tapped = spots.find((s) => s.anchorSlotId === selectedSnappet);
      if (tapped) {
        setPhase({ kind: "idle" });
        void begin(file, { anchorSlotId: tapped.anchorSlotId }, aspect);
        return;
      }
      setPhase({ kind: "spot", file, aspect, spots });
      return;
    }
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
      <label className="ff-btn ff-btn-primary ff-btn-block cursor-pointer max-lg:min-h-11">
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
        Add your own photo, mascot, or logo to a badge. Tap a badge on the frame first
        to put it there, or pick the badge after. Add as many as you like.
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

      {/* Which badge? — a map of the frame, one button per badge. */}
      {phase.kind === "spot" && (
        <Overlay>
        <div
          className="ff-school-portal ff-scrim fixed inset-0 z-[110] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="msf-spot-title"
          onClick={() => setPhase({ kind: "idle" })}
        >
          <div
            className="ff-modal w-full max-w-[420px] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="msf-spot-title" className="ff-h2 mb-1">Which badge?</h3>
            <p className="ff-help mb-3">
              Tap the badge your photo goes on. It replaces only that badge.
            </p>
            <BadgeSpotMap
              spots={phase.spots}
              widthIn={getTotalWidthInches(frameConfig)}
              heightIn={getRenderHeightInches(frameConfig)}
              // At one px per inch, so the plate comes back in inches.
              plate={getPlateArea(frameConfig, getTotalWidthInches(frameConfig))}
              onPick={(spot) => {
                const { file, aspect } = phase;
                setPhase({ kind: "idle" });
                void begin(file, { anchorSlotId: spot.anchorSlotId }, aspect);
              }}
            />
            <button
              type="button"
              onClick={() => setPhase({ kind: "idle" })}
              className="ff-btn ff-btn-secondary mt-3 w-full max-lg:min-h-11"
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

      {uploadOverlays}
    </div>
  );
}
