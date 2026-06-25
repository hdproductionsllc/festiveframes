"use client";

import { useDraggable } from "@dnd-kit/core";

export function useDragTile(pieceId: string) {
  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable({
      id: `palette:${pieceId}`,
      data: { pieceId, type: "tile" },
    });

  // A <DragOverlay> renders the moving ghost that follows the cursor, so the
  // SOURCE tile must NOT apply the drag transform — otherwise it flies off from
  // its spot in the panel ("dragging from way over elsewhere"). We only dim the
  // source while it's being dragged.
  const style = isDragging ? { opacity: 0.4 } : undefined;

  return { setNodeRef, attributes, listeners, style, isDragging };
}
