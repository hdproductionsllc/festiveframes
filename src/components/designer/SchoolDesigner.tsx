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

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
import { kitMarkPieces } from "@/data/sets/school-marks";
import { FrameColorPicker } from "./FrameColorPicker";
import { SectionEditor } from "./SectionEditor";
import { UploadPhotoButton } from "./UploadPhotoButton";
import { SchoolBrandImport } from "./SchoolBrandImport";
import { SnappetRecropModal } from "./SnappetRecropModal";
import { SnappetSizeControl } from "./SnappetSizeControl";
import { ArmedBanner } from "@/components/tiles/ArmedBanner";
import { StateSelector } from "@/components/frame/StateSelector";
import {
  SCHOOL_FRAME_CONFIG,
  getRenderHeightInches,
  getTotalWidthInches,
} from "@/lib/constants/frame";
import { SCHOOL_DEFAULT_SECTIONS } from "@/lib/constants/defaults";
import { migrateSchoolDesign } from "@/lib/utils/school-migration";
import { kitSections, type SchoolKit } from "@/data/school-kits";
import type { BannerPreview } from "@/lib/types";
import type { SnappetPreview } from "@/lib/utils/snappet";

/** The school builder's own persist key — its design never touches /build's. */
export const SCHOOL_PERSIST_KEY = "festive-frames-school-v1";

/**
 * Vertical room the page chrome needs above and below the pinned frame — the header,
 * the restore banner, and enough air that the frame does not sit flush against the
 * window edges.
 *
 * It caps the STAGE's width (the frame is aspect-locked and sized from its width), so
 * the whole frame stays inside the viewport when it pins instead of hanging its bottom
 * off-screen. Deliberately generous: over-reserving shrinks the frame slightly, while
 * under-reserving hides part of the product.
 */
const STAGE_VIEWPORT_RESERVE_PX = 190;

/**
 * The share of that room the frame keeps WHILE A SECTION EDITOR IS OPEN.
 *
 * With an editor open the two of them cannot both be full size on a SHORT window —
 * a full-height frame plus a full-height editor is more than the viewport holds, and
 * something has to give. Every earlier attempt let the frame win and pushed the
 * editor off the bottom, which is the overlap this float was torn out for. So the
 * frame yields instead.
 *
 * It yields far LESS than it used to (0.62). At that depth the product visibly
 * jumped every time a tile or a panel was selected, which reads as the page
 * breaking rather than as making room — the frame is the thing being sold and it
 * should not lurch. Three changes together fix it: a gentler share, a transition
 * so the change is a move rather than a jump, and a height gate in CSS so on a
 * tall window the frame does not move at all.
 */
const STAGE_EDITING_SHARE = 0.82;

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

