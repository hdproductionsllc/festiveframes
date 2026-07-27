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

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  useDesignStore,
  useDesignStoreApi,
  DesignStoreProvider,
  createDesignStore,
  onPersistQuotaExceeded,
} from "@/stores/design-store";
import { composeSchoolFrame, composeSchoolPanels } from "@/lib/utils/compose-school-frame";
import { makeZip, dataUrlToBytes, type ZipEntry } from "@/lib/utils/zip";
import { buildPanelPartsList } from "@/lib/order/parts-list";
import { DndProvider } from "./DndProvider";
import { FrameCanvas, type FrameCanvasHandle } from "@/components/frame/FrameCanvas";
import { TilePalette } from "@/components/tiles/TilePalette";
import { SCHOOL_SURFACED_SET_IDS } from "@/data/sets";
import { SectionControls } from "./SectionControls";
import { FrameColorPicker } from "./FrameColorPicker";
import { SectionEditor } from "./SectionEditor";
import { UploadPhotoButton } from "./UploadPhotoButton";
import { SchoolBrandImport } from "./SchoolBrandImport";
import { SnappetRecropModal } from "./SnappetRecropModal";
import { SnappetSizeControl } from "./SnappetSizeControl";
import { ArmedBanner } from "@/components/tiles/ArmedBanner";
import { StateSelector } from "@/components/frame/StateSelector";
import { SCHOOL_FRAME_CONFIG } from "@/lib/constants/frame";
import { SCHOOL_DEFAULT_SECTIONS } from "@/lib/constants/defaults";
import { migrateSchoolDesign } from "@/lib/utils/school-migration";
import type { BannerPreview } from "@/lib/types";
import type { SnappetPreview } from "@/lib/utils/snappet";

/** The school builder's own persist key — its design never touches /build's. */
export const SCHOOL_PERSIST_KEY = "festive-frames-school-v1";

/**
 * The one icon this file needs, drawn to the house spec for the re-skin: 24x24
 * viewBox, no fill, 1.5 stroke, round caps and joins, rendered at 16px and
 * inheriting `currentColor` so it works in every button tier without a variant.
 * It replaces a ⬇ character, which rendered at a different weight from the
 * surrounding type in every font on every platform.
 */
function DownloadIcon() {
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
      <path d="M12 3.5v11M12 14.5l-4-4M12 14.5l4-4M4 19.5h16" />
    </svg>
  );
}

