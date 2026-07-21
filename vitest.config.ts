import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Tests here are pure geometry/model logic (slot generation, the frame grid,
// parts-list counting) — no DOM, no React. So this config deliberately stays
// minimal: no jsdom, no react plugin. Add them if component tests land later.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
