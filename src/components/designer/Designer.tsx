"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDesignStore } from "@/stores/design-store";
import { useUIStore } from "@/stores/ui-store";
import { useCartStore } from "@/stores/cart-store";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { DndProvider } from "./DndProvider";
import { DesignerHeader } from "./DesignerHeader";
import { ExportPartsList } from "./ExportPartsList";
import { FrameCanvas, type FrameCanvasHandle } from "@/components/frame/FrameCanvas";
import { TilePalette } from "@/components/tiles/TilePalette";
import { ArmedBanner } from "@/components/tiles/ArmedBanner";
import { BottomBarEditor } from "@/components/bottom-bar/BottomBarEditor";
import { composeFrameImage, composeBarImage } from "@/lib/utils/compose-frame";
import { composeEufyPrintSheets } from "@/lib/utils/eufy-print";
import { EUFY_JIG_3X12 } from "@/config/eufy-jig";
import { buildPartsList } from "@/lib/order/parts-list";
import type { NamedImage } from "@/lib/email-production";
import type { BannerPreview } from "@/lib/types";
import { playSound } from "@/lib/utils/sound";
import { getSet } from "@/data/sets/index";
import { LOOK_PRESETS } from "@/data/look-presets";

// NOTE: the "On Your Car" preview (CarPreview / preview-store / stock-cars) is
// intentionally unmounted for launch but kept in the codebase for later.

