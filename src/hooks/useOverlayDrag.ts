"use client";

import { useCallback, useRef } from "react";
import { usePreviewStore } from "@/stores/preview-store";

export function useOverlayDrag(containerRef: React.RefObject<HTMLDivElement | null>) {
  const dragging = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      usePreviewStore.getState().setOverlayPosition(
        Math.max(0, Math.min(100, x)),
        Math.max(0, Math.min(100, y))
      );
    },
    [containerRef]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const store = usePreviewStore.getState();
    const delta = e.deltaY > 0 ? -0.02 : 0.02;
    store.setOverlayScale(store.overlayScale + delta);
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onWheel };
}
