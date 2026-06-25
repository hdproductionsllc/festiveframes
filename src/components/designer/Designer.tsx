"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDesignStore } from "@/stores/design-store";
import { useUIStore } from "@/stores/ui-store";
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
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewProof, setReviewProof] = useState<string | null>(null);
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

      // 3. Place the banner(s). Each placed bar freezes the current draft
      //    `bottomBar`, so set its text + colors right before placing it. The
      //    store forces the QR onto the FIRST bar placed; placing the bottom bar
      //    first keeps the QR on the bottom banner for two-banner looks.
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
        useDesignStore.getState().placeTextBar(row, 0);
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

  // Step 1 of ordering: render a high-res PROOF and show it for confirmation
  // BEFORE taking payment, so the customer sees exactly what we'll make and has
  // confidence their design is captured with the order. The proof is reused for
  // production (no double render).
  const handleReview = useCallback(async () => {
    if (ordering) return;
    const s = useDesignStore.getState();
    if (Object.keys(s.slots).length === 0) return;
    setReviewProof(null);
    pendingProofRef.current = null;
    setReviewOpen(true);
    try {
      const proofUrl = await composeFrameImage(2000);
      pendingProofRef.current = proofUrl ? { name: "frame-proof", dataUrl: proofUrl } : null;
      setReviewProof(proofUrl ?? null);
    } catch {
      pendingProofRef.current = null;
      setReviewProof(null);
    }
  }, [ordering]);

  // Step 2: the customer confirmed the proof — render every production artifact
  // client-side (reusing the proof), stash them for the post-payment relay,
  // create the $39 Stripe session, and redirect.
  const confirmOrder = useCallback(async () => {
    if (ordering) return;
    setOrdering(true);
    if (soundEnabled) playSound("chime");
    try {
      const s = useDesignStore.getState();
      if (Object.keys(s.slots).length === 0) {
        setOrdering(false);
        return;
      }
      const orderId = (crypto.randomUUID?.() ?? `ord-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);

      // Reuse the proof rendered for the review step (fall back to rendering it).
      // The proof is the one artifact we genuinely want before paying, so it's
      // worth a short wait — but still time-boxed so a stuck canvas can never
      // strand the customer on "Sending you to checkout…".
      let proof: NamedImage | null = pendingProofRef.current;
      if (!proof) {
        const proofUrl = await withTimeout(composeFrameImage(2000), 8000, null);
        proof = proofUrl ? { name: "frame-proof", dataUrl: proofUrl } : null;
      }

      // The remaining production artifacts (banners + the full-res eufyMake print
      // sheet) are heavy canvas renders. On mobile they can THROW (iOS caps the
      // canvas size — see eufy-print.ts) or hang, and historically that froze the
      // whole order on "Sending you to checkout…". They are OPTIONAL for the
      // redirect: the design JSON we POST below lets Bill regenerate every one of
      // them on his desktop. So we render them under a hard timeout and a catch —
      // whatever succeeds gets shipped, a mobile failure ships nothing extra, and
      // EITHER WAY we always fall through to the Stripe redirect.
      let banners: NamedImage[] = [];
      let printSheets: NamedImage[] = [];
      try {
        const heavyArtifacts = (async () => {
          // Banner files (one per text bar).
          const b: NamedImage[] = [];
          for (const bar of s.textBars) {
            const url = await composeBarImage(bar.id);
            if (url) b.push({ name: `banner-${bar.row}-${bar.startIndex}`, dataUrl: url });
          }
          // eufyMake print sheet(s). Desktop-only — throws on phones (canvas too
          // large). On mobile we ship without it; Bill regenerates on desktop.
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
        // Any unexpected failure → ship without the heavy artifacts; the design
        // JSON still regenerates them. Never block the redirect.
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
      });

      const artifacts = { proof, printSheets, banners };

      // Stash for fulfillment: server draft (webhook backup) + localStorage
      // (the /thanks relay, resilient across the Stripe redirect / restart).
      try {
        await fetch("/api/order/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, parts, artifacts, design: { slots: s.slots, textBars: s.textBars, qrCode: s.qrCode, plateState: s.plateState, frameConfig: s.frameConfig, designName: s.designName } }),
        });
      } catch {
        /* non-fatal: localStorage relay below is the backup */
      }
      try {
        localStorage.setItem("ff:pending-order", JSON.stringify({ orderId, parts, artifacts }));
      } catch {
        // Quota: drop the heavy print sheets from the local copy (the server
        // draft still has them); founders still get parts + proof + banners.
        try {
          localStorage.setItem("ff:pending-order", JSON.stringify({ orderId, parts, artifacts: { ...artifacts, printSheets: [] } }));
        } catch { /* give up on the local relay; server draft remains */ }
      }

      // Create the Stripe checkout session and go.
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "custom-frame", orderId, designName: s.designName }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setOrdering(false);
        if (soundEnabled) playSound("sad");
      }
    } catch {
      setOrdering(false);
      if (soundEnabled) playSound("sad");
    }
  }, [ordering, soundEnabled]);

  return (
    <div className="workbench-bg min-h-screen flex flex-col">
      <DesignerHeader onExport={handleExport} onExportParts={handleExportParts} onOrder={handleReview} ordering={ordering} />
      <ExportPartsList open={showParts} onClose={() => setShowParts(false)} frameImage={frameImage} />
      {reviewOpen && (
        <ReviewOrderModal
          proof={reviewProof}
          designName={designName}
          ordering={ordering}
          onConfirm={confirmOrder}
          onClose={() => { if (!ordering) setReviewOpen(false); }}
        />
      )}

      <DndProvider onOverSlotChange={setOverSlotId} onBannerPreviewChange={setBannerPreview}>
        {/* A license-plate frame is a WIDE, SHORT landscape shape. So the canvas
            is the hero across the FULL WIDTH up top, and the two working panels
            (tile palette + text-bar editor) sit in a row beneath it. */}
        <main className="flex-1 flex flex-col gap-4 p-4 mx-auto w-full max-w-7xl">
          {/* Frame canvas — full-width hero, the SAME width as the two tool
              panels below it so the builder reads as one cohesive block. */}
          <div className="w-full flex flex-col gap-3">
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

          {/* Tools row — the tile palette (left) and the text-bar editor (right)
              sit side by side on desktop, stacked on mobile. */}
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            {/* Tile palette panel — ~55–60% on desktop. */}
            <TilePalette />

            {/* Text-bar editor panel — equal width to the palette on desktop. */}
            <div className="w-full lg:basis-0 lg:grow-[50] min-w-0">
              <BottomBarEditor />
            </div>
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
  designName,
  ordering,
  onConfirm,
  onClose,
}: {
  proof: string | null;
  designName: string;
  ordering: boolean;
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
            ) : (
              <div className="flex h-40 w-full items-center justify-center text-sm font-semibold text-[#1e1b17]/50">
                Rendering your proof…
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
              disabled={!confirmed || !proof || ordering}
              className="flex-1 rounded-full border-2 border-[#1e1b17] bg-[#f8c53b] px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-[#1e1b17]
                shadow-[0_3px_0_#1e1b17] transition-all hover:brightness-105 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
            >
              {ordering ? "Sending you to checkout…" : "Place order & pay · $39"}
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
        </div>
      </div>
    </div>
  );
}
