"use client";

/**
 * SparkleBurst — a tiny, one-shot red/white/blue sparkle that pops over a frame
 * cell when a tile lands (or puffs when one is removed). Pure CSS keyframes on a
 * handful of absolutely-positioned dots/stars; no JS animation loop, no canvas,
 * nothing to tear down. The parent remounts it (via `key`) to replay it, and the
 * CSS animations are `forwards` so each particle ends invisible and inert.
 *
 * Motion: the whole layer is gated behind `motion-safe:` so visitors who prefer
 * reduced motion see nothing here — placement/removal still work, just calm.
 *
 * Decorative only: aria-hidden, pointer-events-none — never blocks the cell.
 */

interface SparkleBurstProps {
  /** "place" (default): an outward star+spark pop. "poof": a softer puff. */
  variant?: "place" | "poof";
}

// Patriotic palette for the particles (red / white / blue / gold / sky).
const COLORS = ["#c8102e", "#ffffff", "#1b2a4a", "#f8c53b", "#3fb0e6"];

// Eight particles fanned around the cell center. Pre-computed so render is cheap
// and deterministic (no per-frame work).
const PARTICLES = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2 + (i % 2 ? 0.35 : 0);
  const dist = 14 + (i % 3) * 5;
  return {
    dx: Math.cos(angle) * dist,
    dy: Math.sin(angle) * dist,
    color: COLORS[i % COLORS.length],
    star: i % 2 === 0,
    delay: (i % 4) * 18,
  };
});

export function SparkleBurst({ variant = "place" }: SparkleBurstProps) {
  const scale = variant === "poof" ? 0.8 : 1;
  return (
    <div
      aria-hidden="true"
      className="ff-sparkle-layer pointer-events-none absolute inset-0 z-[5] hidden motion-safe:block"
    >
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className={`ff-sparkle ${p.star ? "ff-sparkle-star" : "ff-sparkle-dot"}`}
          style={
            {
              background: p.star ? undefined : p.color,
              color: p.color,
              "--ff-dx": `${p.dx * scale}px`,
              "--ff-dy": `${p.dy * scale}px`,
              animationDelay: `${p.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