/**
 * Race a promise against a timeout. If `promise` doesn't settle within `ms`,
 * resolve with `fallback` instead so a hung canvas render (notably iOS Safari's
 * capped <canvas>) can never strand the order flow. A rejection also resolves to
 * the fallback — the caller treats both "slow" and "failed" the same: proceed.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const done = (v: T) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(v);
    };
    const timer = window.setTimeout(() => done(fallback), ms);
    promise.then((v) => done(v)).catch(() => done(fallback));
  });
}

export function Designer() {
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const slots = useDesignStore((s) => s.slots);
  const bottomBar = useDesignStore((s) => s.bottomBar);
  const qrCode = useDesignStore((s) => s.qrCode);
  const plateState = useDesignStore((s) => s.plateState);
  const designName = useDesignStore((s) => s.designName);
  const setExportState = useUIStore((s) => s.setExportState);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const randomFill = useDesignStore((s) => s.randomFill);

  const [overSlotId, setOverSlotId] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<BannerPreview | null>(null);
  const [frameImage, setFrameImage] = useState<string | null>(null);
  const [showParts, setShowParts] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewProof, setReviewProof] = useState<string | null>(null);
  // True while the proof image is rendering. Lets the modal show a "rendering"
  // vs. "couldn't render — continue or retry" state instead of hanging forever
  // (iOS Safari can fail/cap the canvas — see compose-frame.ts).
  const [proofRendering, setProofRendering] = useState(false);
  const pendingProofRef = useRef<NamedImage | null>(null);
  const canvasRef = useRef<FrameCanvasHandle>(null);
  const seededRef = useRef(false);

  useKeyboardShortcuts();

  // Un-freeze on Back from Stripe. When we redirect to checkout, `ordering` is
  // true (button disabled, the review modal shows "Sending you to checkout…").
  // Hitting the browser Back button can restore this page from the bfcache with
  // that frozen state intact. `pageshow` fires on every show — including a
  // bfcache restore (`persisted`) — so we reset the order UI to a clean state.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      setOrdering(false);
      if (e.persisted) setReviewOpen(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // First load → seed a July 4th design ONLY for a brand-new visitor with a
  // blank canvas. If the visitor arrived from a homepage "Build this look"
  // button (/build?look=<id>), seed that look's themed starting point (featured
  // tiles + slogan bar); otherwise fall back to a random + mirrored fill.
  //
  // A RETURNING user's design is restored from persistence (zustand `persist`,
  // synchronous localStorage → already hydrated by the time this runs). Such a
  // design must be left EXACTLY as saved — never re-seeded and never patched —
  // so the "Saved" indicator stays truthful. We treat any restored slots OR
  // text bars as "has a design" and bail without touching it.
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    const set = getSet("july4th");
    if (!set) return;
    const pieces = set.pieces.map((p) => ({ pieceId: p.id, setId: set.id }));
    if (!pieces.length) return;
    const store = useDesignStore.getState();
    const hasDesign =
      Object.keys(store.slots).length > 0 || store.textBars.length > 0;

    // Returning user: a saved design was restored — leave it untouched.
    if (hasDesign) return;

    // Read the requested look from the URL (read-once, client-only — avoids the
    // useSearchParams Suspense requirement on this otherwise-static page).
    const look =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("look")
        : null;
    const preset = look ? LOOK_PRESETS[look] : undefined;

    if (preset) {
      // Faithfully recreate the look's marketing preview: place its exact tiles
      // into their exact slots, fill any still-empty perimeter slot with the
      // look's themed filler, then drop the top and/or bottom banner(s) the
      // preview shows. (See src/data/look-presets.ts for the per-look layout.)
      const valid = new Set(pieces.map((p) => p.pieceId));
      const store = useDesignStore.getState();
      store.clearAll();

      // 1. Explicit tile placements (only real, in-set pieces).
      for (const [slotId, pieceId] of Object.entries(preset.slots)) {
        if (valid.has(pieceId)) {
          useDesignStore.getState().placeTile(slotId, pieceId, set.id);
        }
      }

      // 2. Fill any remaining empty perimeter slot with the themed filler.
      const filler = preset.filler.filter((id) => valid.has(id));
      if (filler.length) {
        useDesignStore.getState().fillEmpty(
          filler.map((pieceId) => ({ pieceId, setId: set.id }))
        );
      }

      // 3. Place the banner(s) CENTERED on their row. Each placed bar freezes the
      //    current draft `bottomBar`, so set its text + colors right before placing
      //    it. The store forces the QR onto the FIRST bar placed; placing the bottom
      //    bar first keeps the QR on the bottom banner for two-banner looks.
      //    Centering (not start-0) is REQUIRED: presets flank the banner with tiles
      //    on both ends, and a left-aligned bar would land on — and delete — those
      //    flanking tiles (the "banner offset + missing tiles" bug).
      const placeBanner = (
        row: "top" | "bottom",
        banner: NonNullable<typeof preset.bottomBar>
      ) => {
        const s = useDesignStore.getState();
        s.updateBottomBar({
          text: banner.text,
          ...(banner.backgroundColor ? { backgroundColor: banner.backgroundColor } : {}),
          ...(banner.textColor ? { textColor: banner.textColor } : {}),
        });
        useDesignStore.getState().placeTextBarCentered(row);
      };
      if (preset.bottomBar) placeBanner("bottom", preset.bottomBar);
      if (preset.topBar) placeBanner("top", preset.topBar);
      return;
    }

    // No / unknown look → keep the original random behavior.
    randomFill(pieces);
    useDesignStore.getState().mirrorTopSlots();
  }, [randomFill]);

  const handleExport = useCallback(async () => {
    setExportState("exporting");
    try {
      const dataUrl = await composeFrameImage();
      const safe =
        (designName || "frame-design").replace(/[^a-zA-Z0-9 -]/g, "").trim().replace(/ /g, "-").toLowerCase() ||
        "frame-design";
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${safe}.png`;
      a.click();
      setExportState("done");
      if (soundEnabled) playSound("chime");
      setTimeout(() => setExportState("idle"), 2000);
    } catch {
      setExportState("error");
      if (soundEnabled) playSound("sad");
      setTimeout(() => setExportState("idle"), 3000);
    }
  }, [designName, setExportState, soundEnabled]);

  // Compose a mockup of the frame (canvas-based, iOS-safe), then open the parts list.
  const handleExportParts = useCallback(async () => {
    try {
      const dataUrl = await composeFrameImage();
      setFrameImage(dataUrl);
    } catch {
      setFrameImage(null);
    }
    setShowParts(true);
  }, []);

  // Render the high-res proof into the review modal. TIME-BOXED: composeFrameImage
  // can hang or throw on iOS Safari's capped canvas, which used to strand the
  // modal on "Rendering your proof…" forever (and a proof-gated button greyed for
  // good). withTimeout resolves to null on a hang OR a throw, so the modal always
  // settles into either a proof or the "couldn't render — continue/retry" state.
  // The proof is OPTIONAL for ordering: production regenerates it from the design
  // JSON, so a failed render must never block checkout.
  const renderProof = useCallback(async () => {
    setReviewProof(null);
    pendingProofRef.current = null;
    setProofRendering(true);
    const proofUrl = await withTimeout(composeFrameImage(2000), 8000, null);
    pendingProofRef.current = proofUrl ? { name: "frame-proof", dataUrl: proofUrl } : null;
    setReviewProof(proofUrl ?? null);
    setProofRendering(false);
  }, []);

  // Step 1 of ordering: open the review modal and render the proof so the customer
  // sees exactly what we'll make before paying. The proof is reused for production.
  const handleReview = useCallback(async () => {
    if (ordering) return;
    const s = useDesignStore.getState();
    if (Object.keys(s.slots).length === 0) return;
    setReviewOpen(true);
    await renderProof();
  }, [ordering, renderProof]);

  // Render every production artifact client-side (reusing the review proof) and
  // stash the design to the SERVER draft keyed by a fresh orderId. The server
  // draft is the durable carrier the cart + fulfillment read from, so this AWAITS
  // the save and only succeeds if it persisted. Returns the new cart line's
  // metadata, or null on failure (so the caller can surface an error rather than
  // adding a design we can't actually produce).
  const prepareDesignDraft = useCallback(async (): Promise<
    { orderId: string; designName: string; thumbDataUrl: string | null } | null
  > => {
    const s = useDesignStore.getState();
    if (Object.keys(s.slots).length === 0) return null;
    const orderId = (crypto.randomUUID?.() ?? `ord-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);

    // Reuse the proof rendered for the review step (fall back to rendering it),
    // time-boxed so a stuck canvas can never strand the flow.
    let proof: NamedImage | null = pendingProofRef.current;
    if (!proof) {
      const proofUrl = await withTimeout(composeFrameImage(2000), 8000, null);
      proof = proofUrl ? { name: "frame-proof", dataUrl: proofUrl } : null;
    }

    // A small thumbnail for the cart row (kept tiny so the persisted cart stays
    // well under the localStorage quota). Optional — the cart works without it.
    const thumbDataUrl = await withTimeout(composeFrameImage(360), 5000, null);

    // Heavy artifacts (banner files + full-res eufyMake print sheet) are OPTIONAL
    // for checkout — Bill can regenerate them from the design JSON on his desktop.
    // They can THROW or hang on mobile (iOS caps the canvas), so they're rendered
    // under a hard timeout + catch; whatever succeeds gets shipped.
    let banners: NamedImage[] = [];
    let printSheets: NamedImage[] = [];
    try {
      const heavyArtifacts = (async () => {
        const b: NamedImage[] = [];
        for (const bar of s.textBars) {
          const url = await composeBarImage(bar.id);
          if (url) b.push({ name: `banner-${bar.row}-${bar.startIndex}`, dataUrl: url });
        }
        let p: NamedImage[] = [];
        try {
          const { sheets } = await composeEufyPrintSheets(EUFY_JIG_3X12);
          p = sheets.map((dataUrl, i) => ({ name: `eufy-print-sheet-${i + 1}`, dataUrl }));
        } catch {
          p = [];
        }
        return { banners: b, printSheets: p };
      })();
      const heavy = await withTimeout(heavyArtifacts, 12000, { banners: [], printSheets: [] });
      banners = heavy.banners;
      printSheets = heavy.printSheets;
    } catch {
      banners = [];
      printSheets = [];
    }

    const parts = buildPartsList({
      slots: s.slots,
      textBars: s.textBars,
      qrCode: s.qrCode,
      plateState: s.plateState,
      designName: s.designName,
      tileSizeInches: s.frameConfig.tileSizeInches,
      dieCut: s.dieCut,
    });

    const artifacts = { proof, printSheets, banners };

    // Save the SERVER draft — the cart's durable carrier. This MUST succeed; if
    // it doesn't, we return null so the design isn't added to a cart we can't
    // fulfill. (Print sheets are dropped on a retry if the body is too large.)
    const saveDraft = (withSheets: boolean) =>
      fetch("/api/order/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          parts,
          artifacts: withSheets ? artifacts : { ...artifacts, printSheets: [] },
          design: { slots: s.slots, textBars: s.textBars, qrCode: s.qrCode, plateState: s.plateState, frameConfig: s.frameConfig, designName: s.designName },
        }),
      });
    try {
      let res = await saveDraft(true);
      if (!res.ok && printSheets.length) res = await saveDraft(false); // payload too large → retry lean
      if (!res.ok) return null;
    } catch {
      return null;
    }

    return { orderId, designName: s.designName || "Custom frame", thumbDataUrl };
  }, []);

  // Step 2: the customer confirmed the proof — prepare the design draft and add
  // it to the cart, then take them to the cart to add more or check out. The
  // cart is the order (a single frame is a cart of one), so EVERY purchase flows
  // through it.
  const addToCart = useCallback(async () => {
    if (ordering) return;
    setOrdering(true);
    setOrderError(null);
    if (soundEnabled) playSound("chime");
    try {
      const prepared = await prepareDesignDraft();
      if (!prepared) {
        setOrdering(false);
        setOrderError("We couldn't save your design just now. Please check your connection and try again.");
        if (soundEnabled) playSound("sad");
        return;
      }
      useCartStore.getState().addLine({
        orderId: prepared.orderId,
        designName: prepared.designName,
        thumbDataUrl: prepared.thumbDataUrl,
        quantity: 1,
      });
      window.location.href = "/cart";
    } catch {
      setOrdering(false);
      setOrderError("Something went wrong adding your design to the cart. Please try again.");
      if (soundEnabled) playSound("sad");
    }
  }, [ordering, soundEnabled, prepareDesignDraft]);

  return (
    <div className="workbench-bg min-h-screen flex flex-col">
      <DesignerHeader onExport={handleExport} onExportParts={handleExportParts} onOrder={handleReview} ordering={ordering} />
      <ExportPartsList open={showParts} onClose={() => setShowParts(false)} frameImage={frameImage} />
      {reviewOpen && (
        <ReviewOrderModal
          proof={reviewProof}
          proofRendering={proofRendering}
          designName={designName}
          ordering={ordering}
          error={orderError}
          onRetryProof={renderProof}
          onConfirm={addToCart}
          onClose={() => { if (!ordering) { setReviewOpen(false); setOrderError(null); } }}
        />
      )}

      <DndProvider onOverSlotChange={setOverSlotId} onBannerPreviewChange={setBannerPreview}>
        {/* A license-plate frame is a WIDE, SHORT landscape shape. So the canvas
            is the hero across the FULL WIDTH up top, and the two working panels
            (tile palette + text-bar editor) sit in a row beneath it. */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4 p-4 mx-auto w-full max-w-7xl items-start">
          {/* Frame canvas — full-width hero (spans both tool columns on desktop).
              On MOBILE the tile palette is reordered ABOVE the frame (order-1) so
              you see the tiles you can place before the license plate; the canvas
              sits in the middle and the text-bar editor below it. */}
          <div className="order-2 lg:order-none lg:col-span-2 w-full flex flex-col gap-3">
            {/* Armed-tile callout — appears right above the frame the moment a
                tile is armed, telling you in plain words to tap the frame. */}
            <ArmedBanner placement="frame" />

            <div className="relative">
              {/* Ambient festivity: two faint, slow twinkles drifting near the
                  frame's corners — decorative UI chrome only (aria-hidden,
                  pointer-events off), deliberately subtle and offset in time so
                  they never compete with the design canvas. Hidden entirely under
                  reduced motion (the global block freezes the keyframes). */}
              <span
                aria-hidden="true"
                className="ff-twinkle motion-reduce:hidden"
                style={{ top: "-6px", left: "8%", animationDelay: "1.2s" }}
              />
              <span
                aria-hidden="true"
                className="ff-twinkle motion-reduce:hidden"
                style={{ bottom: "-6px", right: "12%", animationDelay: "3.6s", color: "rgba(63,176,230,0.5)" }}
              />
              <FrameCanvas
                ref={canvasRef}
                frameConfig={frameConfig}
                slots={slots}
                bottomBar={bottomBar}
                qrCode={qrCode}
                plateState={plateState}
                overSlotId={overSlotId}
                bannerPreview={bannerPreview}
              />
            </div>
          </div>

          {/* Tile palette — ABOVE the frame on mobile (order-1) so the tiles read
              first; row-2 col-1 on desktop. */}
          <div className="order-1 lg:order-none min-w-0">
            <TilePalette />
          </div>

          {/* Text-bar editor — below the frame on mobile (order-3); row-2 col-2 on
              desktop, beside the palette. */}
          <div className="order-3 lg:order-none min-w-0">
            <BottomBarEditor />
          </div>
        </main>
      </DndProvider>
    </div>
  );
}

