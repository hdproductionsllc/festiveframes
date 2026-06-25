"use client";

import type { CSSProperties } from "react";
import { useDraggable } from "@dnd-kit/core";

export function useDragTile(pieceId: string) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `palette:${pieceId}`,
      data: { pieceId, type: "tile" },
    });

  // Palette tiles drag the reliable way: the tile element itself follows the
  // cursor via its own transform (the DragOverlay mis-positions the ghost to the
  // page corner; DndProvider suppresses the overlay for "tile" drags). With the
  // palette now a no-overflow panel, the tile isn't clipped; a high z-index lifts
  // it above the design, and pointer-events:none lets the drop target underneath
  // be detected (pointer-based collision) so dropping works.
  const style: CSSProperties | undefined = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
        position: "relative",
        pointerEvents: "none",
        opacity: isDragging ? 0.9 : 1,
      }
    : undefined;

  return { setNodeRef, attributes, listeners, style, isDragging };
}
