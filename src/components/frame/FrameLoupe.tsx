"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// ─── A loupe over the frame preview ──────────────────────────────────────────
//
// The frame is about 6.5 inches of product shown at a few hundred CSS pixels, and
// the things people want to check are the small ones: whether the tagline is
// readable, whether the crest sits square, whether the bevel eats a descender. Until
// now the only way to see any of that was to export a print sheet.
//
// HOW IT STAYS HONEST. The lens does not rasterise the stage, and it does not draw
// the frame a second way — it renders the SAME component with the SAME props at the
// SAME layout width, and magnifies the result with a CSS transform. `useFrameLayout`
// measures through a ResizeObserver, which reports layout size and ignores ancestor
// transforms, so the copy inside the lens lays out identically and only its painted
// pixels are scaled. There is no third renderer here to drift from the other two.
//
// It is rendered OUTSIDE the DndProvider on purpose. The copy contains the same
// draggable and droppable slots as the real stage, and inside the provider they would
// register a second time under ids that already exist — a drop could then resolve to
// the copy. Outside it they find no context and register nowhere.

/** How much bigger. 3x turns the two-tier banner's tagline from a suggestion of text
 *  into text, which is the thing people are squinting at. */
const ZOOM = 3;

/** Lens diameter in CSS px. Big enough to hold a whole badge and its neighbours at
 *  3x — a smaller lens shows a patch of colour with no context to place it in. */
const SIZE = 240;

/** Gap between the cursor and the lens edge, so the lens never sits under the hand. */
const OFFSET = 22;

interface Point { x: number; y: number }

export function FrameLoupe({
  /** The stage element to magnify. The loupe tracks the pointer across THIS box. */
  stageRef,
  /** A second render of the frame. Rendered only while the loupe is open. */
  children,
}: {
  stageRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  /** Cursor position in stage-local px, or null when the pointer is elsewhere. */
  const [at, setAt] = useState<Point | null>(null);
  /** Where to put the lens on screen, in viewport px. */
  const [screen, setScreen] = useState<Point>({ x: 0, y: 0 });
  const [stage, setStage] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  /** True once the pointer has been over the stage even once.
   *
   *  The copy is mounted from that moment on and merely HIDDEN when the pointer
   *  leaves, rather than unmounted: a fresh mount re-runs the whole frame's layout
   *  and re-attaches a ResizeObserver every time the pointer crosses the stage edge,
   *  which on a builder is constantly. Mounting it always would be worse the other
   *  way — everyone would pay for a second frame, including the people who never
   *  hover — so the cost lands on the first hover and nowhere else. */
  const [armed, setArmed] = useState(false);
  const down = useRef(false);
  /** Last known cursor position in viewport coords, so a scroll can re-aim at it. */
  const last = useRef<Point | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    /** Resolve a viewport point against the stage's CURRENT rect. */
    const aim = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      const x = clientX - r.left;
      const y = clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) {
        setAt(null);
        return;
      }
      setStage({ w: r.width, h: r.height });
      setAt({ x, y });
      setScreen({ x: clientX, y: clientY });
      setArmed(true);
    };

    const move = (e: PointerEvent) => {
      // Touch and pen get nothing: there is no hover to follow, and a lens under a
      // finger covers the thing it exists to show. Gated on the EVENT's own
      // pointerType rather than a `(hover: hover) and (pointer: fine)` media query,
      // which reports coarse on a touchscreen laptop and would have denied the loupe
      // to someone sitting there with a mouse in their hand.
      if (down.current || e.pointerType !== "mouse") return;
      last.current = { x: e.clientX, y: e.clientY };
      aim(e.clientX, e.clientY);
    };
    const leave = () => setAt(null);
    // Scrolling moves the stage under a stationary cursor, so the magnified region
    // genuinely changes. Re-aiming at the same screen point is the honest answer;
    // hiding until the next mouse move made the lens blink on every wheel tick.
    const rescan = () => {
      if (down.current || !last.current) return;
      aim(last.current.x, last.current.y);
    };
    // A drag is the one time a lens is actively in the way — it would sit over the
    // drop target. Down anywhere hides it; it comes back on the next move.
    const pressed = () => { down.current = true; setAt(null); };
    const released = () => { down.current = false; };

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    window.addEventListener("pointerdown", pressed);
    window.addEventListener("pointerup", released);
    window.addEventListener("pointercancel", released);
    window.addEventListener("scroll", rescan, true);
    window.addEventListener("resize", rescan);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerdown", pressed);
      window.removeEventListener("pointerup", released);
      window.removeEventListener("pointercancel", released);
      window.removeEventListener("scroll", rescan, true);
      window.removeEventListener("resize", rescan);
    };
  }, [stageRef]);

  if (!armed || typeof document === "undefined" || stage.w === 0) return null;

  // Put the lens up and to the right of the cursor, and flip it to whichever side
  // keeps it fully on screen — a lens clipped by the window edge is worse than one
  // on the "wrong" side.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const focus = at ?? { x: stage.w / 2, y: stage.h / 2 };
  let left = screen.x + OFFSET;
  let top = screen.y - SIZE - OFFSET;
  if (left + SIZE > vw - 8) left = screen.x - SIZE - OFFSET;
  if (top < 8) top = screen.y + OFFSET;
  left = Math.max(8, Math.min(left, vw - SIZE - 8));
  top = Math.max(8, Math.min(top, vh - SIZE - 8));

  return createPortal(
    <div
      aria-hidden
      style={{
        position: "fixed",
        left,
        top,
        width: SIZE,
        height: SIZE,
        borderRadius: "50%",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 90,
        // Hidden, not unmounted — see `armed`. `visibility` rather than `display`
        // so the copy keeps its layout and its ResizeObserver never re-fires.
        visibility: at ? "visible" : "hidden",
        // A rim and a shadow so it reads as glass held over the frame rather than as
        // a second frame that has appeared next to the first.
        boxShadow: "0 0 0 2px rgba(255,255,255,0.9), 0 0 0 3px rgba(28,25,23,0.28), 0 10px 24px rgba(28,25,23,0.30)",
        background: "var(--ff-stage-mat, #e9e6e0)",
      }}
    >
      <div
        style={{
          width: stage.w,
          height: stage.h,
          transformOrigin: "0 0",
          // Map the hovered stage point to the middle of the lens.
          transform: `translate(${SIZE / 2 - focus.x * ZOOM}px, ${SIZE / 2 - focus.y * ZOOM}px) scale(${ZOOM})`,
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
