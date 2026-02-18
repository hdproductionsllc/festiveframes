"use client";

import { useEffect, useRef } from "react";
import { useDesignStore } from "@/stores/design-store";

/**
 * Auto-save is handled by Zustand's persist middleware.
 * This hook just tracks the "last saved" timestamp for display.
 */
export function useAutoSave() {
  const updatedAt = useDesignStore((s) => s.updatedAt);
  const previousRef = useRef(updatedAt);

  useEffect(() => {
    previousRef.current = updatedAt;
  }, [updatedAt]);

  return { lastSaved: updatedAt };
}
