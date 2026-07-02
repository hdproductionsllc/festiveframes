"use client";

// ─── SCHOOL / FUNDRAISING BUILDER — a FORK of the live builder ───────────────
//
// This is the REAL builder, not a mock. It reuses the actual interactive pieces
// verbatim — the drag-and-drop engine (DndProvider), the frame canvas that renders
// the real license plate + tile rails + WINGS (the 3-tile-wide draggable side
// panels), the tile palette, and the text-bar editor. The ONLY differences from
// `/build` are: it seeds a SCHOOL frame config (wings on → wide side panels) and it
// drops the storefront header + Stripe order flow.
//
// STORE NOTE: it shares the singleton design store with `/build` for now (noindex
// concept prototype). Isolating it behind a `createDesignStore(persistName)`
// factory is the v2 move once school becomes a real SKU.

import { useEffect, useRef, useState } from "react";
import {
  useDesignStore,
  useDesignStoreApi,
  DesignStoreProvider,
  createDesignStore,
} from "@/stores/design-store";
import { DndProvider } from "./DndProvider";
import { FrameCanvas, type FrameCanvasHandle } from "@/components/frame/FrameCanvas";
import { TilePalette } from "@/components/tiles/TilePalette";
import { BottomBarEditor } from "@/components/bottom-bar/BottomBarEditor";
import { SectionControls } from "./SectionControls";
import { ArmedBanner } from "@/components/tiles/ArmedBanner";
import { StateSelector } from "@/components/frame/StateSelector";
import { SCHOOL_FRAME_CONFIG } from "@/lib/constants/frame";
import type { BannerPreview } from "@/lib/types";

export function SchoolDesigner() {
  const api = useDesignStoreApi(); // the SCHOOL store (provided by page.tsx)
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const slots = useDesignStore((s) => s.slots);
  const bottomBar = useDesignStore((s) => s.bottomBar);
  const qrCode = useDesignStore((s) => s.qrCode);
  const plateState = useDesignStore((s) => s.plateState);

  const canvasRef = useRef<FrameCanvasHandle>(null);
  const [overSlotId, setOverSlotId] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<BannerPreview | null>(null);

  // Seed the school frame (wings = wide side panels) onto a blank canvas, once.
  // loadDesign replaces the whole design + resets history.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    api.getState().loadDesign({
      frameConfig: SCHOOL_FRAME_CONFIG,
      slots: {},
      textBars: [],
    });
  }, [api]);

  return (
    <div className="build-skin workbench-bg min-h-screen flex flex-col">
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
        </div>
      </header>

      <DndProvider onOverSlotChange={setOverSlotId} onBannerPreviewChange={setBannerPreview}>
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-4 p-4 mx-auto w-full max-w-[1560px] items-start">
          {/* Tile palette — the real draggable tile source. */}
          <div className="order-1 lg:order-none min-w-0">
            <TilePalette />
          </div>

          {/* Frame preview + text editor, stacked. */}
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
                  bannerPreview={bannerPreview}
                />
              </div>
            </div>
            <SectionControls />
            <BottomBarEditor />
          </div>
        </main>
      </DndProvider>
    </div>
  );
}

// Wrapper that owns the ISOLATED school store and provides it to the builder. It
// MUST sit above SchoolDesigner so that component's top-level store hooks read the
// school store (not /build's). The store is created once on the client (lazy
// useState init) with its OWN persist key, so it never touches /build's design.
export function SchoolBuilder() {
  const [store] = useState(() => createDesignStore("festive-frames-school-v1"));
  return (
    <DesignStoreProvider store={store}>
      <SchoolDesigner />
    </DesignStoreProvider>
  );
}
