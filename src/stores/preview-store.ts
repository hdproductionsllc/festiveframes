import { create } from "zustand";

interface PreviewState {
  frameImageUrl: string | null;
  carPhotoUrl: string | null;
  carPhotoSource: "upload" | "stock" | null;
  overlayX: number;
  overlayY: number;
  overlayScale: number;

  setFrameImage: (url: string) => void;
  setCarPhoto: (url: string, source: "upload" | "stock") => void;
  setOverlayPosition: (x: number, y: number) => void;
  setOverlayScale: (scale: number) => void;
  reset: () => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
  frameImageUrl: null,
  carPhotoUrl: null,
  carPhotoSource: null,
  overlayX: 50,
  overlayY: 55,
  overlayScale: 0.3,

  setFrameImage: (url) => set({ frameImageUrl: url }),
  setCarPhoto: (url, source) => set({ carPhotoUrl: url, carPhotoSource: source }),
  setOverlayPosition: (x, y) => set({ overlayX: x, overlayY: y }),
  setOverlayScale: (scale) => set({ overlayScale: Math.max(0.1, Math.min(2, scale)) }),
  reset: () =>
    set({
      frameImageUrl: null,
      carPhotoUrl: null,
      carPhotoSource: null,
      overlayX: 50,
      overlayY: 55,
      overlayScale: 0.3,
    }),
}));
