"use client";

import { useDraggable } from "@dnd-kit/core";

export function useDragTile(pieceId: string) {
  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable({
      id: `palette:${pieceId}`,
      data: { pieceId, type: "tile" },
    });

  // The (inline) DragOverlay renders the moving ghost that floats above
  // everything and follows the cursor, so the SOURCE tile must NOT apply a
  // transform (that would double it up / trap it under the design). Just dim the
  // source while it's being dragged.
  const style = isDragging ? { opacity: 0.4 } : undefined;

  return { setNodeRef, attributes, listeners, style, isDragging };
}
