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

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { FirstRunTour } from "./FirstRunTour";
import {
  BANNER_LINES,
  BUYERS,
  DEFAULT_BUYER,
  bannerTagline,
  getBuyer,
  yearsFor,
  type BannerLineId,
  type BuyerId,
} from "@/data/frame-buyers";
import { SCHOOL_CHECKOUT_OPEN } from "@/config/offers";
import { presetsFor, presetBlurb, getPreset, layPreset as layPresetOn, SCHOOL_PRESETS, type SchoolPreset } from "@/data/school-presets";
import { schoolVariant, type SchoolVariantId } from "@/data/school-variants";
import { schoolStoreOptions } from "@/data/school-store";
import { GraduateExpress } from "./GraduateExpress";
import { SendDesignSheet } from "./SendDesignSheet";
import type { OrderContact } from "@/lib/order/order-contact";
import {
  useDesignStore,
  useDesignStoreApi,
  DesignStoreProvider,
  createDesignStore,
  onPersistQuotaExceeded,
} from "@/stores/design-store";
import { composeSchoolFrame, composeSchoolPanels, schoolDesignOf } from "@/lib/utils/compose-school-frame";
import { makeZip, dataUrlToBytes, type ZipEntry } from "@/lib/utils/zip";
import { buildPanelPartsList } from "@/lib/order/parts-list";
import { DndProvider } from "./DndProvider";
import { FrameCanvas, type FrameCanvasHandle } from "@/components/frame/FrameCanvas";
import { TilePalette } from "@/components/tiles/TilePalette";
import { SCHOOL_SURFACED_SET_IDS, getPiece } from "@/data/sets";
import { kitMarkIds, kitMarkPieces } from "@/data/sets/school-marks";
import { FrameColorPicker } from "./FrameColorPicker";
import { SectionEditor } from "./SectionEditor";
import { UploadPhotoButton } from "./UploadPhotoButton";
import { UploadRightsGate } from "./UploadRightsGate";
import { designHasUploadedArt, isCurrentAttestation } from "@/lib/order/artwork-rights";
import { SchoolBrandImport } from "./SchoolBrandImport";
import { SnappetRecropModal } from "./SnappetRecropModal";
import { SnappetSizeControl } from "./SnappetSizeControl";
import { ArmedBanner } from "@/components/tiles/ArmedBanner";
import { usePaletteStore } from "@/stores/palette-store";
import { StateSelector } from "@/components/frame/StateSelector";
import {
  SCHOOL_FRAME_CONFIG,
  getRenderHeightInches,
  getTotalWidthInches,
} from "@/lib/constants/frame";
import { writePersonOnBanner } from "@/lib/utils/school-banner";
import { ACTIVITIES, ACTIVITY_GROUPS, activityOnFrame } from "@/data/activities";
import { KIT_BOTTOM_TAGLINE, schoolPlatePhoto, type SchoolKit } from "@/data/school-kits";
import type { BannerPreview } from "@/lib/types";
import type { SnappetPreview } from "@/lib/utils/snappet";

/** The school builder's own persist key — its design never touches /build's. */
export const SCHOOL_PERSIST_KEY = "festive-frames-school-v1";

/**
 * Does this browser already hold a design under `key`? Read from the blob, not the
 * store: a seeded first visit and a restored design look identical in the store.
 *
 * The key MUST be the one the store persists under. This used to read the bare
 * SCHOOL_PERSIST_KEY while every /s/<slug> store persists under
 * `<key>:<variant>:<slug>`, so "We restored your last design" never appeared on a
 * parent's builder.
 */
