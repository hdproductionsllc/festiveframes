"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDesignStore } from "@/stores/design-store";
import { useUIStore } from "@/stores/ui-store";
import { usePreviewStore } from "@/stores/preview-store";
import { useOrderStore, type TileSetLineItem } from "@/stores/order-store";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { DndProvider } from "./DndProvider";
import { DesignerHeader } from "./DesignerHeader";
import { FrameCanvas, type FrameCanvasHandle } from "@/components/frame/FrameCanvas";
import { TilePalette } from "@/components/tiles/TilePalette";
import { BottomBarEditor } from "@/components/bottom-bar/BottomBarEditor";
import { StateSelector } from "@/components/frame/StateSelector";
import { CarPreview } from "@/components/preview/CarPreview";
import { exportFrameAsPng } from "@/lib/utils/export";
import { captureFrameAsDataUrl } from "@/lib/utils/capture";
import { playSound } from "@/lib/utils/sound";
import { getSet } from "@/data/sets/index";
import { FRAME_BASE_PRICE } from "@/lib/constants/frame";

type ActiveTab = "design" | "preview";

export function Designer() {
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const slots = useDesignStore((s) => s.slots);
  const bottomBar = useDesignStore((s) => s.bottomBar);
  const qrCode = useDesignStore((s) => s.qrCode);
  const plateState = useDesignStore((s) => s.plateState);
  const designName = useDesignStore((s) => s.designName);
  const setExportState = useUIStore((s) => s.setExportState);
  const soundEnabled = useUIStore((s) => s.soundEnabled);

  const router = useRouter();
  const setOrder = useOrderStore((s) => s.setOrder);

  const [overSlotId, setOverSlotId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("design");
  const [frameDataUrl, setFrameDataUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const canvasRef = useRef<FrameCanvasHandle>(null);

  useKeyboardShortcuts();

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

  const handleOrder = useCallback(async () => {
    const el = canvasRef.current?.getElement();
    if (!el) return;

    setIsOrdering(true);
    try {
      const dataUrl = await captureFrameAsDataUrl(el, {
        pixelRatio: 2,
        backgroundColor: "#1a1a1a",
      });

      // Compute unique paid tile sets from placed tiles
      const currentSlots = useDesignStore.getState().slots;
      const currentBottomBar = useDesignStore.getState().bottomBar;
      const currentDesignName = useDesignStore.getState().designName;
      const uniqueSetIds = new Set<string>();
      for (const tile of Object.values(currentSlots)) {
        uniqueSetIds.add(tile.setId);
      }

      const tileSetLineItems: TileSetLineItem[] = [];
      for (const setId of uniqueSetIds) {
        const tileSet = getSet(setId);
        if (tileSet) {
          tileSetLineItems.push({
            setId: tileSet.id,
            setName: tileSet.name,
            price: tileSet.price,
          });
        }
      }

      const paidTotal = tileSetLineItems.reduce((sum, i) => sum + i.price, 0);

      setOrder({
        frameImageDataUrl: dataUrl,
        designName: currentDesignName,
        bottomBarText: currentBottomBar.text,
        slots: { ...currentSlots },
        bottomBar: { ...currentBottomBar },
        tileSetLineItems,
        frameBasePrice: FRAME_BASE_PRICE,
        total: FRAME_BASE_PRICE + paidTotal,
      });

      router.push("/checkout");
    } catch {
      // Capture failed — stay on designer
    }
    setIsOrdering(false);
  }, [router, setOrder]);

  const handleTabSwitch = useCallback(
    async (tab: ActiveTab) => {
      if (tab === "preview") {
        const el = canvasRef.current?.getElement();
        if (!el) return;
        setIsCapturing(true);
        try {
          const dataUrl = await captureFrameAsDataUrl(el, {
            pixelRatio: 2,
            backgroundColor: "transparent",
          });
          setFrameDataUrl(dataUrl);
          usePreviewStore.getState().setFrameImage(dataUrl);
        } catch {
          // If capture fails, switch anyway with whatever we had
        }
        setIsCapturing(false);
      }
      setActiveTab(tab);
    },
    []
  );

  const slotCount = Object.keys(slots).length;

  return (
    <div className="workbench-bg min-h-screen flex flex-col">
      <DesignerHeader onExport={handleExport} onOrder={handleOrder} isOrdering={isOrdering} />

      <DndProvider onOverSlotChange={setOverSlotId}>
        <main className={`flex-1 flex flex-col md:flex-row md:items-start gap-4 p-4 mx-auto w-full ${
          frameConfig.wings ? "" : "max-w-7xl"
        }`}>
          {/* Palette — left side on desktop */}
          <TilePalette />

          {/* Main content area */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* State selector + tab toggle row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-surface-400">Your State:</span>
                <StateSelector compact />
              </div>

              {/* Tab toggle */}
              <div className="flex bg-surface-800 rounded-lg p-0.5">
                <button
                  onClick={() => handleTabSwitch("design")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === "design"
                      ? "bg-surface-600 text-surface-100 shadow-sm"
                      : "text-surface-400 hover:text-surface-200"
                  }`}
                >
                  Design
                </button>
                <button
                  onClick={() => handleTabSwitch("preview")}
                  disabled={isCapturing || slotCount === 0}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed ${
                    activeTab === "preview"
                      ? "bg-surface-600 text-surface-100 shadow-sm"
                      : "text-surface-400 hover:text-surface-200"
                  }`}
                >
                  {isCapturing ? "Capturing..." : "On Your Car"}
                </button>
              </div>
            </div>

            {/* Frame canvas (design tab) */}
            {activeTab === "design" && (
              <>
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

                  {/* Empty state prompt */}
                  {slotCount === 0 && (
                    <div className="absolute inset-0 flex items-start justify-center pt-2 pointer-events-none">
                      <div className="bg-surface-900/85 backdrop-blur-sm rounded-lg px-5 py-3 text-center max-w-[260px] border border-surface-700/50">
                        <p className="text-surface-200 text-sm font-medium mb-1">
                          Get started!
                        </p>
                        <p className="text-surface-400 text-xs leading-relaxed">
                          Drag tiles from the left panel onto the frame, or try a preset design below
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom bar editor */}
                <BottomBarEditor />
              </>
            )}

            {/* Car preview (preview tab) */}
            {activeTab === "preview" && (
              <CarPreview frameDataUrl={frameDataUrl} />
            )}
          </div>
        </main>
      </DndProvider>
    </div>
  );
}
