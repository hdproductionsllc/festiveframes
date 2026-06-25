/**
 * celebrate.ts — the festive payoff bursts for the /build designer.
 *
 * VISUAL CHROME ONLY. Nothing here touches the order pipeline, the design
 * store, or any production artifact (proof / banners / eufy print sheets). The
 * confetti renders on its own throwaway <canvas> that canvas-confetti appends to
 * <body>, plays for ~1s, then auto-removes itself — no loops are left running.
 *
 * Reduced-motion: every entry point bails immediately when the user has asked
 * for reduced motion, so the dopamine hit degrades to a calm, instant redirect.
 */
import confetti from "canvas-confetti";

const RED = "#c8102e";
const WHITE = "#ffffff";
const BLUE = "#1b2a4a";
const GOLD = "#f8c53b";
const SKY = "#3fb0e6";

const PATRIOTIC = [RED, WHITE, BLUE, GOLD, SKY];

/** True when the visitor opted out of motion (or we're not in a browser). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The ORDER moment — a celebratory red/white/blue fireworks + confetti burst.
 *
 * Fires immediately and keeps popping for ~1s. Self-contained and auto-cleaning
 * (canvas-confetti removes its canvas when the last animation settles). Safe to
 * call right before kicking off the checkout redirect; it does not block it.
 */
export function celebrateOrder(): void {
  if (prefersReducedMotion()) return;

  // Two opening cannons from the bottom corners (a parade "pop").
  const fireCannon = (originX: number, angle: number) => {
    confetti({
      particleCount: 70,
      angle,
      spread: 62,
      startVelocity: 62,
      origin: { x: originX, y: 1 },
      colors: PATRIOTIC,
      scalar: 1.05,
      ticks: 220,
      disableForReducedMotion: true,
    });
  };
  fireCannon(0.08, 60);
  fireCannon(0.92, 120);

  // A short fireworks finale: random shells bursting across the top.
  const duration = 900;
  const end = Date.now() + duration;
  const shell = () => {
    confetti({
      particleCount: 26,
      startVelocity: 26,
      spread: 360,
      ticks: 180,
      gravity: 0.9,
      scalar: 0.95,
      origin: { x: 0.15 + Math.random() * 0.7, y: Math.random() * 0.45 },
      colors: PATRIOTIC,
      disableForReducedMotion: true,
    });
    if (Date.now() < end) {
      // ~120ms cadence; no persistent interval to clean up.
      window.setTimeout(shell, 120);
    }
  };
  shell();
}

/**
 * A small, friendly confetti pop — used for the first-run onboarding flourish so
 * the welcome feels fun, not corporate. One gentle puff, auto-cleaning, skipped
 * under reduced motion.
 */
export function celebrateWelcome(): void {
  if (prefersReducedMotion()) return;
  confetti({
    particleCount: 50,
    spread: 70,
    startVelocity: 34,
    gravity: 0.9,
    scalar: 0.9,
    ticks: 160,
    origin: { x: 0.5, y: 0.42 },
    colors: PATRIOTIC,
    disableForReducedMotion: true,
  });
}