export function SchoolDesigner() {
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const slots = useDesignStore((s) => s.slots);
  const bottomBar = useDesignStore((s) => s.bottomBar);
  const qrCode = useDesignStore((s) => s.qrCode);
  const plateState = useDesignStore((s) => s.plateState);
  const clearAll = useDesignStore((s) => s.clearAll);

  const canvasRef = useRef<FrameCanvasHandle>(null);
  const storeApi = useDesignStoreApi();
  const [overSlotId, setOverSlotId] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<BannerPreview | null>(null);
  // Multi-cell footprint preview — the tile-drag twin of `bannerPreview`, and held
  // here for the same reason: DndProvider computes it, FrameCanvas draws it, and
  // neither should own the other's state.
  const [snappetPreview, setSnappetPreview] = useState<SnappetPreview | null>(null);
  const [storageFull, setStorageFull] = useState(false);
  const [restoredDismissed, setRestoredDismissed] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Export result surfaced in a banner so the button is NEVER a silent no-op — and so
  // it carries a REAL tappable download link, which iOS Safari honors (a synthetic
  // <a download>.click() does not, which is why "won't allow me to export anything").
  const [exportResult, setExportResult] = useState<
    { kind: "rendering" | "ready" | "error"; msg: string; href?: string; filename?: string } | null
  >(null);
  const exportUrlRef = useRef<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // null = idle; otherwise the outcome of the last "Send to production" attempt.
  const [submitState, setSubmitState] = useState<
    { kind: "ok" | "not-configured" | "error"; msg: string } | null
  >(null);

  // Export the print files as a downloaded ZIP: the 4 separately-printable panel PNGs
  // (left/right/top/bottom) plus the assembled sheet as an OVERVIEW (do-not-print), so
  // the operator has exactly what the production email would carry. Client-side only —
  // no order, no payment. Falls back to a single assembled PNG if a design somehow has
  // no printable panels.
  const handleExportPrint = async () => {
    if (exporting) return;
    setExporting(true);
    setExportResult({ kind: "rendering", msg: "Rendering your print files..." });
    // Release any prior export URL before minting a new one.
    if (exportUrlRef.current) {
      URL.revokeObjectURL(exportUrlRef.current);
      exportUrlRef.current = null;
    }
    try {
      const s = storeApi.getState();
      const design = {
        frameConfig: s.frameConfig,
        frameColor: s.frameColor,
        slots: s.slots,
        textBars: s.textBars,
        qrCode: s.qrCode,
        plateState: s.plateState,
        sections: s.sections,
      };
      const [overview, panelPngs] = await Promise.all([
        composeSchoolFrame(design),
        composeSchoolPanels(design),
      ]);
      const base = (s.designName || "school-frame").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "school-frame";

      let blob: Blob;
      let filename: string;
      if (panelPngs.length === 0) {
        // Nothing printable yet (empty design) → fall back to the assembled sheet.
        if (!overview) {
          setExportResult({ kind: "error", msg: "Nothing to export yet - add some tiles or art to the frame first." });
          return;
        }
        blob = new Blob([dataUrlToBytes(overview) as unknown as BlobPart], { type: "image/png" });
        filename = `${base}-print.png`;
      } else {
        const entries: ZipEntry[] = panelPngs.map((p) => ({
          name: `${base}-${p.id}.png`,
          data: dataUrlToBytes(p.dataUrl),
        }));
        if (overview) entries.push({ name: `${base}-OVERVIEW-do-not-print.png`, data: dataUrlToBytes(overview) });
        blob = makeZip(entries);
        filename = `${base}-print-panels.zip`;
      }

      const url = URL.createObjectURL(blob);
      exportUrlRef.current = url;

      // Desktop convenience: auto-trigger the download. iOS Safari ignores a synthetic
      // click, so the banner below ALSO shows a REAL anchor the user can tap to save.
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setExportResult({
        kind: "ready",
        msg: filename.endsWith(".zip")
          ? "Your 4 panel print files are ready (zipped)."
          : "Your print file is ready.",
        href: url,
        filename,
      });
    } catch {
      setExportResult({ kind: "error", msg: "Couldn't render the print files. Please try again." });
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
        frameColor: s.frameColor,
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
        setSubmitState({ kind: "ok", msg: "Your design is on its way to our team." });
      } else if (data.reason === "email-not-configured") {
        setSubmitState({
          kind: "not-configured",
          msg: "Sending is not switched on yet, so nothing was sent.",
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

  // Was this load a RESTORE? Read the blob rather than inferring from state: a
  // seeded first visit and a restored design look identical in the store, and the
  // difference is exactly what the notice is about.
  //
  // useSyncExternalStore rather than an effect because the answer is fixed for the
  // life of the page — there is nothing to subscribe to — and it gives a correct
  // SSR value (false) instead of rendering the banner then taking it away.
  const wasRestored = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return localStorage.getItem(SCHOOL_PERSIST_KEY) != null;
      } catch {
        return false;
      }
    },
    () => false,
  );
  const restoredNotice = wasRestored && !restoredDismissed;

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
      {/* Header — school context + the plate state picker (the real StateSelector,
          wired to the shared store). No storefront/order flow.

          It used to be a solid-ink bar, which made it the highest-contrast object on
          the page at 15.11:1 — louder than the product it exists to frame. A white
          bar with a hairline puts that contrast budget back where it belongs.

          The "Internal prototype · fork of the live builder" strapline is gone
          rather than restyled: it is dev scaffolding, and this page is shown to
          parents deciding whether to spend money. */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ff-line)] bg-[var(--ff-card)] px-4 py-2.5">
        <h1 className="ff-h1">School Frame</h1>
        <div className="flex items-center gap-2">
          <span className="ff-label hidden sm:block">Plate</span>
          <StateSelector theme="header" />
          {/* Two actions, ONE of them primary. Exporting a file is the power-user
              path; sending the design to be made is the thing this page is for. */}
          <button
            type="button"
            onClick={handleExportPrint}
            disabled={exporting}
            title="Download a print-ready image of your frame"
            className="ff-btn ff-btn-secondary ff-btn-sm shrink-0"
          >
            {exporting ? "Rendering..." : "Export print file"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || exporting}
            title="Send your finished design to our team"
            className="ff-btn ff-btn-primary ff-btn-sm shrink-0"
          >
            {submitting ? "Sending..." : "Send my design"}
          </button>
        </div>
      </header>

      {/* The three status banners. Each was a saturated fill (cyan / gold / red)
          with white or near-black text; two of the three failed AA outright. They
          are now tinted surfaces with a matching dark ink — ok 7.01:1, warn 7.30:1,
          error 6.41:1 — which also stops a transient banner out-shouting the frame. */}
      {submitState && (
        <div
          role="status"
          className={`ff-banner flex items-start justify-between gap-3 px-4 py-2.5 ${
            submitState.kind === "ok"
              ? "ff-banner-ok"
              : submitState.kind === "not-configured"
                ? "ff-banner-warn"
                : "ff-banner-error"
          }`}
        >
          <p className="text-[13px] leading-snug">{submitState.msg}</p>
          <button type="button" onClick={() => setSubmitState(null)} className="ff-chip shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {exportResult && (
        <div
          role="status"
          className={`ff-banner flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 ${
            exportResult.kind === "ready"
              ? "ff-banner-ok"
              : exportResult.kind === "rendering"
                ? "ff-banner-warn"
                : "ff-banner-error"
          }`}
        >
          <p className="text-[13px] leading-snug">
            {exportResult.msg}
            {exportResult.kind === "ready" && (
              // The old copy ended in an arrow pointing at a button whose position on
              // the line is not guaranteed — it wraps on a narrow window. Name the
              // button instead.
              <span> If the download did not start, use the Download button.</span>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {exportResult.kind === "ready" && exportResult.href && (
              // A REAL anchor the user taps — this is what downloads on iOS Safari.
              <a
                href={exportResult.href}
                download={exportResult.filename}
                className="ff-btn ff-btn-secondary ff-btn-sm no-underline"
              >
                <DownloadIcon />
                Download{exportResult.filename?.endsWith(".zip") ? " .zip" : ""}
              </a>
            )}
            {exportResult.kind !== "rendering" && (
              <button
                type="button"
                onClick={() => setExportResult(null)}
                className="ff-chip shrink-0"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {storageFull && (
        <div className="ff-banner ff-banner-error flex items-start justify-between gap-3 px-4 py-2.5">
          <p className="text-[13px] leading-snug">
            This browser&apos;s storage is full, so your latest change may not be saved
            for next time. Try a smaller image, or finish and order this design now.
          </p>
          <button type="button" onClick={() => setStorageFull(false)} className="ff-chip shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {/* Reload RESTORES your design rather than clearing it — which is what you want
          when a tab closes by accident, and not what you want when you are starting a
          new school. Both readings are legitimate, so say which one happened and make
          the other one available, instead of picking for the user.

          Offered, never imposed: a modal on every load would tax the common case
          (coming back to finish) to serve the rarer one. */}
      {/* Informational, not a warning — so it gets the neutral banner rather than the
          gold one it used to share with "email isn't configured". A restore is the
          expected outcome of a reload, and colouring it like a problem said
          otherwise. */}
      {restoredNotice && (
        <div className="ff-banner ff-banner-info flex flex-wrap items-center justify-between gap-3 px-4 py-2">
          <p className="text-[13px] leading-snug">We restored your last design.</p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                clearAll();
                setRestoredDismissed(true);
              }}
              className="ff-btn ff-btn-danger ff-btn-sm"
            >
              Start fresh
            </button>
            <button
              type="button"
              onClick={() => setRestoredDismissed(true)}
              className="ff-btn ff-btn-secondary ff-btn-sm"
            >
              Keep it
            </button>
          </div>
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
        {/* `pt-0` deliberately: the frame is the subject of this page and should meet
            the chrome above it, not float below a band of dead space. */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-4 px-4 pb-4 pt-0 mx-auto w-full max-w-[1560px] items-start">
          {/* LEFT tools rail. The PALETTE leads: it is the thing you reach for first
              and on every subsequent action, so it gets the top of the rail. Upload and
              the section pickers follow, because you touch them once per design.
              (It used to sit last, which put the most-used control furthest from the
              top on desktop and buried it under two panels you rarely revisit.)

              The side-panel width toggle is gone from the UI. The builder is locked to
              2 tiles per side panel — the roomy-margin option — so the control only
              ever offered a worse answer. `PanelWidthToggle` and the underlying
              `setWingColumns` are intact for when a second size is a real product. */}
          <div className="order-1 lg:order-none min-w-0 flex flex-col gap-4">
            {/* Brand import leads the rail, ABOVE the palette. It is the once-per-design
                first move — paste the school's website, take the crest and the name —
                and everything below it is what you reach for repeatedly afterwards. It
                would be invisible under a 42vh scrolling palette, and a step you take
                first should not be the one you have to scroll to find.

                It PLACES NOTHING itself: an "Add to frame" tap builds a File from the
                candidate's full-res PNG and hands it to the same `useSnappetUpload.begin`
                that UploadPhotoButton calls, so the aspect-locked crop, the live DPI
                gate and the 2x2 minTileSpan floor all still apply. */}
            <SchoolBrandImport />
            <TilePalette surfacedSetIds={SCHOOL_SURFACED_SET_IDS} />
            <UploadPhotoButton />
            <FrameColorPicker />
            <SectionControls />
          </div>

          {/* RIGHT column — frame preview, then the ONE active editor beneath it.

              NOTHING here is sticky, deliberately. Pinning the frame put the design on
              top of the panel you type into: the editor is its sibling, so scrolling
              slid the editor into the pinned frame's band, and a `position: sticky`
              element paints above a STATIC sibling whatever the DOM order. Sticking the
              whole column instead fixed the overlap but bought it with a height cap,
              which on a short window clipped the editor or shrank the frame. Every
              version traded one problem for another, so the pinning is simply gone.

              Ordinary flow: the frame renders at its natural size, the editor sits
              below it with `gap-6` of clear margin, and the page scrolls. */}
          <div className="order-2 lg:order-none flex flex-col gap-6 min-w-0">
            <div className="w-full flex flex-col gap-3">
              {/* THE STAGE. The one zone on the page darker than its neighbours
                  (1.19:1 below the canvas, 1.28:1 below the cards) — everything else
                  is white or near-white, so the eye goes to the single tonal break
                  and finds the frame sitting in it. Frame navy on this mat is
                  11.10:1, which makes the product the highest-contrast large object
                  in view now that the ink header and the 3px outlines are gone.

                  `relative` MUST stay: the frame-side ArmedBanner is absolutely
                  positioned against this element. */}
              <div className="ff-stage relative mx-auto w-full">
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
    createDesignStore(SCHOOL_PERSIST_KEY, {
      frameConfig: SCHOOL_FRAME_CONFIG,
      migrateExtra: migrateSchoolDesign,
      // Top/bottom start as TEXT banners — see SCHOOL_DEFAULT_SECTIONS. Initial
      // state only; a returning user's persisted sections still win.
      sections: SCHOOL_DEFAULT_SECTIONS,
    })
  );
  return (
    <DesignStoreProvider store={store}>
      <SchoolDesigner />
    </DesignStoreProvider>
  );
}