/**
 * Pre-payment proof confirmation. Shows the customer EXACTLY what we'll make,
 * lets them download the proof, and requires a quick "this looks right"
 * acknowledgement before paying — so nobody pays unsure whether their design
 * was captured. Confirming runs the real order pipeline (Stripe), unchanged.
 */
function ReviewOrderModal({
  proof,
  proofRendering,
  designName,
  ordering,
  error,
  onRetryProof,
  onConfirm,
  onClose,
}: {
  proof: string | null;
  proofRendering: boolean;
  designName: string;
  ordering: boolean;
  error?: string | null;
  onRetryProof: () => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);

  // Save the proof image. iOS Safari does NOT honor `<a download>` for data URLs
  // (the tap just does nothing), so we route the bytes through a Blob + object
  // URL, which the download attribute DOES respect on every desktop browser.
  // iOS Safari still ignores `download` even for blob URLs, so there we fall back
  // to opening the image in a new tab where the user can long-press → "Save to
  // Photos". Object URLs are revoked after use to avoid leaking memory.
  const download = () => {
    if (!proof) return;
    const safe = (designName || "festive-frame").replace(/[^a-zA-Z0-9 -]/g, "").trim().replace(/ /g, "-").toLowerCase() || "festive-frame";

    // Data URL → Blob → object URL.
    let blobUrl: string | null = null;
    try {
      const [meta, b64] = proof.split(",");
      const mime = /:(.*?);/.exec(meta)?.[1] ?? "image/png";
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
    } catch {
      blobUrl = null;
    }

    const isIOS =
      typeof navigator !== "undefined" &&
      (/iP(hone|ad|od)/.test(navigator.userAgent) ||
        // iPadOS 13+ reports as Mac; disambiguate by touch support.
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

    // iOS ignores the download attribute entirely → open the image so the user
    // can long-press and save it. Fall back to the data URL if the Blob failed.
    if (isIOS) {
      const opened = window.open(blobUrl ?? proof, "_blank");
      if (opened && blobUrl) {
        // Give the new tab time to load the bytes before revoking.
        window.setTimeout(() => URL.revokeObjectURL(blobUrl!), 60000);
      } else if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      return;
    }

    // Desktop: trigger a real download via the object URL (preferred) or data URL.
    const a = document.createElement("a");
    a.href = blobUrl ?? proof;
    a.download = `${safe}-proof.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (blobUrl) window.setTimeout(() => URL.revokeObjectURL(blobUrl!), 1000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Review your order"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border-[3px] border-[#1e1b17] bg-[#fff9ec] shadow-[6px_6px_0_#1e1b17]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-[3px] border-[#1e1b17] bg-[#1e1b17] px-5 py-3">
          <h2 className="text-base font-extrabold uppercase tracking-wide text-[#faf0d6]">Last look before you order</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={ordering}
            aria-label="Close"
            className="rounded-full px-2 text-lg text-[#faf0d6]/70 hover:text-[#faf0d6] disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          <p className="mb-3 text-sm font-semibold text-[#1e1b17]/80">
            This is <strong>exactly what we&apos;ll hand-make</strong> and ship to you. Your design is saved with your order — no need to save it separately.
          </p>

          <div className="flex items-center justify-center rounded-xl border-2 border-[#1e1b17]/15 bg-white p-3">
            {proof ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proof} alt="Proof of your custom license plate frame" className="max-h-56 w-full object-contain" />
            ) : proofRendering ? (
              <div className="flex h-40 w-full items-center justify-center text-sm font-semibold text-[#1e1b17]/50">
                Rendering your proof…
              </div>
            ) : (
              // Render failed/timed out (e.g. iOS Safari canvas cap). The design is
              // still captured with the order, so let them retry or continue.
              <div className="flex h-40 w-full flex-col items-center justify-center gap-2 px-4 text-center">
                <p className="text-sm font-semibold text-[#1e1b17]/70">
                  We couldn&apos;t render a preview here, but your exact design is still saved with your order.
                </p>
                <button
                  type="button"
                  onClick={onRetryProof}
                  className="rounded-full border-2 border-[#1e1b17] bg-white px-4 py-1.5 text-sm font-bold text-[#1e1b17] transition-all hover:bg-[#f1e4c6] active:scale-95"
                >
                  ↻ Retry preview
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={download}
            disabled={!proof}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-[#1e1b17] bg-[#3fb0e6] px-4 py-2
              text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
          >
            ⬇ Download my proof
          </button>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg bg-[#1e1b17]/[0.05] p-3">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#ed5aa0]"
            />
            <span className="text-sm font-semibold text-[#1e1b17]">
              I&apos;ve reviewed my design above and it&apos;s correct — make and ship this exact frame.
            </span>
          </label>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              onClick={onConfirm}
              disabled={!confirmed || ordering || proofRendering}
              className="flex-1 rounded-full border-2 border-[#1e1b17] bg-[#f8c53b] px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-[#1e1b17]
                shadow-[0_3px_0_#1e1b17] transition-all hover:brightness-105 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
            >
              {ordering ? "Adding…" : proofRendering ? "Rendering…" : "Add to cart →"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={ordering}
              className="rounded-full border-2 border-[#1e1b17] bg-white px-5 py-3 text-sm font-bold text-[#1e1b17] transition-all hover:bg-[#f1e4c6] disabled:opacity-40"
            >
              Keep editing
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-center text-[13px] font-bold text-[#c8102e]">
              {error}
            </p>
          )}
          <p className="mt-3 text-center text-[12px] font-semibold text-[#1e1b17]/60">
            Add more frames on the next screen — 2 for $69.
          </p>
        </div>
      </div>
    </div>
  );
}
