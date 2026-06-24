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
import { BottomBarEditor } from "@/components/bottom-bar/BottomBarEditor";
import { StateSelector } from "@/components/frame/StateSelector";
import { composeFrameImage, composeBarImage } from "@/lib/utils/compose-frame";
import { composeEufyPrintSheets } from "@/lib/utils/eufy-print";
import { EUFY_JIG_3X12 } from "@/config/eufy-jig";
import { buildPartsList } from "@/lib/order/parts-list";
import type { NamedImage } from "@/lib/email-production";
import { playSound } from "@/lib/utils/sound";
import { getSet } from "@/data/sets/index";
import { LOOK_PRESETS } from "@/data/look-presets";

// NOTE: the "On Your Car" preview (CarPreview / preview-store / stock-cars) is
// intentionally unmounted for launch but kept in the codebase for later.

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
  const [frameImage, setFrameImage] = useState<string | null>(null);
  const [showParts, setShowParts] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const canvasRef = useRef<FrameCanvasHandle>(null);
  const seededRef = useRef(false);

  useKeyboardShortcuts();

  // First load on a blank canvas → a July 4th design. If the visitor arrived
  // from a homepage "Build this look" button (/build?look=<id>), seed that
  // look's themed starting point (featured tiles + slogan bar); otherwise fall
  // back to a random + mirrored fill. On a returning design, just patch any
  // empty cells so there are never blanks.
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    const set = getSet("july4th");
    if (!set) return;
    const pieces = set.pieces.map((p) => ({ pieceId: p.id, setId: set.id }));
    if (!pieces.length) return;
    const store = useDesignStore.getState();
    const blank = Object.keys(store.slots).length === 0;

    if (!blank) {
      store.fillEmpty(pieces);
      return;
    }

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

  // Place the made-to-order frame order: render every production artifact
  // client-side (we have the fonts + artwork loaded), stash them for the
  // post-payment relay, create the $39 Stripe session, and redirect.
  const handleOrder = useCallback(async () => {
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

      // Proof / composite (the customer's proof AND the founders' composite).
      const proofUrl = await composeFrameImage(2000);
      const proof: NamedImage | null = proofUrl ? { name: "frame-proof", dataUrl: proofUrl } : null;

      // Banner files (one per text bar).
      const banners: NamedImage[] = [];
      for (const bar of s.textBars) {
        const url = await composeBarImage(bar.id);
        if (url) banners.push({ name: `banner-${bar.row}-${bar.startIndex}`, dataUrl: url });
      }

      // eufyMake print sheet(s). Desktop-only — throws on phones (canvas too
      // large). On mobile we ship without it; Bill regenerates on desktop.
      let printSheets: NamedImage[] = [];
      try {
        const { sheets } = await composeEufyPrintSheets(EUFY_JIG_3X12);
        printSheets = sheets.map((dataUrl, i) => ({ name: `eufy-print-sheet-${i + 1}`, dataUrl }));
      } catch {
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
      <DesignerHeader onExport={handleExport} onExportParts={handleExportParts} onOrder={handleOrder} ordering={ordering} />
      <ExportPartsList open={showParts} onClose={() => setShowParts(false)} frameImage={frameImage} />

      <DndProvider onOverSlotChange={setOverSlotId}>
        <main className={`flex-1 flex flex-col md:flex-row md:items-start gap-4 p-4 mx-auto w-full ${
          frameConfig.wings ? "" : "max-w-7xl"
        }`}>
          {/* Palette — left side on desktop */}
          <TilePalette />

          {/* Main content area — sticky on desktop so it follows scroll */}
          <div className="flex-1 flex flex-col gap-4 min-w-0 md:sticky md:top-4 md:self-start">
            {/* State selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-surface-400">Your State:</span>
              <StateSelector compact />
            </div>

            {/* Frame canvas */}
            <div className="relative">
              <FrameCanvas
                ref={canvasRef}
                frameConfig={frameConfig}
                slots={slots}
                bottomBar={bottomBar}
                qrCode={qrCode}
                plateState={plateState}
                overSlotId={overSlotId}
              />
            </div>

            {/* Text bar editor */}
            <BottomBarEditor />
          </div>
        </main>
      </DndProvider>
    </div>
  );
}
