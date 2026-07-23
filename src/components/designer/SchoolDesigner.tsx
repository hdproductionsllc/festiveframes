"use client";

// ─── SCHOOL / FUNDRAISING BUILDER — a FORK of the live builder ───────────────
//
// This is the REAL builder, not a mock. It reuses the actual interactive pieces
// verbatim — the drag-and-drop engine (DndProvider), the frame canvas that renders
// the real license plate + tile rails + WINGS (the one-tile-wide draggable side
// panels), the tile palette, and the text-bar editor. The ONLY differences from
// `/build` are: it seeds a SCHOOL frame config (wings on → wide side panels) and it
// drops the storefront header + Stripe order flow.
//
// STORE NOTE: it owns an ISOLATED design store (its own `createDesignStore`
// instance + its own persist key), so nothing it does can reach /build's design.

import { useEffect, useRef, useState } from "react";
import {
  useDesignStore,
  useDesignStoreApi,
  DesignStoreProvider,
  createDesignStore,
  onPersistQuotaExceeded,
} from "@/stores/design-store";
import { composeSchoolFrame, composeSchoolPanels } from "@/lib/utils/compose-school-frame";
import { buildPanelPartsList } from "@/lib/order/parts-list";
import { DndProvider } from "./DndProvider";
import { FrameCanvas, type FrameCanvasHandle } from "@/components/frame/FrameCanvas";
import { TilePalette } from "@/components/tiles/TilePalette";
import { SCHOOL_SURFACED_SET_IDS } from "@/data/sets";
import { SectionControls } from "./SectionControls";
import { SectionEditor } from "./SectionEditor";
import { UploadPhotoButton } from "./UploadPhotoButton";
import { PanelWidthToggle } from "./PanelWidthToggle";
import { SnappetRecropModal } from "./SnappetRecropModal";
import { SnappetSizeControl } from "./SnappetSizeControl";
import { ArmedBanner } from "@/components/tiles/ArmedBanner";
import { StateSelector } from "@/components/frame/StateSelector";
import { SCHOOL_FRAME_CONFIG } from "@/lib/constants/frame";
import { migrateSchoolDesign } from "@/lib/utils/school-migration";
import type { BannerPreview } from "@/lib/types";
import type { SnappetPreview } from "@/lib/utils/snappet";

