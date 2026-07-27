"use client";

import { useDesignStore } from "@/stores/design-store";
import { SECTION_IDS, SECTION_LABELS, sectionSupportsText, sectionSupportsTiles } from "@/lib/utils/sections";

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
    <div className="ff-panel p-4">
      {/* The 🧩 was decoration in a heading — dropped, not swapped. */}
      <h3 className="ff-h2 mb-3">Sections</h3>

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
              className={`rounded-[6px] border p-2 transition-colors ${spanFull ? "col-span-2" : ""} ${
                selected
                  ? "border-[var(--ff-accent)] bg-[var(--ff-accent-soft)]"
                  : "border-[var(--ff-line)] bg-[var(--ff-sunk)]"
              }`}
            >
              <button
                type="button"
                onClick={() => selectSection(id)}
                className="ff-label mb-1.5 block w-full text-left"
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
                <span className="ff-micro">
                  {!sectionSupportsTiles(id)
                    ? "Text banner"
                    : sectionSupportsText(id)
                      ? mode === "text"
                        ? "Text banner"
                        : "Badges"
                      : "Art only"}
                </span>
                <button
                  type="button"
                  onClick={() => selectSection(id)}
                  className="ff-btn ff-btn-secondary ff-btn-sm"
                >
                  {selected ? "Selected" : "Select"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="ff-micro mt-3">
        The top bar is always a text banner - it is one tile tall, too short for a
        badge to read. The bottom banner is two tall, so it can be either. The side
        panels hold badges and art. Select a panel to edit it below.
      </p>
    </div>
  );
}