export function SchoolDesigner({
  kit,
  hero,
}: { kit?: SchoolKit; hero?: React.ReactNode } = {}) {
  // This school's own crest/mascot badges. Memoised on the kit so the palette
  // isn't handed a fresh array on every render of a page that never changes kit.
  const kitMarks = useMemo(() => kitMarkPieces(kit), [kit]);
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const slots = useDesignStore((s) => s.slots);
  const bottomBar = useDesignStore((s) => s.bottomBar);
  const qrCode = useDesignStore((s) => s.qrCode);
  const plateState = useDesignStore((s) => s.plateState);
  const clearAll = useDesignStore((s) => s.clearAll);
  // Whether the section editor is on screen — it is what the pinned frame has to
  // make room for. See STAGE_EDITING_SHARE.
  const editorOpen = useDesignStore((s) => s.selectedSectionId) != null;

  // The frame's fixed width:height. The pinned stage is capped by HEIGHT (it must
  // fit the window) but sized by WIDTH, so this is what converts one into the other.
  // Read from the live config rather than hard-coded, so a geometry change cannot
  // silently start clipping the frame.
  const frameAspect = getTotalWidthInches(frameConfig) / getRenderHeightInches(frameConfig);

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
  // "Make it theirs" intake — the about-ME moment. Three fields that seed the
  // design through the same store actions the editors use, so everything the
  // intake writes is ordinary, fully editable state.
  // First-visit tour: three beats, dismissible, remembered. Starts false on
  // both server and client, then flips on after mount if not yet dismissed —
  // hydration-safe by construction.
  const [tourOpen, setTourOpen] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem("msf-tour-done")) setTourOpen(true);
    } catch {}
  }, []);
  const dismissTour = () => {
    setTourOpen(false);
    try { localStorage.setItem("msf-tour-done", "1"); } catch {}
  };
  const [kidName, setKidName] = useState("");
  const [kidActivity, setKidActivity] = useState("");
  const [kidYear, setKidYear] = useState("");

  // Welcome-band chips deep-link presets via #preset=<pieceId>. On arrival or
  // click: compose the symmetric layout, preselect the activity, and put the
  // cursor in the name field — the preset-lover flow in one tap.
  useEffect(() => {
    const applyFromHash = () => {
      const m = /#preset=([^&]+)/.exec(window.location.hash);
      if (!m) return;
      const pieceId = decodeURIComponent(m[1]);
      const api = storeApi.getState();
      const SPAN = { cols: 2, rows: 2 };
      const corners = pieceId === "generic" ? "hs:crest" : pieceId;
      const layout: Array<[string, string]> = [
        ["frame:wing-left-0", corners],
        ["frame:top-11", corners],
        ["frame:wing-left-2", "hs:laurel"],
        ["frame:right-1", "hs:laurel"],
        ["frame:wing-left-4", "hs:trophy"],
        ["frame:right-3", "hs:trophy"],
        ["frame:wing-left-6", corners],
        ["frame:bottom-11", corners],
      ];
      for (const [slot, pc] of layout) api.placeTile(slot, pc, "hs", SPAN);
      if (pieceId !== "generic") setKidActivity(pieceId);
      const nameInput = document.querySelector<HTMLInputElement>("input[name=kid-name]");
      nameInput?.scrollIntoView({ behavior: "smooth", block: "center" });
      nameInput?.focus({ preventScroll: true });
    };
    applyFromHash();
    window.addEventListener("hashchange", applyFromHash);
    return () => window.removeEventListener("hashchange", applyFromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [exporting, setExporting] = useState(false);
  // Export result surfaced in a banner so the button is NEVER a silent no-op — and so
  // it carries a REAL tappable download link, which iOS Safari honors (a synthetic
  // <a download>.click() does not, which is why "won't allow me to export anything").
  const [exportResult, setExportResult] = useState<
    { kind: "rendering" | "ready" | "error"; msg: string; href?: string; filename?: string } | null
  >(null);
  const exportUrlRef = useRef<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [buying, setBuying] = useState(false);
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
        body: JSON.stringify({ printPng, panels, designName: s.designName, partsList, school: kit?.slug }),
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

  // Buy this frame — the DIRECT-TO-PARENT path. Same render pipeline as
  // handleSubmit, but instead of emailing the files it stashes them as a server
  // draft and hands the parent to Stripe; the paid session's webhook (and the
  // /thanks relay) fulfills from that draft. The school slug rides the checkout
  // metadata, which is the fundraiser's donation-attribution trail.
  // Seed the design from the intake. Badge lands in the two top corners the
  // block-tiling layouts use; name goes jersey-style on the bottom banner with
  // the class year as its tagline. All ordinary store writes — undoable,
  // editable, persisted like anything hand-placed.
  const applyKidIntake = () => {
    const api = storeApi.getState();
    const name = kidName.trim().toUpperCase();
    if (name) {
      api.setSectionMode("bottom", "text");
      api.setSectionText("bottom", {
        text: name,
        ...(kidYear ? { tagline: `CLASS OF ${kidYear}` } : {}),
      });
    } else if (kidYear) {
      api.setSectionText("bottom", { tagline: `CLASS OF ${kidYear}` });
    }
    if (kidActivity) {
      // PRESET, not a sprinkle: picking an activity composes the whole frame
      // as a symmetric layout — activity patches in all four corners, laurel
      // and trophy on the mid rails — so the preset-lover customer is one
      // name + one tap from a finished, orderable design. Mirror pairs:
      // (wing-left-0, top-11), (wing-left-2, right-1), (wing-left-4,
      // right-3), (wing-left-6, bottom-11).
      const SPAN = { cols: 2, rows: 2 };
      const layout: Array<[string, string]> = [
        ["frame:wing-left-0", kidActivity],
        ["frame:top-11", kidActivity],
        ["frame:wing-left-2", "hs:laurel"],
        ["frame:right-1", "hs:laurel"],
        ["frame:wing-left-4", "hs:trophy"],
        ["frame:right-3", "hs:trophy"],
        ["frame:wing-left-6", kidActivity],
        ["frame:bottom-11", kidActivity],
      ];
      for (const [slot, pieceId] of layout) api.placeTile(slot, pieceId, "hs", SPAN);
    }
  };

  const handleBuy = async () => {
    if (buying || submitting || exporting) return;
    setBuying(true);
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
      const [printPng, panelPngs] = await Promise.all([
        composeSchoolFrame(design),
        composeSchoolPanels(design),
      ]);
      if (!printPng) {
        setSubmitState({ kind: "error", msg: "Couldn't render your frame's print file. Try again." });
        return;
      }
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
      const orderId = crypto.randomUUID();
      // Panels are the print files; the assembled sheet is the proof/overview.
      // `design` is deliberately NOT sent: fulfillOrder only uses it to re-render
      // /build-shaped designs, and a school design there would confuse, not help.
      const draftRes = await fetch("/api/order/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          parts: partsList,
          artifacts: {
            proof: { name: "OVERVIEW-do-not-print", dataUrl: printPng },
            printSheets: panelPngs.map((p) => ({ name: p.id, dataUrl: p.dataUrl })),
            banners: [],
          },
        }),
      });
      if (!draftRes.ok) {
        setSubmitState({ kind: "error", msg: "Couldn't save your design for checkout. Please try again." });
        return;
      }
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "school-frame",
          orderId,
          designName: s.designName,
          school: kit?.slug,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return; // navigating away — leave the button in its busy state
      }
      setSubmitState({
        kind: "error",
        msg: data.error || "Couldn't start checkout. Please try again.",
      });
    } catch {
      setSubmitState({ kind: "error", msg: "Something went wrong starting checkout. Please try again." });
    } finally {
      setBuying(false);
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
      <header className="ff-app-header sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ff-line)] bg-[var(--ff-card)] px-4 py-2.5">
        <h1 className="ff-h1">
          MySchoolFrame
          {kit && <span className="ff-h1-school"> · {kit.shortName} {kit.mascot}</span>}
        </h1>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
          <span className="ff-label hidden sm:block">Plate</span>
          <StateSelector theme="header" />
          {/* Two actions, ONE of them primary. Exporting a file is the power-user
              path; sending the design to be made is the thing this page is for. */}
          {/* Production tool, not a customer action: now that the builder is
              live, the print-file export hides behind a quiet gear. The result
              banner still carries the real download link (iOS needs a tappable
              <a>), so the flow past this button is unchanged. */}
          <button
            type="button"
            onClick={handleExportPrint}
            disabled={exporting}
            title="Export print files (production)"
            aria-label="Export print files"
            className="ff-btn ff-btn-secondary ff-btn-sm shrink-0 !px-2 opacity-45 hover:opacity-100"
          >
            {exporting ? (
              <span className="animate-spin inline-block" aria-hidden>⚙</span>
            ) : (
              <span aria-hidden>⚙</span>
            )}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || exporting || buying}
            title="Send your finished design to our team without ordering"
            className="ff-btn ff-btn-primary ff-btn-sm shrink-0 whitespace-nowrap"
          >
            {submitting ? (
              "Sending..."
            ) : (
              <>
                Send<span className="hidden sm:inline"> my</span> design
              </>
            )}
          </button>
          {/* Direct checkout is PARKED until pricing is owner-confirmed — the
              published path is send-your-design, and we follow up with ordering
              info. handleBuy and the Stripe rails stay wired for the flip back:
              restore this button and demote Send to ff-btn-secondary. */}
          {false && (
            <button
              type="button"
              onClick={handleBuy}
              disabled={buying || submitting || exporting}
              title="Order this frame, secure checkout"
              className="ff-btn ff-btn-primary ff-btn-sm shrink-0 whitespace-nowrap"
            >
              {buying ? "Starting checkout..." : <>Buy<span className="hidden sm:inline"> this frame</span></>}
            </button>
          )}
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
                // "Start fresh" = the frame as this page arrives, i.e. the kit's
                // dressed demo. The Clear button in QuickActions means the other
                // thing and passes nothing.
                clearAll({ reseed: true });
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

      {/* The school's welcome, BELOW the app chrome and above the builder.
          It is passed in rather than rendered by the page around this component
          so that the chrome — wordmark, plate picker, Send, and the restore
          banner — sits at the very top of the page instead of landing between
          the hero and the frame, where it broke the read straight through from
          "this is your school" to "here is your frame". */}
      {hero}

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
          <div className="order-3 lg:order-none min-w-0 flex flex-col gap-4">
            {/* Brand import leads the rail, ABOVE the palette. It is the once-per-design
                first move — paste the school's website, take the crest and the name —
                and everything below it is what you reach for repeatedly afterwards. It
                would be invisible under a 42vh scrolling palette, and a step you take
                first should not be the one you have to scroll to find.

                It PLACES NOTHING itself: an "Add to frame" tap builds a File from the
                candidate's full-res PNG and hands it to the same `useSnappetUpload.begin`
                that UploadPhotoButton calls, so the aspect-locked crop, the live DPI
                gate and the 2x2 minTileSpan floor all still apply. */}
            {/* Brand scan is the GENERIC builder's school picker. A kit page
                already IS the school — showing "paste your school's website"
                there undercuts the whole personalized pitch. */}
            {!kit && <SchoolBrandImport />}
            {/* Their own photo sits ABOVE the badge library: for a parent the
                picture of their kid is the most personal thing they can put on
                this frame, and it was buried under a long scrolling palette. */}
            <UploadPhotoButton />
            {/* The school's own marks lead its palette — a SLUH parent finds the
                Billiken before the generic badges. Empty for the kitless builder. */}
            <TilePalette
              surfacedSetIds={SCHOOL_SURFACED_SET_IDS}
              extraPieces={kitMarks}
            />
            <FrameColorPicker />
            {/* The "Sections" panel that used to sit here is GONE. It listed the
                four panels with a Select button each and a paragraph explaining
                which could hold what — a table of contents for a thing already
                fully visible on screen. The frame itself is the control: tapping
                a banner or panel selects it, which the frame now says out loud
                (see the hint under the stage) instead of a panel restating it. */}
          </div>

          {/* RIGHT column — the frame, pinned, with the editor in its own pane below.

              THE FRAME FLOATS AGAIN, on desktop, and the three ways it failed before
              are all addressed by the SHAPE of this column rather than traded against
              each other:

              1. Sticking the FRAME alone let the editor — a static sibling — slide up
                 over it and swallow it whole. A float you scroll away from is not a
                 float. So the whole COLUMN pins instead, and the frame keeps its place
                 at the top of it.

              2. Sticking the column previously CLIPPED the editor, because the column
                 was capped to the viewport and the editor simply ran off the end. It
                 now scrolls inside its own pane (`overflow-y-auto` under `min-h-0`),
                 so a long panel is fully reachable and the frame never moves.

              3. A frame taller than the window cannot pin usefully. It is aspect-locked
                 and sized from its WIDTH, so the height cap is expressed as the
                 max-width below, derived from the live geometry rather than guessed.

              Mobile keeps ordinary flow: one column, no pinning, no nested scroll — a
              pinned frame on a phone leaves nowhere to type. */}
          <div className="contents lg:flex lg:order-none lg:flex-col lg:gap-6 lg:min-w-0 lg:sticky lg:top-3 lg:h-[calc(100vh-1.5rem)]">
            <div className="ff-frame-dock order-1 min-w-0 flex flex-col gap-3 sticky top-0 z-30 -mx-4 px-4 pt-2 pb-2 lg:static lg:order-none lg:z-auto lg:w-full lg:mx-0 lg:px-0 lg:pt-0 lg:pb-0 lg:shrink-0">
              {/* Make-it-theirs intake: the first thing a parent touches. Three
                  quick fields -> the frame is suddenly about THEIR kid. Writes
                  ordinary store state via applyKidIntake. */}
              <div data-intake className="flex flex-wrap items-end gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2.5 shadow-sm">
                <label className="flex flex-col gap-1 text-[12px] font-medium text-stone-700 grow basis-32">
                  Their last name
                  <input
                    type="text"
                    name="kid-name"
                    value={kidName}
                    onChange={(e) => setKidName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") applyKidIntake(); }}
                    placeholder="MILLER"
                    maxLength={14}
                    className="h-9 rounded-lg border border-stone-300 px-2.5 text-[14px] uppercase text-stone-900 placeholder:text-stone-400"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[12px] font-medium text-stone-700 grow basis-32">
                  What they do
                  <select
                    name="kid-activity"
                    value={kidActivity}
                    onChange={(e) => setKidActivity(e.target.value)}
                    className="h-9 rounded-lg border border-stone-300 bg-white px-2 text-[14px] text-stone-900"
                  >
                    <option value="">Pick one…</option>
                    <option value="hs:football-patch">Football</option>
                    <option value="hs:soccer-patch">Soccer</option>
                    <option value="hs:basketball-patch">Basketball</option>
                    <option value="hs:volleyball-patch">Volleyball</option>
                    <option value="hs:baseball-patch">Baseball</option>
                    <option value="hs:softball-patch">Softball</option>
                    <option value="hs:track">Track</option>
                    <option value="hs:tennis">Tennis</option>
                    <option value="hs:golf">Golf</option>
                    <option value="hs:cheer">Cheer</option>
                    <option value="hs:band">Band</option>
                    <option value="hs:marching-band">Marching Band</option>
                    <option value="hs:drama">Drama</option>
                    <option value="hs:robotics">Robotics</option>
                    <option value="hs:laurel">Honor Roll</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[12px] font-medium text-stone-700 basis-28">
                  Class year
                  <select
                    name="kid-year"
                    value={kidYear}
                    onChange={(e) => setKidYear(e.target.value)}
                    className="h-9 rounded-lg border border-stone-300 bg-white px-2 text-[14px] text-stone-900"
                  >
                    <option value="">Year…</option>
                    {/* Current students only: after June, the just-graduated
                        class drops off and the incoming freshmen appear — the
                        list can never go stale. */}
                    {Array.from({ length: 4 }, (_, i) => {
                      const now = new Date();
                      const y = now.getFullYear() + (now.getMonth() >= 5 ? 1 : 0) + i;
                      return <option key={y}>{y}</option>;
                    })}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={applyKidIntake}
                  disabled={!kidName.trim() && !kidActivity && !kidYear}
                  className="ff-btn ff-btn-primary ff-btn-sm h-9"
                >
                  See it on the frame
                </button>
              </div>
              {tourOpen && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-[13px] text-stone-800">
                  <span className="font-semibold">Quick tour:</span>
                  <span>1️⃣ Type their name. It lands on the banner.</span>
                  <span>2️⃣ Tap a badge, then tap the frame. Or just drag it on.</span>
                  <span>3️⃣ Love it? Send it. Nothing prints until you say so.</span>
                  <button type="button" onClick={dismissTour} className="ff-chip ml-auto shrink-0">
                    Got it
                  </button>
                </div>
              )}
              {/* THE STAGE. The one zone on the page darker than its neighbours
                  (1.19:1 below the canvas, 1.28:1 below the cards) — everything else
                  is white or near-white, so the eye goes to the single tonal break
                  and finds the frame sitting in it. Frame navy on this mat is
                  11.10:1, which makes the product the highest-contrast large object
                  in view now that the ink header and the 3px outlines are gone.

                  `relative` MUST stay: the frame-side ArmedBanner is absolutely
                  positioned against this element. */}
              <div
                className="ff-stage ff-stage-cap relative mx-auto w-full"
                style={
                  {
                    "--ff-frame-aspect": frameAspect,
                    // The full room, and SEPARATELY how much of it the frame
                    // yields while editing. Kept as two values so CSS can decide
                    // whether the yield is needed at all — on a tall window both
                    // fit and the frame should not move. See .ff-stage-cap.
                    "--ff-stage-full": `calc(100vh - ${STAGE_VIEWPORT_RESERVE_PX}px)`,
                    "--ff-share-editing": editorOpen ? STAGE_EDITING_SHARE : 1,
                  } as React.CSSProperties
                }
              >
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
              {/* Replaces the old Sections panel. Same information, at the place
                  it applies: the frame is the control, so the instruction belongs
                  under the frame rather than in a list restating what is already
                  on screen. Hidden once a section is open, since by then the user
                  has plainly found it. */}
              {!editorOpen && (
                <p className="ff-stage-hint">
                  Tap a banner or a side panel on the frame to edit it.
                </p>
              )}
            </div>
            {/* The editor's OWN scroll pane. `min-h-0` is load-bearing: a flex child
                defaults to `min-height: auto`, which refuses to shrink below its
                content, and the pane would push the column past the viewport instead
                of scrolling — the clipped-editor bug in a new costume. `-mx-1 px-1`
                keeps panel focus rings from being shaved off by the overflow. */}
            <div className="order-2 min-w-0 relative z-10 lg:order-none lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:-mx-1 lg:px-1">
              <SectionEditor />
            </div>
          </div>
        </main>
      </DndProvider>

      {/* The hover LOUPE was mounted HERE and is switched off — it read as clunky in
          use. `components/frame/FrameLoupe.tsx` is kept and working; its header
          carries the two constraints that are expensive to rediscover (it must be a
          sibling of DndProvider, and it must track a wrapper around FrameCanvas
          rather than the padded stage) and the exact block to paste back. */}

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
export function SchoolBuilder({ kit, hero }: { kit?: SchoolKit; hero?: React.ReactNode }) {
  // The school store is configured two ways:
  //  - `frameConfig`: the school frame is ONE printable geometry (it must fit the
  //    eufyMake E1 bed), so the store owns it outright — initial state, and it wins
  //    over any stale persisted copy on hydrate. No component seeds it.
  //  - `migrateExtra`: a school-ONLY persist migration. The wing trim (3 tile columns
  //    per side → 1, for the E1 bed) invalidated slot ids that remain perfectly valid
  //    on /build, so it cannot live in the shared migration.
  //
  // A KIT parameterizes, never forks: same engine, same geometry, same migrations —
  // the kit only supplies seeds (colors, banner text) and a per-school persist key.
  // The scoped key is what lets a family with kids at two schools hold two designs,
  // and it keeps /lab/school's original key untouched for existing users.
  const [store] = useState(() =>
    createDesignStore(kit ? `${SCHOOL_PERSIST_KEY}:${kit.slug}` : SCHOOL_PERSIST_KEY, {
      frameConfig: SCHOOL_FRAME_CONFIG,
      migrateExtra: migrateSchoolDesign,
      // Top/bottom start as TEXT banners — kit-branded when there is a kit. Initial
      // state only; a returning user's persisted sections still win.
      sections: kit ? kitSections(kit) : SCHOOL_DEFAULT_SECTIONS,
      initialSlots: kit?.seedSlots,
      initialBrand: kit
        ? {
            frameColor: kit.colors.frame,
            tileFieldColor: kit.colors.tileField,
            rimColor: kit.colors.rim,
          }
        : undefined,
    })
  );
  return (
    <DesignStoreProvider store={store}>
      <SchoolDesigner kit={kit} hero={hero} />
    </DesignStoreProvider>
  );
}