export function SchoolDesigner() {
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const slots = useDesignStore((s) => s.slots);
  const bottomBar = useDesignStore((s) => s.bottomBar);
  const qrCode = useDesignStore((s) => s.qrCode);
  const plateState = useDesignStore((s) => s.plateState);

  const canvasRef = useRef<FrameCanvasHandle>(null);
  const storeApi = useDesignStoreApi();
  const [overSlotId, setOverSlotId] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<BannerPreview | null>(null);
  // Multi-cell footprint preview — the tile-drag twin of `bannerPreview`, and held
  // here for the same reason: DndProvider computes it, FrameCanvas draws it, and
  // neither should own the other's state.
  const [snappetPreview, setSnappetPreview] = useState<SnappetPreview | null>(null);
  const [storageFull, setStorageFull] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // null = idle; otherwise the outcome of the last "Send to production" attempt.
  const [submitState, setSubmitState] = useState<
    { kind: "ok" | "not-configured" | "error"; msg: string } | null
  >(null);

  // Export the WHOLE assembled frame to a print-ready, DPI-stamped PNG (the school
  // print renderer — a separate path from /build's checkout proof). Client-side only:
  // it reads the current design snapshot, composes the PNG, and downloads it. No
  // order, no payment — that commerce wiring is a separate, confirmed step.
  const handleExportPrint = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const s = storeApi.getState();
      const dataUrl = await composeSchoolFrame({
        frameConfig: s.frameConfig,
        slots: s.slots,
        textBars: s.textBars,
        qrCode: s.qrCode,
        plateState: s.plateState,
        sections: s.sections,
      });
      if (!dataUrl) return;
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${(s.designName || "school-frame").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-print.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setExporting(false);
    }
  };

  // Send the finished design to production BY EMAIL — the whole order path (no
  // payment). Renders the same full-res print PNG as the export button, builds the
  // panel-grouped parts list, and POSTs both to /api/school/submit. The server owns
  // the recipient; this only reports back which of the three outcomes happened
  // (sent / email-not-configured-yet / error) so the button never lies.
  const handleSubmit = async () => {
    if (submitting || exporting) return;
    setSubmitting(true);
    setSubmitState(null);
    try {
      const s = storeApi.getState();
      const design = {
        frameConfig: s.frameConfig,
        slots: s.slots,
        textBars: s.textBars,
        qrCode: s.qrCode,
        plateState: s.plateState,
        sections: s.sections,
      };
      // The assembled sheet is the OVERVIEW; the 4 panel PNGs are the print files
      // (each positioned separately on the bed — the seams are hard to hit assembled).
      const [printPng, panelPngs] = await Promise.all([
        composeSchoolFrame(design),
        composeSchoolPanels(design),
      ]);
      if (!printPng) {
        setSubmitState({ kind: "error", msg: "Couldn't render the print file. Try again." });
        return;
      }
      const panels = panelPngs.map((p) => ({ name: p.id, dataUrl: p.dataUrl }));
      const partsList = buildPanelPartsList({
        slots: s.slots,
        textBars: s.textBars,
        qrCode: s.qrCode,
        plateState: s.plateState,
        designName: s.designName,
        tileSizeInches: s.frameConfig.tileSizeInches,
        dieCut: s.dieCut,
        frameConfig: s.frameConfig,
        sections: s.sections,
      });
      const res = await fetch("/api/school/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printPng, panels, designName: s.designName, partsList }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string };
      if (res.ok && data.ok) {
        setSubmitState({ kind: "ok", msg: "Sent to production! Check the orders inbox." });
      } else if (data.reason === "email-not-configured") {
        setSubmitState({
          kind: "not-configured",
          msg: "Email isn't switched on yet — nothing was sent. (Configure RESEND_API_KEY to go live.)",
        });
      } else {
        setSubmitState({ kind: "error", msg: "Couldn't send your design right now. Please try again." });
      }
    } catch {
      setSubmitState({ kind: "error", msg: "Something went wrong sending your design. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // Uploaded mascot images can push this browser's storage over its limit. If a
  // save is rejected we warn instead of losing the design silently on reload.
  useEffect(() => onPersistQuotaExceeded(() => setStorageFull(true)), []);

  // NOTE — there is deliberately no "seed the school frame" effect here.
  //
  // There used to be one: an unconditional `loadDesign({ frameConfig: SCHOOL_FRAME_CONFIG,
  // slots: {}, textBars: [] })` on mount. `loadDesign` is a FULL replace, and persist
  // hydrates synchronously from localStorage during store construction — so the effect
  // ran one frame after hydration and wiped the returning user's entire design (and,
  // because persist subscribes to changes, wrote the blank back over their saved blob).
  // It also made `migrateSchoolDesign` unobservable: its output was overwritten before
  // anything could read it.
  //
  // The frame is now owned by the store instance (see `createDesignStore`'s
  // `frameConfig` option, applied to initial state, hydrate-merge and loadDesign), which
  // is where a single-SKU product's fixed geometry belongs. Hydration is authoritative;
  // no effect can clobber it.

  return (
    <div className="workbench-bg min-h-screen flex flex-col">
      {/* Minimal prototype header — school context + the plate state picker (the
          real StateSelector, wired to the shared store). No storefront/order flow. */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-[#1e1b17] bg-[#1e1b17] px-4 py-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#f8c53b]">
            Internal prototype · fork of the live builder
          </p>
          <h1 className="text-lg font-extrabold text-[#faf0d6]">School / Fundraising Frame</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[10px] uppercase tracking-wide text-[#faf0d6]/45 sm:block">
            Plate
          </span>
          <StateSelector theme="header" />
          <button
            type="button"
            onClick={handleExportPrint}
            disabled={exporting}
            title="Render the whole assembled frame to a print-ready PNG (client-side; no order)"
            className="shrink-0 rounded-full border-2 border-[#f8c53b] bg-[#f8c53b] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#1e1b17] transition hover:bg-[#ffd968] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? "Rendering…" : "Export print file"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || exporting}
            title="Render the frame and email the print file to production (no payment)"
            className="shrink-0 rounded-full border-2 border-[#ed5aa0] bg-[#ed5aa0] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#fff9ec] transition hover:bg-[#f472ac] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send to production"}
          </button>
        </div>
      </header>

      {submitState && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 border-b-[3px] border-[#1e1b17] px-4 py-2.5 ${
            submitState.kind === "ok"
              ? "bg-[#3fb0e6] text-[#0a1a22]"
              : submitState.kind === "not-configured"
                ? "bg-[#f8c53b] text-[#1e1b17]"
                : "bg-[#C8102E] text-[#fff9ec]"
          }`}
        >
          <p className="text-xs font-bold leading-snug sm:text-sm">{submitState.msg}</p>
          <button
            type="button"
            onClick={() => setSubmitState(null)}
            className="shrink-0 rounded-full border-2 border-current px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {storageFull && (
        <div className="flex items-start justify-between gap-3 border-b-[3px] border-[#1e1b17] bg-[#C8102E] px-4 py-2.5 text-[#fff9ec]">
          <p className="text-xs font-bold leading-snug sm:text-sm">
            Heads up — this browser&apos;s storage is full, so your latest change may not
            be saved for next time. Try a smaller image, or finish and order this design now.
          </p>
          <button
            type="button"
            onClick={() => setStorageFull(false)}
            className="shrink-0 rounded-full border-2 border-[#fff9ec] px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide hover:bg-[#fff9ec]/15"
          >
            Dismiss
          </button>
        </div>
      )}

      <DndProvider
        onOverSlotChange={setOverSlotId}
        onBannerPreviewChange={setBannerPreview}
        onSnappetPreviewChange={setSnappetPreview}
      >
        {/* Layout MIRRORS /build: a LEFT tools rail (photo upload, frame width, the
            section pickers, and the tile palette — the palette scrolls inside its own
            42vh box, so the rail never grows tall) and a RIGHT column with the frame
            preview on top of the ONE active editor beneath it. Because the tools live
            in the bounded left rail, the frame + its editor fit the viewport without a
            long stack pushing the frame out of view. On MOBILE it collapses to one
            column: tools rail (1) -> frame + editor (2). */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-4 p-4 mx-auto w-full max-w-[1560px] items-start">
          {/* LEFT tools rail. Palette LAST so it sits directly above the frame on mobile
              (the drag/tap source next to its target). */}
          <div className="order-1 lg:order-none min-w-0 flex flex-col gap-4">
            <UploadPhotoButton />
            <PanelWidthToggle />
            <SectionControls />
            <TilePalette surfacedSetIds={SCHOOL_SURFACED_SET_IDS} />
          </div>

          {/* RIGHT column — frame preview + the selected section's editor, stacked in one
              cell so the editor sits directly under the frame (mirrors /build). */}
          <div className="order-2 lg:order-none flex flex-col gap-4 min-w-0">
            <div className="w-full flex flex-col gap-3">
              <div className="relative">
                <ArmedBanner placement="frame" />
                <FrameCanvas
                  ref={canvasRef}
                  frameConfig={frameConfig}
                  slots={slots}
                  bottomBar={bottomBar}
                  qrCode={qrCode}
                  plateState={plateState}
                  overSlotId={overSlotId}
                  snappetPreview={snappetPreview}
                  bannerPreview={bannerPreview}
                />
              </div>
            </div>
            <SectionEditor />
          </div>
        </main>
      </DndProvider>

      {/* Re-crop flow for an image-snappet resized to a non-matching aspect. Sits at
          the builder root (not inside SectionEditor) because a resize can happen from
          a snappet selected on the canvas with no section open. Renders nothing until
          a resize requests it. */}
      <SnappetRecropModal />

      {/* Floating size control for the selected tile/snappet — grow/shrink any placed
          tile (photos re-crop on aspect change). Portaled to <body> internally. */}
      <SnappetSizeControl />
    </div>
  );
}

// Wrapper that owns the ISOLATED school store and provides it to the builder. It
// MUST sit above SchoolDesigner so that component's top-level store hooks read the
// school store (not /build's). The store is created once on the client (lazy
// useState init) with its OWN persist key, so it never touches /build's design.
export function SchoolBuilder() {
  // The school store is configured two ways:
  //  - `frameConfig`: the school frame is ONE printable geometry (it must fit the
  //    eufyMake E1 bed), so the store owns it outright — initial state, and it wins
  //    over any stale persisted copy on hydrate. No component seeds it.
  //  - `migrateExtra`: a school-ONLY persist migration. The wing trim (3 tile columns
  //    per side → 1, for the E1 bed) invalidated slot ids that remain perfectly valid
  //    on /build, so it cannot live in the shared migration.
  const [store] = useState(() =>
    createDesignStore("festive-frames-school-v1", {
      frameConfig: SCHOOL_FRAME_CONFIG,
      migrateExtra: migrateSchoolDesign,
    })
  );
  return (
    <DesignStoreProvider store={store}>
      <SchoolDesigner />
    </DesignStoreProvider>
  );
}
