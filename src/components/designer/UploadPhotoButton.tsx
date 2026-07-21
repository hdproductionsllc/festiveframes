"use client";

import { useRef, useState } from "react";
import { useDesignStore } from "@/stores/design-store";
import { useSnappetUpload, firstUploadableSection } from "./useSnappetUpload";

// The PROMINENT, always-visible upload entry point for the school builder. The
// per-section "Add art" in SectionEditor still exists (and shares this exact flow via
// useSnappetUpload), but it's only reachable after selecting a panel — so this is the
// discoverable one. One tap: pick a photo → it lands in a panel with room (the
// selected one first) as a snappet you can then drag anywhere and resize.

export function UploadPhotoButton() {
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const slots = useDesignStore((s) => s.slots);
  const sections = useDesignStore((s) => s.sections);
  const textBars = useDesignStore((s) => s.textBars);
  const selectedSectionId = useDesignStore((s) => s.selectedSectionId);
  const selectSection = useDesignStore((s) => s.selectSection);
  const { begin, cropModal } = useSnappetUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [full, setFull] = useState(false); // no panel has room / all set to text

  const onPick = (file?: File) => {
    if (!file) return;
    const target = firstUploadableSection(frameConfig, slots, sections, textBars, selectedSectionId);
    if (!target) {
      setFull(true);
      return;
    }
    setFull(false);
    selectSection(target); // reflect it in the Sections panel + SectionEditor below
    void begin(file, target);
  };

  return (
    <div className="rounded-2xl border-2 border-[#1e1b17] bg-[#f8c53b] p-3 shadow-[3px_3px_0_#1e1b17]">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = ""; // let the same file be re-picked / re-cropped
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-[3px] border-[#1e1b17]
          bg-[#3fb0e6] px-4 py-3 text-base font-extrabold uppercase tracking-wide text-white
          shadow-[3px_3px_0_#1e1b17] transition-all hover:brightness-105 active:translate-y-0.5"
      >
        <span aria-hidden className="text-lg">📷</span>
        Upload a photo
      </button>
      <p className="mt-2 text-[11px] font-semibold leading-relaxed text-[#1e1b17]/70">
        Add your own photo, mascot, or logo. It drops onto the frame — then drag it
        where you want and pull the handles to resize.
      </p>
      {full && (
        <p className="mt-2 rounded-lg border-2 border-[#1e1b17] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#1e1b17]">
          Every panel is full or set to text. Clear a tile or switch a panel back to{" "}
          <span className="font-extrabold">Tiles</span> to add a photo, then tap again.
        </p>
      )}
      {cropModal}
    </div>
  );
}
