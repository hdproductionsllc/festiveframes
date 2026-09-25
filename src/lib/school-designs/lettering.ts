// Every line of lettering on a school frame, in reading order — what the proof
// sheet asks a parent to check letter by letter.
//
// School banner words live on the frame's SECTIONS (top runner, bottom bar), not
// on free text bars; a list built from the parts list's bars alone came back
// empty in the browser check. This reads both, top to bottom, and each banner's
// small line before its big one — the order they are read on the frame.

import type { BottomBarConfig, PlacedTextBar, SectionId, SectionState } from "@/lib/types";

const SECTION_ORDER: SectionId[] = ["top", "bottom", "wing-left", "wing-right"];

function linesOf(c: BottomBarConfig | undefined): string[] {
  if (!c) return [];
  return [c.tagline, c.text].map((t) => (t ?? "").trim()).filter(Boolean);
}

export function designLettering(d: {
  sections?: Partial<Record<SectionId, SectionState>>;
  textBars?: PlacedTextBar[];
}): string[] {
  const out: string[] = [];
  for (const id of SECTION_ORDER) {
    const sec = d.sections?.[id];
    if (sec?.mode === "text") out.push(...linesOf(sec.text));
  }
  for (const bar of d.textBars ?? []) out.push(...linesOf(bar.config));
  return out;
}
