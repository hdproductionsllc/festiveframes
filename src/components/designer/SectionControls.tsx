"use client";

import { useDesignStore } from "@/stores/design-store";
import { SECTION_IDS, SECTION_LABELS, sectionSupportsText } from "@/lib/utils/sections";

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

export function SectionControls() {
  const sections = useDesignStore((s) => s.sections);
  const selectedSectionId = useDesignStore((s) => s.selectedSectionId);
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
              {/* Every card reads the same: what this panel IS, and a way to select
                  it. The Tiles/Text switch used to live here, which made the two
                  banner cards look like the only ones with any controls while the
                  wings looked switched off. Changing a banner to badges is a
                  deliberate act, so it now sits in the section editor with the rest
                  of that panel's settings. */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#1e1b17]/50">
                  {sectionSupportsText(id)
                    ? mode === "text"
                      ? "Text banner"
                      : "Badges"
                    : "Art only"}
                </span>
                <button
                  type="button"
                  onClick={() => selectSection(id)}
                  className="rounded-md border-2 border-[#1e1b17] bg-[#3fb0e6] px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-[2px_2px_0_#1e1b17] transition-all active:translate-y-0.5 active:scale-95"
                >
                  {selected ? "Selected" : "Select"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[#1e1b17]/55">
        The top bar and bottom banner are text banners; the side panels hold badges and
        art. Select a panel to edit it below — including switching a banner over to
        badges if you want one there.
      </p>
    </div>
  );
}
