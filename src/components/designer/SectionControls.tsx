"use client";

import { useDesignStore } from "@/stores/design-store";
import { SECTION_IDS, SECTION_LABELS, sectionSupportsText } from "@/lib/utils/sections";
import type { SectionMode } from "@/lib/types";

// Per-section mode picker for the school builder. Each frame section (the two side
// panels, the top bar, the bottom banner) can be Tiles (achievement tiles) or Text
// (school name / slogan). Switching to Text turns that whole section into ONE
// direct-to-print banner; switching back to Tiles is lossless (its tiles were
// suppressed, not deleted). ART is no longer a section MODE — uploaded art enters a
// Tiles panel as a SNAPPET (see SectionEditor's "Add art"), one unified system.

/** Visual order in the mirror layout: top, then the wings, then bottom. */
const SECTION_LAYOUT_ORDER: Record<string, number> = {
  top: 0,
  "wing-left": 1,
  "wing-right": 2,
  bottom: 3,
};

const MODES: { id: SectionMode; label: string }[] = [
  { id: "tiles", label: "Tiles" },
  { id: "text", label: "Text" },
];

export function SectionControls() {
  const sections = useDesignStore((s) => s.sections);
  const selectedSectionId = useDesignStore((s) => s.selectedSectionId);
  const setSectionMode = useDesignStore((s) => s.setSectionMode);
  const selectSection = useDesignStore((s) => s.selectSection);

  return (
    <div className="bsk-panel-blue rounded-xl border border-surface-700/50 bg-surface-800/50 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-[#1e1b17]">
        <span aria-hidden>🧩</span> Sections
      </h3>

      {/* Laid out to MIRROR the frame, not as a flat list. Rendering SECTION_IDS
          into a 2-column grid put the cards at
            [Left panel] [Top bar] / [Bottom banner] [Right panel]
          so the two Tiles/Text toggles landed top-right and bottom-left — nowhere
          near the panels they control, which reads as the toggle being on the wrong
          part of the frame. Top spans the width, the wings sit side by side beneath
          it, bottom spans the width again: the same shape as the frame itself. */}
      <div className="grid grid-cols-2 gap-2">
        {SECTION_IDS.map((id) => {
          const spanFull = id === "top" || id === "bottom";
          const mode = sections[id]?.mode ?? "tiles";
          const selected = selectedSectionId === id;
          return (
            <div
              key={id}
              style={{ order: SECTION_LAYOUT_ORDER[id] }}
              className={`rounded-lg border-2 p-2 transition-colors ${spanFull ? "col-span-2" : ""} ${
                selected ? "border-[#f8c53b] bg-[#f8c53b]/15" : "border-[#1e1b17]/10 bg-white/40"
              }`}
            >
              <button
                type="button"
                onClick={() => selectSection(id)}
                className="mb-1.5 block w-full text-left text-[11px] font-bold uppercase tracking-wide text-[#1e1b17]/70"
              >
                {SECTION_LABELS[id]}
              </button>
              {/* Side panels are tiles/art only — the Text banner is a top/bottom
                  affordance, so the toggle only shows there. */}
              {sectionSupportsText(id) ? (
                <div className="flex gap-1">
                  {MODES.map((m) => {
                    const active = mode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSectionMode(id, m.id)}
                        aria-pressed={active}
                        className={`flex-1 rounded-md border-2 px-1.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide transition-all active:scale-95 ${
                          active
                            ? "border-[#1e1b17] bg-[#ed5aa0] text-white shadow-[2px_2px_0_#1e1b17]"
                            : "border-[#1e1b17]/15 bg-white text-[#1e1b17] hover:border-[#ed5aa0] hover:bg-[#ed5aa0]/10"
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span className="inline-block rounded-md border-2 border-[#1e1b17]/15 bg-white px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#1e1b17]/70">
                  Tiles / Art
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[#1e1b17]/55">
        The top bar and bottom banner can be tiles or a text banner; the side panels are
        tiles/art. To add a photo, mascot, or logo, select a panel and use{" "}
        <span className="font-bold">Add art</span> below.
      </p>
    </div>
  );
}
