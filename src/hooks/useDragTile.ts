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
  // While dragging, the tile LIFTS: a constant scale + playful tilt + drop shadow
  // composed onto the cursor-follow translate. The scale/rotate are constant (no
  // CSS transition on transform — that would lag the cursor-follow), so it reads
  // as picked-up without ever trailing the pointer. Drop accuracy is unaffected:
  // collision is pointer-driven, not based on the tile's scaled rect.
  //
  // `touch-action: none` is ALWAYS set (even at rest), matching every other drag
  // source (the frame, placed tiles, the banner button). Without it, a phone's
  // browser claims the first slice of the finger gesture as a scroll/pan before
  // the pointer sensor locks on — so the drag and its pointer-driven drop shadow
  // start offset and you have to OVERSHOOT before the cue catches up. Desktop is
  // unaffected (mouse ignores touch-action), which is why only mobile overshot.
  const style: CSSProperties = {
    touchAction: "none",
    ...(transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(1.12) rotate(-3deg)`,
          zIndex: 1000,
          position: "relative",
          pointerEvents: "none",
          opacity: isDragging ? 0.95 : 1,
          filter: "drop-shadow(0 10px 14px rgba(0, 0, 0, 0.4))",
        }
      : {}),
  };

  return { setNodeRef, attributes, listeners, style, isDragging };
}
