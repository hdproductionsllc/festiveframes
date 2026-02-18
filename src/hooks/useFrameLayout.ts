"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { FrameConfig, FrameSlot } from "@/lib/types";
import { generateSlots } from "@/lib/utils/slot-generator";
import { getContainerHeight, getPlateArea, getBottomBarArea, getWingArea } from "@/lib/utils/layout";

export function useFrameLayout(config: FrameConfig) {
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const slots = useMemo<FrameSlot[]>(() => {
    if (containerWidth === 0) return [];
    return generateSlots(config, containerWidth);
  }, [config, containerWidth]);

  const containerHeight = useMemo(
    () => (containerWidth > 0 ? getContainerHeight(config, containerWidth) : 0),
    [config, containerWidth]
  );

  const plateArea = useMemo(
    () => (containerWidth > 0 ? getPlateArea(config, containerWidth) : null),
    [config, containerWidth]
  );

  const bottomBarArea = useMemo(
    () => (containerWidth > 0 ? getBottomBarArea(config, containerWidth) : null),
    [config, containerWidth]
  );

  const wingLeftArea = useMemo(
    () => (containerWidth > 0 ? getWingArea(config, "left", containerWidth) : null),
    [config, containerWidth]
  );

  const wingRightArea = useMemo(
    () => (containerWidth > 0 ? getWingArea(config, "right", containerWidth) : null),
    [config, containerWidth]
  );

  return {
    containerRef,
    containerWidth,
    containerHeight,
    slots,
    plateArea,
    bottomBarArea,
    wingLeftArea,
    wingRightArea,
  };
}
