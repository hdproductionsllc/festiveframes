"use client";

import type { CSSProperties } from "react";
import { useDraggable } from "@dnd-kit/core";

export function useDragTile(pieceId: string) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `palette:${pieceId}`,
      data: { pieceId, type: "tile" },
    });

  // Palette tiles drag the SIMPLE, reliable dnd-kit way: the tile element itself
  // follows the cursor via its own transform — no DragOverlay (the overlay was
  // mis-positioning the ghost to the page corner). DndProvider suppresses the
  // overlay ghost for palette ("tile") drags so there's no double. Lift it above
  // siblings while dragging.
  const style: CSSProperties | undefined = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
        position: "relative",
        opacity: isDragging ? 0.9 : 1,
      }
    : undefined;

  return { setNodeRef, attributes, listeners, style, isDragging };
}