function hasSavedDesign(key: string): boolean {
  try {
    return localStorage.getItem(key) != null;
  } catch {
    return false;
  }
}

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
  // The start-from-a-design layouts for THIS frame, anchored on its own grid.
  // Handed in by the variant (see data/school-variants) rather than inferred from
  // the config: the flush frame has a keystone like the slim one and a different
  // grid from both, so "has a bottomTab" could not tell them apart.
  presets = SCHOOL_PRESETS,
  brandScan,
  operatorTools = false,
  persistKey = SCHOOL_PERSIST_KEY,
}: {
  kit?: SchoolKit;
  hero?: React.ReactNode;
  presets?: SchoolPreset[];
  /** Show the website scanner FOR THIS SCHOOL — see the mount below. */
  brandScan?: { slug: string; heading?: string; blurb?: React.ReactNode };
  /**
   * The production print-file export. An OPERATOR tool: it renders and downloads
   * the four panel PNGs as a zip. On a parent's builder it was one tap from the
   * front door, styled as if disabled while working perfectly, and handed a phone
   * a zip nobody asked for. Only the /lab routes pass this; a parent's design
   * reaches production through "Send my design", which carries the same files.
   */
  operatorTools?: boolean;
  /** The key this design persists under — the store's own (see the wrapper
   *  below). Read to tell a restored design from a first visit. */
  persistKey?: string;
} = {}) {
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
  // A tile is armed for tap-to-place: the phone's pinned status line says so.
  const armed = usePaletteStore((s) => s.selectedPieceId) != null;

  // The header's real height, so the phone's pinned frame sits exactly under it
  // whatever the header wraps to — measured, not a second copy of its padding.
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerH, setHeaderH] = useState(0);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
  // hydration-safe by construction. Rendered as a FIXED first-run sheet (see
  // FirstRunTour), not an inline band: as a band it cost three lines at the top
  // of a phone screen, on the one view where vertical space is the whole budget.
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
  // WHO IS BUYING. The intake used to be third-person throughout, which assumed
  // a parent buying for a student — one real case out of several. See
  // data/frame-buyers.ts for why the wording, the year range and the tagline all
  // have to move together. Remembered, because an alum should not have to say so
  // twice.
  const [buyerId, setBuyerId] = useState<BuyerId>(DEFAULT_BUYER);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("msf-buyer");
      if (saved) setBuyerId(getBuyer(saved).id);
    } catch {}
  }, []);
  const buyer = getBuyer(buyerId);
  const chooseBuyer = (id: BuyerId) => {
    const next = getBuyer(id);
    setBuyerId(id);
    // A year picked from one range is meaningless in another: 2029 is not an
    // alumni class and 1994 is not an upcoming one.
    const year = next.yearRange !== buyer.yearRange ? "" : kidYear;
    if (year !== kidYear) setKidYear("");
    // The tap puts the buyer's own line on the frame AT ONCE — PROUD PARENT,
    // PROUD GRANDPARENT, ALUMNI, FACULTY & STAFF. It used to change only the
    // form's labels, so "Who's it for?" looked like it did nothing (owner,
    // 2026-09-24). A line with nothing to say yet (Me, before a class year is
    // picked) puts the kit's own tagline back rather than leaving another
    // buyer's words on the frame.
    setLineChoice(null);
    const tagline =
      bannerTagline(next.lines[0], { year: next.yearLabel ? year : undefined }) ||
      kit?.banners.tagline ||
      KIT_BOTTOM_TAGLINE;
    writePerson(storeApi.getState(), { tagline });
    try { localStorage.setItem("msf-buyer", id); } catch {}
  };

  const savedAtLoadRef = useRef<boolean | null>(null);
  /** Whether this browser held a design when the page LOADED — read once, before
   *  anything on the page has written the blob. */
  const savedAtLoad = () => (savedAtLoadRef.current ??= hasSavedDesign(persistKey));

  // THE GRADUATE PLATE IS THE PRIMARY PATH. Open by default and dismissed for
  // good once someone chooses to customize, because the builder is what they
  // wanted at that point and re-offering the shortcut is noise.
  //
  // NEVER over a restored design. Opening the card lays the graduate preset, so a
  // parent who had built a frame and never tapped "customize" lost it on every
  // reload — a phone reopening an evicted tab, Safari restoring one. A browser
  // that already holds a design has chosen its frame; the card is for arrivals.
  const [expressOpen, setExpressOpen] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem("msf-express-done") && !savedAtLoad()) setExpressOpen(true);
    } catch {}
    // Mount only; `savedAtLoad` is fixed for the page's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const leaveExpress = () => {
    setExpressOpen(false);
    try { localStorage.setItem("msf-express-done", "1"); } catch {}
  };

  const [activePreset, setActivePreset] = useState<string | null>(null);
  // "What they do" was tapped before an activity was chosen. The tap cannot build
  // the frame yet (it will not guess an activity), so it waits: picking one in the
  // activity menu finishes the job. Without this the tap only focused a select,
  // which a phone does not even open, and the frame never changed.
  const [awaitingActivity, setAwaitingActivity] = useState(false);
  const [kidName, setKidName] = useState("");
  const [kidActivity, setKidActivity] = useState("");
  // A restored design keeps its activity: read it back off the badges once the
  // (synchronously hydrated) store is there, so the menu and "What they do" agree
  // with the frame after a reload. Never overrides a choice made this visit.
  useEffect(() => {
    const found = activityOnFrame(Object.values(storeApi.getState().slots).map((t) => t?.pieceId));
    if (found) setKidActivity((a) => a || found);
  }, [storeApi]);
  const [kidYear, setKidYear] = useState("");
  // Jersey (or chair, or roster) number. Belongs to the STUDENT alongside the year,
  // not to whichever design is picked, so it lives here and rides the tagline.
  const [kidNumber, setKidNumber] = useState("");
  // THE BANNER LINE — "CLASS OF 2027", "SENIOR", "#12", "PROUD PARENT", or their
  // own words — one tap each. Null means the buyer's default (its first line),
  // and a choice the new buyer does not offer falls back to it too.
  const [lineChoice, setLineChoice] = useState<BannerLineId | null>(null);
  const [lineText, setLineText] = useState("");
  const line: BannerLineId | null =
    lineChoice && buyer.lines.includes(lineChoice) ? lineChoice : (buyer.lines[0] ?? null);
  /** The tagline the intake currently describes, with any field overridden — the
   *  ONE place the intake's fields become words on the banner. */
  const taglineNow = (
    over: { line?: BannerLineId | null; year?: string; number?: string; text?: string } = {},
  ) => {
    const id = over.line !== undefined ? over.line : line;
    return bannerTagline(id, {
      year: buyer.yearLabel ? (over.year ?? kidYear) : undefined,
      // Only a line that ASKS for a number prints one: a number typed under "#12"
      // and then left behind by tapping "Senior" must not ride along unseen.
      number: id && BANNER_LINES[id].asks === "number" ? (over.number ?? kidNumber).trim() : undefined,
      text: over.text ?? lineText,
    });
  };

  // Welcome-band chips deep-link presets via #preset=<pieceId>. On a tap: lay the
  // frame's own activity design (or the school design for a "generic" chip),
  // preselect the activity, and show the frame it built.
  //
  // It used to place a hard-coded list of slot ids from the retired 14 x 8 grid
  // at a hard-coded 2x2, so on the flush frame most ids did not exist and were
  // silently dropped: a lopsided frame with the parent's activity nowhere on it.
  // The preset is computed against the variant's own grid, and placement asks
  // the square rule for every span.
  //
  // THE HASH IS CONSUMED. It used to stay in the URL, so every reload — a phone
  // reopening an evicted tab, Safari restoring one, back/forward — laid the chip
  // again over the saved design and silently wiped the parent's edits and
  // photos. And because the hash never changed, tapping the same chip a second
  // time fired no hashchange and did nothing. Clearing it fixes both: a reload
  // has nothing to replay, and the next tap on any chip is a real change.
  //
  // A chip changes the BADGES; the banner line stays the parent's. Laying a
  // preset replaces badges only, and the intake's line (when it has one) is
  // written through the same `writePerson` + `taglineNow` every other preset
  // uses. After a reload the intake is empty and writes nothing, so a restored
  // design keeps its own line.
  const applyChipRef = useRef<(pieceId: string) => void>(() => {});
  useEffect(() => {
    applyChipRef.current = (pieceId) => {
      const generic = pieceId === "generic";
      const preset = getPreset(generic ? "school" : "athlete", presets);
      if (preset) {
        layPreset(preset, generic ? null : pieceId);
        writePerson(storeApi.getState(), { name: kidName, tagline: taglineNow() });
        setActivePreset(preset.id);
        setAwaitingActivity(false);
      }
      if (!generic) setKidActivity(pieceId);
      // The chip chose the customize path, so the graduate card steps aside for
      // this visit (not for good — that is `leaveExpress`, the parent's own tap)
      // and the intake below shows the activity it just picked.
      setExpressOpen(false);
      // Show the FRAME the tap just built. It used to focus the name field, which
      // on a phone threw the keyboard over the very frame the chip had built — and
      // the name is optional now.
      document
        .querySelector<HTMLElement>(".ff-stage")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
  });
  useEffect(() => {
    const fromHash = (arriving: boolean) => {
      const m = /#preset=([^&]+)/.exec(window.location.hash);
      if (!m) return;
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      // A hash present on ARRIVAL came from outside the page (an old link, a
      // restored tab from before the hash was consumed). It may lay a frame on a
      // first visit, never over a design this browser already holds.
      if (arriving && savedAtLoad()) return;
      applyChipRef.current(decodeURIComponent(m[1]));
    };
    fromHash(true);
    const onHashChange = () => fromHash(false);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
    // Mount only: `savedAtLoad` is fixed for the page's life, and the applier is
    // read through its ref so the listener always runs the current one.
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
  // A submit held at the rights gate. The gate normally fires at UPLOAD time, so
  // this is the second door: a design that already carried uploaded art before the
  // gate existed, or one whose accepted wording is no longer current, must not
  // reach production unattested just because it predates the rule.
  const [rightsFor, setRightsFor] = useState<null | "submit" | "buy">(null);
  const acceptArtworkRights = useDesignStore((s) => s.acceptArtworkRights);

  /**
   * True when this design may be sent. False means the gate is now open and the
   * caller should return — accepting it re-runs the action it interrupted.
   *
   * Reads the store FRESH rather than subscribing: `acceptArtworkRights` is a
   * synchronous zustand set, so the re-run below sees the acceptance immediately,
   * and a subscription here would re-render the whole builder for a value only
   * ever read on a click.
   */
  const artworkRightsSettled = (what: "submit" | "buy"): boolean => {
    const s = storeApi.getState();
    if (!designHasUploadedArt(s.slots) || isCurrentAttestation(s.artworkRights)) return true;
    setRightsFor(what);
    return false;
  };
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
      // Every brand colour the screen paints with — see `schoolDesignOf`.
      const design = schoolDesignOf(s);
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
  //
  // NOTHING SENDS FROM ONE TAP. Every Send (the header's and the graduate card's)
  // opens the send sheet, which renders the frame, asks who to reply to, and has
  // the one button that posts. The render starts the moment the sheet opens, so
  // the preview the parent approves IS the file that is sent — the design cannot
  // change behind a modal sheet.
  const [sendSheet, setSendSheet] = useState<
    | null
    | {
        rendered: { printPng: string; panels: { name: string; dataUrl: string }[] } | null;
        failed: boolean;
        error: string | null;
      }
  >(null);
  const sendRun = useRef(0);

  const openSend = async () => {
    if (!artworkRightsSettled("submit")) return;
    if (submitting || exporting || sendSheet) return;
    setSubmitState(null);
    const run = ++sendRun.current;
    setSendSheet({ rendered: null, failed: false, error: null });
    try {
      // Every brand colour the screen paints with — see `schoolDesignOf`.
      const design = schoolDesignOf(storeApi.getState());
      // The assembled sheet is the OVERVIEW; the 4 panel PNGs are the print files
      // (each positioned separately on the bed — the seams are hard to hit assembled).
      const [printPng, panelPngs] = await Promise.all([
        composeSchoolFrame(design),
        composeSchoolPanels(design),
      ]);
      if (run !== sendRun.current) return; // closed (and maybe reopened) meanwhile
      setSendSheet((cur) =>
        cur && printPng
          ? { ...cur, rendered: { printPng, panels: panelPngs.map((p) => ({ name: p.id, dataUrl: p.dataUrl })) } }
          : cur && { ...cur, failed: true },
      );
    } catch {
      if (run === sendRun.current) setSendSheet((cur) => cur && { ...cur, failed: true });
    }
  };

  const closeSend = () => {
    sendRun.current++;
    setSendSheet(null);
  };

  const handleSubmit = async (contact: OrderContact) => {
    const rendered = sendSheet?.rendered;
    if (!rendered || submitting) return;
    setSubmitting(true);
    setSendSheet((cur) => cur && { ...cur, error: null });
    try {
      const s = storeApi.getState();
      const { printPng, panels } = rendered;
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
        // The artwork's provenance travels WITH the order, not in a separate
        // ledger: the production inbox is where somebody decides to print this.
        body: JSON.stringify({
          printPng,
          panels,
          designName: s.designName,
          partsList,
          school: kit?.slug,
          artUploaded: designHasUploadedArt(s.slots),
          artworkRights: s.artworkRights,
          // Who to reply to — required, and checked again by the route.
          contact,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string; error?: string };
      if (res.ok && data.ok) {
        closeSend();
        setSubmitState({ kind: "ok", msg: `Your design is on its way to our team. We'll reply to ${contact.email}.` });
      } else if (data.reason === "email-not-configured") {
        closeSend();
        setSubmitState({
          kind: "not-configured",
          msg: "Sending is not switched on yet, so nothing was sent.",
        });
      } else {
        // Stays in the sheet, with what they typed, so a retry is one tap.
        setSendSheet((cur) => cur && { ...cur, error: data.error || "Couldn't send your design right now. Please try again." });
      }
    } catch {
      setSendSheet((cur) => cur && { ...cur, error: "Something went wrong sending your design. Please try again." });
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
  /**
   * Put the PERSON on the bottom banner and move the SCHOOL up to the top —
   * `writePersonOnBanner` (lib/utils/school-banner.ts), shared with the pilot
   * sample sheets so a sample can never say what a parent's frame would not.
   *
   * It writes through setSectionText, not setSectionMode: setSectionMode is the
   * EDITOR's switch — it selects the banner, so every chip tap and every
   * keystroke in the express opened the section editor under the frame
   * (shrinking it on a phone) and drew the gold selection ring round a banner
   * nobody tapped.
   */
  const writePerson = (
    api: ReturnType<typeof storeApi.getState>,
    person: { name?: string; tagline?: string },
  ) => writePersonOnBanner(api, kit, person);


  // The school's mascot and crest as badge ids — see `kitMarkIds`.
  const schoolMarks = useMemo(() => kitMarkIds(kit), [kit]);
  const mascotPieceId = schoolMarks.mascot;

  /**
   * APPLY A FINISHED DESIGN. The one-tap path, and the one most people will use.
   *
   * Clears first: a preset is a whole frame, not a sprinkle, and leaving the
   * previous badges underneath produces a hybrid nobody chose. The intake's
   * activity fills a preset's ACTIVITY positions — on the shipping (flush) frame
   * only "What they do" has any, so "Graduate" and "Just the school" lay their own
   * badges and the chosen activity is NOT on them. (The retired live frame's
   * graduate run carried it; the flush one does not.)
   */
  const activityRef = useRef<HTMLSelectElement>(null);

  /** Clear the frame and lay a preset's badges on it — the shared `layPreset`
   *  every one-tap path uses, with this school's marks. */
  const layPreset = (preset: SchoolPreset, activity: string | null) =>
    layPresetOn(storeApi.getState(), preset, activity, schoolMarks);

  const applyFramePreset = (preset: SchoolPreset, activity: string = kidActivity) => {
    // A design that is ABOUT the sport must not guess one. Applying it with
    // nothing chosen used to drop a stock trophy in, which is the generic result
    // the preset exists to avoid. It waits for the activity menu instead.
    if (preset.needsActivity && !activity) {
      setAwaitingActivity(true);
      activityRef.current?.focus();
      activityRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    setAwaitingActivity(false);
    layPreset(preset, activity || null);
    const api = storeApi.getState();
    // The BUYER owns this line, not the preset: a grandparent applying
    // "Graduate" wants their relationship on it, which is the whole reason
    // they are buying a second frame for a student who already has one.
    writePerson(api, { name: kidName, tagline: taglineNow() });
    setActivePreset(preset.id);
  };

  const gradYears = yearsFor("upcoming");
  useEffect(() => {
    if (!expressOpen) return;
    const preset = getPreset("graduate", presets);
    if (!preset) return;
    layPreset(preset, null);
    if (!kidYear) setKidYear(String(gradYears[0]));
    // Once, on open. Deliberately not keyed on the name or the year: those only
    // move the banner, handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expressOpen, mascotPieceId]);

  // The banner follows the fields live, so the frame on screen is always the
  // frame the Send button will send.
  //
  // THE NAME IS OPTIONAL. Left blank, the big line is the school's mascot — the
  // kit's own seed — so "WILDCATS / CLASS OF 2027" is a finished frame. That also
  // covers a name typed and then erased: the banner goes back to the mascot
  // rather than keeping the last letter that was there.
  useEffect(() => {
    if (!expressOpen) return;
    const api = storeApi.getState();
    const name = kidName.trim();
    writePerson(api, { name, tagline: taglineNow() });
    if (!name && kit) api.setSectionText("bottom", { text: kit.banners.bottom });
    // writePerson and taglineNow are recreated every render and depending on them
    // would run this on every keystroke of every other field; everything they read
    // is listed here or is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expressOpen, kidName, kidYear, kidNumber, line, lineText, buyer, storeApi]);

  /**
   * ONE TAP on a banner line puts it on the frame — PROUD PARENT, SENIOR, #12 —
   * with no second "See it on the frame" step. Also used as the year, number and
   * own-words fields change, so the banner follows them the way it follows the
   * express card. A line with nothing to say yet (the number chip before a number
   * is typed, with no year) leaves the banner as it is.
   */
  const writeLine = (over: Parameters<typeof taglineNow>[0]) => {
    const tagline = taglineNow(over);
    if (tagline) writePerson(storeApi.getState(), { tagline });
  };

  const handleBuy = async () => {
    if (!artworkRightsSettled("buy")) return;
    if (buying || submitting || exporting) return;
    setBuying(true);
    setSubmitState(null);
    try {
      const s = storeApi.getState();
      // Every brand colour the screen paints with — see `schoolDesignOf`.
      const design = schoolDesignOf(s);
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
          artUploaded: designHasUploadedArt(s.slots),
          artworkRights: s.artworkRights,
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
  // SSR value (false) instead of rendering the banner then taking it away. Fixed
  // means MEMOISED (`savedAtLoad`): the store writes its blob on the first edit of
  // a first visit, and a live read would then announce a restore that never was.
  const wasRestored = useSyncExternalStore(() => () => {}, savedAtLoad, () => false);
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
    <div
      className="workbench-bg min-h-screen flex flex-col"
      style={{ "--ff-header-h": `${headerH}px` } as React.CSSProperties}
    >
      {/* Header — school context + the plate state picker (the real StateSelector,
          wired to the shared store). No storefront/order flow.

          It used to be a solid-ink bar, which made it the highest-contrast object on
          the page at 15.11:1 — louder than the product it exists to frame. A white
          bar with a hairline puts that contrast budget back where it belongs.

          The "Internal prototype · fork of the live builder" strapline is gone
          rather than restyled: it is dev scaffolding, and this page is shown to
          parents deciding whether to spend money. */}
      <header
        ref={headerRef}
        className="ff-app-header sticky top-0 z-40 flex flex-nowrap items-center justify-between gap-2 border-b border-[var(--ff-line)] bg-[var(--ff-card)] px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-2.5"
        // A notch or a landscape phone's sensor housing never sits on the controls.
        style={{
          paddingTop: "max(6px, env(safe-area-inset-top))",
          paddingLeft: "max(12px, env(safe-area-inset-left))",
          paddingRight: "max(12px, env(safe-area-inset-right))",
        }}
      >
        <h1 className="ff-h1 flex min-w-0 items-center gap-1.5">
          {/* The owner's logo, REVERSED (paper + brass) for the dark glass header —
              the same file as the /school hero. The alt text is the heading. */}
          <Image
            src="/brand/msf-logo-reverse.png"
            alt="MySchoolFrame"
            width={800}
            height={410}
            priority
            // 30px tall on a phone (crisp at 3x), 40px from sm up, where a 1x
            // screen drew "FRAME" about 6px tall from a 64px source.
            sizes="(min-width: 640px) 160px, 64px"
            className="h-[30px] w-auto shrink-0 sm:h-10"
          />
          {kit && <span className="ff-h1-school min-w-0 truncate"> · {kit.shortName} {kit.mascot}</span>}
        </h1>
        <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1.5 sm:gap-2">
          <span className="ff-label hidden sm:block">Plate</span>
          <StateSelector theme="header" />
          {/* Two actions, ONE of them primary. Exporting a file is the power-user
              path; sending the design to be made is the thing this page is for. */}
          {/* Production tool, not a customer action: on the lab routes only (see
              `operatorTools`). The result banner still carries the real download
              link (iOS needs a tappable <a>), so the flow past this button is
              unchanged. Labelled, and never dimmed as if it were disabled. */}
          {operatorTools && <button
            type="button"
            onClick={handleExportPrint}
            disabled={exporting}
            title="Export print files (production)"
            aria-label="Export print files"
            className="ff-btn ff-btn-secondary ff-btn-sm shrink-0 whitespace-nowrap max-lg:min-h-11"
          >
            {exporting ? (
              <span className="animate-spin inline-block" aria-hidden>⚙</span>
            ) : (
              <>
                <span aria-hidden>⚙</span>
                <span className="hidden sm:inline"> Print files</span>
              </>
            )}
          </button>}
          {/* Send is the PRIMARY action while checkout is parked, and steps back to
              secondary the moment Buy exists. Derived from the one switch, so
              opening checkout is never a second edit someone forgets to make. */}
          <button
            type="button"
            onClick={() => void openSend()}
            disabled={submitting || exporting || buying}
            title="Send your finished design to our team without ordering"
            aria-haspopup="dialog"
            className={`ff-btn ${SCHOOL_CHECKOUT_OPEN ? "ff-btn-secondary" : "ff-btn-primary"} ff-btn-sm shrink-0 whitespace-nowrap max-lg:min-h-11`}
          >
            {submitting ? (
              "Sending..."
            ) : (
              <>
                Send<span className="hidden sm:inline"> my</span> design
              </>
            )}
          </button>
          {/* Direct checkout is PARKED until the owner confirms the placeholder
              pricing. The switch and the reasoning live together in
              config/offers.ts (SCHOOL_CHECKOUT_OPEN) rather than as a bare `false`
              here, so the reason travels with the code that obeys it. */}
          {SCHOOL_CHECKOUT_OPEN && (
            <button
              type="button"
              onClick={handleBuy}
              disabled={buying || submitting || exporting}
              title="Order this frame, secure checkout"
              className="ff-btn ff-btn-primary ff-btn-sm shrink-0 whitespace-nowrap max-lg:min-h-11"
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
          <button type="button" onClick={() => setSubmitState(null)} className="ff-chip shrink-0 max-lg:min-h-11">
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
            for next time. A smaller image may help, or you&apos;re welcome to{" "}
            {SCHOOL_CHECKOUT_OPEN ? "order this design now" : "send us this design now"} so
            nothing gets lost.
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
        {/* A FLEX column on a phone, the two-column grid on a desktop. The
            difference matters for one reason: a sticky element can only stick
            within its containing block, and a one-column grid gives every item a
            row of its own — the pinned frame would have unstuck the moment its
            own row scrolled past. In a flex column the containing block is all of
            <main>, so the frame stays pinned while every tool below it scrolls. */}
        <main className="flex-1 flex flex-col lg:grid lg:grid-cols-[340px_minmax(0,1fr)] gap-4 px-4 pb-4 pt-0 mx-auto w-full max-w-[1560px] lg:items-start">
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
            {/* Brand scan is the GENERIC builder's school picker. An AUTHORED kit
                page already IS the school — showing "paste your school's website"
                there undercuts the whole personalized pitch.
                A THIN kit is the third case and the reason `brandScan` exists: the
                page knows which school it is and does NOT know its colours, so the
                ask is neither generic nor redundant, and what it finds is kept for
                every parent from that school after this one. */}
            {brandScan ? (
              <SchoolBrandImport
                slug={brandScan.slug}
                heading={brandScan.heading}
                blurb={brandScan.blurb}
              />
            ) : (
              !kit && <SchoolBrandImport />
            )}
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
            {/* NOT sticky on a phone. The comment above promises "Mobile keeps
                ordinary flow: one column, no pinning" and this element pinned
                anyway: with the graduate card inside it the dock measured 702px
                of an 844px viewport, so the badge tray rendered UNDERNEATH it and
                `elementFromPoint` on every badge returned the card's own button.
                A parent could not tap a badge on a first visit — the core loop
                was blocked on the one device the QR is for. Pinning is the
                desktop column's job (`lg:sticky` on the parent). */}
            {/* `contents` on a phone: its children become items of <main>'s flex
                column, so the pinned stage below is stuck against <main> and not
                against this box, which ends right under the frame. */}
            <div className="contents lg:flex lg:flex-col lg:gap-3 lg:order-none lg:w-full lg:min-w-0 lg:shrink-0">
              {/* Make-it-theirs intake: the first thing a parent touches. Three
                  quick fields -> the frame is suddenly about THEIR kid. Writes
                  ordinary store state, live: every control updates the frame as it changes. */}
              {/* THE PRIMARY PATH. Two fields and a button, above the frame it
                  is describing. The builder's own intake is the "or customize"
                  route and stays out of the way until asked for — offering both
                  at once is offering a choice nobody came to make. */}
              {/* On a phone the card comes AFTER the frame (`max-lg:order-1`: past
                  the order-0 stage, before the order-2 tray). Above it, a parent
                  arriving from a QR scrolled 1.7 screens before seeing any frame,
                  and the card's fields now sit under the pinned frame they edit.
                  Desktop keeps it above the stage in the pinned column. */}
              {expressOpen && (
                <div className="max-lg:order-1">
                <GraduateExpress
                  schoolLabel={kit?.shortName ?? null}
                  name={kidName}
                  onName={setKidName}
                  year={kidYear}
                  onYear={setKidYear}
                  years={gradYears}
                  onSend={() => void openSend()}
                  onCustomize={leaveExpress}
                  busy={buying || submitting || exporting}
                />
                </div>
              )}

              <div data-intake hidden={expressOpen} className="flex flex-wrap items-end gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2.5 shadow-sm">
                {/* WHO IS BUYING. One row, five answers, and it rewords everything
                    below it. A senior buying for their own car, a grandparent, an
                    alum and a coach were all being asked for "their last name" and
                    a class year from the next four. */}
                <div className="flex w-full flex-col gap-1">
                  <span className="text-[12px] font-medium text-stone-700">Who&apos;s it for?</span>
                  <div role="radiogroup" aria-label="Who is this frame for?" className="flex flex-wrap gap-1.5">
                    {BUYERS.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        role="radio"
                        aria-checked={b.id === buyerId}
                        onClick={() => chooseBuyer(b.id)}
                        className={
                          "min-h-[44px] rounded-full border px-3 text-[13px] font-semibold transition-colors sm:min-h-[32px] " +
                          (b.id === buyerId
                            ? "border-stone-900 bg-stone-900 text-white"
                            : "border-stone-300 bg-white text-stone-700 hover:border-stone-400")
                        }
                      >
                        {b.chip}
                      </button>
                    ))}
                  </div>
                </div>
                {/* START FROM A DESIGN. The path most people take, and until now
                    the only "preset" was an invisible #preset= deep link while the
                    first-run copy promised one you could pick. Ordered for the
                    buyer: a grandparent shopping a graduation gift sees Graduate
                    first, an alum sees the crest. */}
                <div className="flex w-full flex-col gap-1">
                  <span className="text-[12px] font-medium text-stone-700">
                    Start from one of our designs<span className="font-normal text-stone-500">, or build your own below</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {presetsFor(buyerId, presets).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyFramePreset(preset)}
                        aria-pressed={activePreset === preset.id}
                        title={presetBlurb(preset, kidActivity || null, schoolMarks, (id) => getPiece(id)?.name)}
                        className={
                          "flex min-h-[44px] items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-semibold transition-colors sm:min-h-[38px] " +
                          (activePreset === preset.id
                            ? "border-amber-500 bg-amber-50 text-stone-900"
                            : "border-stone-300 bg-white text-stone-800 hover:border-stone-400")
                        }
                      >
                        <span aria-hidden="true">{preset.icon}</span>
                        {preset.name}
                      </button>
                    ))}
                  </div>
                  {awaitingActivity && !kidActivity && (
                    <p role="status" className="text-[12px] text-stone-600">
                      Pick what they do just below, and we&apos;ll build the frame around it.
                    </p>
                  )}
                </div>
                {/* ACTIVITY AND YEAR FIRST, the name last and optional. The
                    owner's call: a frame leads with Class of 2027, #12, Senior,
                    Orchestra or Proud Parent, not the student's full name. */}
                <label className="flex flex-col gap-1 text-[12px] font-medium text-stone-700 grow basis-32">
                  {buyer.activityLabel}
                  <select
                    ref={activityRef}
                    name="kid-activity"
                    value={kidActivity}
                    onChange={(e) => {
                      const next = e.target.value;
                      setKidActivity(next);
                      // LIVE: picking an activity builds the "What they do" frame
                      // around it at once — no "See it on the frame" step, which the
                      // owner found clunky (2026-09-24). Laying a preset is ONE undo
                      // step, so a parent who had rearranged badges gets them back
                      // with a single Undo.
                      const athlete = getPreset("athlete", presets);
                      if (next && athlete) applyFramePreset(athlete, next);
                    }}
                    className="h-11 rounded-lg border border-stone-300 bg-white px-2 text-[16px] text-stone-900 sm:h-9 sm:text-[14px]"
                  >
                    <option value="">Choose an activity…</option>
                    {/* Grouped rather than one flat run of forty. A native
                        select on a phone shows the group headers, which is the
                        difference between scanning and scrolling. */}
                    {ACTIVITY_GROUPS.map((group) => (
                      <optgroup key={group} label={group}>
                        {ACTIVITIES.filter((a) => a.group === group).map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                {buyer.yearLabel && (
                  <label className="flex flex-col gap-1 text-[12px] font-medium text-stone-700 basis-28">
                    {buyer.yearLabel}
                    <select
                      name="kid-year"
                      value={kidYear}
                      onChange={(e) => {
                        setKidYear(e.target.value);
                        writeLine({ year: e.target.value });
                      }}
                      className="h-11 rounded-lg border border-stone-300 bg-white px-2 text-[16px] text-stone-900 sm:h-9 sm:text-[14px]"
                    >
                      <option value="">Year…</option>
                      {/* The RANGE follows the buyer. Current students only for a
                          parent or a senior; sixty years back for an alum, who
                          previously could not enter their own class at all. */}
                      {yearsFor(buyer.yearRange).map((y) => (
                        <option key={y}>{y}</option>
                      ))}
                    </select>
                  </label>
                )}
                {/* THE BANNER LINE, one tap each. The list is the buyer's own
                    (data/frame-buyers.ts), so a grandparent is offered PROUD
                    GRANDPARENT first and staff only their own words. */}
                <div className="flex w-full flex-col gap-1">
                  <span className="text-[12px] font-medium text-stone-700">Banner line</span>
                  <div role="radiogroup" aria-label="Line on the banner" className="flex flex-wrap gap-1.5">
                    {buyer.lines.map((id) => {
                      const option = BANNER_LINES[id];
                      const label = id === "class" && kidYear ? `Class of ${kidYear}` : option.chip;
                      return (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={line === id}
                          onClick={() => {
                            setLineChoice(id);
                            writeLine({ line: id });
                          }}
                          className={
                            "min-h-[44px] rounded-full border px-3 text-[13px] font-semibold transition-colors sm:min-h-[32px] " +
                            (line === id
                              ? "border-stone-900 bg-stone-900 text-white"
                              : "border-stone-300 bg-white text-stone-700 hover:border-stone-400")
                          }
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* THE NUMBER, for ANY activity. It used to appear only for the
                    jersey sports; a cellist has a chair and a runner a bib, and
                    "#12" is one of the lines the owner wants to lead with. */}
                {line && BANNER_LINES[line].asks === "number" && (
                  <label className="flex flex-col gap-1 text-[12px] font-medium text-stone-700 basis-20">
                    Number
                    <input
                      type="text"
                      inputMode="numeric"
                      name="kid-number"
                      value={kidNumber}
                      onChange={(e) => {
                        const n = e.target.value.replace(/\D/g, "").slice(0, 2);
                        setKidNumber(n);
                        writeLine({ number: n });
                      }}
                      placeholder="12"
                      className="h-11 w-full rounded-lg border border-stone-300 px-2.5 text-[16px] text-stone-900 placeholder:text-stone-400 sm:h-9 sm:text-[14px]"
                    />
                  </label>
                )}
                {line && BANNER_LINES[line].asks === "text" && (
                  <label className="flex flex-col gap-1 text-[12px] font-medium text-stone-700 grow basis-40">
                    Your line
                    <input
                      type="text"
                      name="kid-line"
                      value={lineText}
                      onChange={(e) => {
                        setLineText(e.target.value);
                        writeLine({ text: e.target.value });
                      }}
                      placeholder="e.g. GO CATS"
                      maxLength={24}
                      className="h-11 rounded-lg border border-stone-300 px-2.5 text-[16px] uppercase text-stone-900 placeholder:normal-case placeholder:text-stone-400 sm:h-9 sm:text-[14px]"
                    />
                  </label>
                )}
                <label className="flex flex-col gap-1 text-[12px] font-medium text-stone-700 grow basis-32">
                  {buyer.nameLabel}
                  <input
                    type="text"
                    name="kid-name"
                    value={kidName}
                    onChange={(e) => {
                      const value = e.target.value;
                      setKidName(value);
                      // LIVE, like every other control here. Blank puts the mascot
                      // back on the banner rather than leaving the last letter.
                      const api = storeApi.getState();
                      const name = value.trim();
                      if (name) writePerson(api, { name, tagline: taglineNow() });
                      else if (kit) api.setSectionText("bottom", { text: kit.banners.bottom });
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    placeholder={buyer.namePlaceholder}
                    maxLength={14}
                    className="h-11 rounded-lg border border-stone-300 px-2.5 text-[16px] uppercase text-stone-900 placeholder:normal-case placeholder:text-stone-400 sm:h-9 sm:text-[14px]"
                  />
                </label>
              </div>
              <FirstRunTour open={tourOpen} onClose={dismissTour} />
              {/* THE STAGE. The one zone on the page darker than its neighbours
                  (1.19:1 below the canvas, 1.28:1 below the cards) — everything else
                  is white or near-white, so the eye goes to the single tonal break
                  and finds the frame sitting in it. Frame navy on this mat is
                  11.10:1, which makes the product the highest-contrast large object
                  in view now that the ink header and the 3px outlines are gone.

                  `relative` MUST stay: the frame-side ArmedBanner is absolutely
                  positioned against this element. */}
              {/* THE PINNED PREVIEW (phones). "I can't see the design because I
                  scroll" — Bill. The frame sticks under the header while the
                  tray, the colours and the editor scroll beneath it, so every tap
                  lands where the parent can see it. Only the frame and one status
                  line are pinned (about a third of an iPhone screen); the intake
                  and the graduate card above it scroll away as usual, so nothing
                  pinned sits over a control. Desktop pins the whole column instead
                  (`lg:sticky` on the parent) and this is static there. */}
              <div
                className="sticky top-[var(--ff-header-h,0px)] z-30 -mx-4 pt-2 pb-1 pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))] max-lg:bg-[var(--ff-room,var(--ff-canvas))] max-lg:shadow-[0_8px_14px_-10px_rgba(0,0,0,0.6)] lg:static lg:z-auto lg:mx-0 lg:p-0"
              >
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
                {/* Desktop: the callout floats over the plate. On a phone that
                    covered the middle side badges — the very targets — so there it
                    moves to the status line under the frame instead. */}
                <div className="hidden lg:contents">
                  <ArmedBanner placement="frame" />
                </div>
                <FrameCanvas
                  ref={canvasRef}
                  frameConfig={frameConfig}
                  slots={slots}
                  bottomBar={bottomBar}
                  qrCode={qrCode}
                  plateState={plateState}
                  // The kit's own plate while the picker is on its state, else the
                  // school stock plate — never the FESTIVE stock photo.
                  plateImageOverride={schoolPlatePhoto(kit, plateState)}
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
              {/* The phone's pinned STATUS LINE: the armed-tile callout when a
                  tile is armed, the how-to otherwise. One fixed-height slot, so
                  arming a tile never pushes the tray the parent just tapped. */}
              <div className="flex min-h-11 items-center justify-center lg:hidden">
                {armed ? (
                  <ArmedBanner placement="dock" />
                ) : (
                  <p className="ff-stage-hint !m-0">Tap a badge or a banner on the frame to change it.</p>
                )}
              </div>
              </div>
              {!editorOpen && (
                <p className="ff-stage-hint hidden lg:block">
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
              <SectionEditor schoolCrest={kit?.marks?.crest} mascot={kit?.mascot} />
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

      {sendSheet && (
        <SendDesignSheet
          preview={sendSheet.rendered?.printPng ?? null}
          renderFailed={sendSheet.failed}
          initialFor={buyerId}
          sending={submitting}
          error={sendSheet.error}
          onSend={(contact) => void handleSubmit(contact)}
          onClose={closeSend}
        />
      )}

      {/* Floating size control for the selected tile/snappet — grow/shrink any placed
          tile (photos re-crop on aspect change). Portaled to <body> internally. */}
      <SnappetSizeControl />

      {/* The second rights door — see `artworkRightsSettled`. Accepting resumes the
          submit it interrupted, so the parent taps once and the order goes. */}
      {rightsFor && (
        <UploadRightsGate
          onAccept={() => {
            const what = rightsFor;
            acceptArtworkRights();
            setRightsFor(null);
            if (what === "submit") void openSend();
            else void handleBuy();
          }}
          onCancel={() => setRightsFor(null)}
        />
      )}
    </div>
  );
}

// Wrapper that owns the ISOLATED school store and provides it to the builder. It
// MUST sit above SchoolDesigner so that component's top-level store hooks read the
// school store (not /build's). The store is created once on the client (lazy
// useState init) with its OWN persist key, so it never touches /build's design.
export function SchoolBuilder({
  kit,
  hero,
  variant,
  brandScan,
  operatorTools = false,
  frameConfig = schoolVariant(variant).config,
}: {
  kit?: SchoolKit;
  hero?: React.ReactNode;
  /** Show the website scanner FOR THIS SCHOOL. Set by /s/<slug> on a thin kit —
   *  the one case where we know which school it is and not what colour it is. */
  brandScan?: { slug: string; heading?: string; blurb?: React.ReactNode };
  /**
   * WHICH FRAME this builder is: the geometry, its preset layouts, and the persist
   * key's namespace, all from one record (data/school-variants). Absent = the live
   * frame, byte for byte. A fork route names its variant and nothing else.
   */
  variant?: SchoolVariantId;
  /** The production print-file export (lab routes only). See SchoolDesigner. */
  operatorTools?: boolean;
  /** Override the variant's geometry. Tests and the odd experiment only; a route
   *  should name a variant. */
  frameConfig?: typeof SCHOOL_FRAME_CONFIG;
}) {
  const { presets } = schoolVariant(variant);
  // The store is configured by `schoolStoreOptions` (data/school-store.ts): the
  // frame geometry the store OWNS, the school-only persist migration, and the
  // kit's initial-state seeds. The node renders build their stores from the same
  // function, so a sample cannot seed a frame the builder would not.
  //
  // The persist key is scoped by variant and kit: a family with kids at two
  // schools holds two designs, and /lab/school's original key is untouched.
  const persistKey = [SCHOOL_PERSIST_KEY, variant, kit?.slug].filter(Boolean).join(":");
  const [store] = useState(() => createDesignStore(persistKey, schoolStoreOptions({ kit, variant, frameConfig })));
  return (
    <DesignStoreProvider store={store}>
      <SchoolDesigner
        kit={kit}
        hero={hero}
        presets={presets}
        brandScan={brandScan}
        operatorTools={operatorTools}
        persistKey={persistKey}
      />
    </DesignStoreProvider>
  );
}
