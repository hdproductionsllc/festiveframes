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
  // `touch-action: pan-y` — allow the phone to SCROLL the page vertically off this
  // tile, while still letting the (delay-based) TouchSensor start a drag on a
  // press-and-hold. It used to be `none` because the old PointerSensor locked onto
  // touch after 5px and needed the browser to never claim the gesture; the page then
  // couldn't scroll where tiles covered it. Now touch drags go through TouchSensor's
  // 180ms hold (see DndProvider), so a swipe scrolls and a hold drags. Desktop is
  // unaffected (mouse ignores touch-action).
  const style: CSSProperties = {
    touchAction: "pan-y",
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
