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
import { exportFrameAsPng } from "@/lib/utils/export";
import { captureFrameAsDataUrl } from "@/lib/utils/capture";
import { playSound } from "@/lib/utils/sound";
import { getSet } from "@/data/sets/index";

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
  const canvasRef = useRef<FrameCanvasHandle>(null);
  const seededRef = useRef(false);

  useKeyboardShortcuts();

  // First load on a blank canvas → random + mirrored July 4th design. On a
  // returning design, just patch any empty cells so there are never blanks.
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    const set = getSet("july4th");
    if (!set) return;
    const pieces = set.pieces.map((p) => ({ pieceId: p.id, setId: set.id }));
    if (!pieces.length) return;
    const store = useDesignStore.getState();
    if (Object.keys(store.slots).length === 0) {
      randomFill(pieces);
      useDesignStore.getState().mirrorTopSlots();
    } else {
      store.fillEmpty(pieces);
    }
  }, [randomFill]);

  const handleExport = useCallback(async () => {
    const el = canvasRef.current?.getElement();
    if (!el) return;

    setExportState("exporting");
    try {
      await exportFrameAsPng(el, designName);
      setExportState("done");
      if (soundEnabled) playSound("chime");
      setTimeout(() => setExportState("idle"), 2000);
    } catch {
      setExportState("error");
      if (soundEnabled) playSound("sad");
      setTimeout(() => setExportState("idle"), 3000);
    }
  }, [designName, setExportState, soundEnabled]);

  // Capture a mockup of the frame, then open the production parts list.
  const handleExportParts = useCallback(async () => {
    const el = canvasRef.current?.getElement();
    if (el) {
      try {
        const dataUrl = await captureFrameAsDataUrl(el, {
          pixelRatio: 2,
          backgroundColor: "#1a1a1a",
        });
        setFrameImage(dataUrl);
      } catch {
        setFrameImage(null);
      }
    }
    setShowParts(true);
  }, []);

  return (
    <div className="workbench-bg min-h-screen flex flex-col">
      <DesignerHeader onExport={handleExport} onExportParts={handleExportParts} />
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
