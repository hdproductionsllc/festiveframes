import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // These two rules fire on long-standing, intentional patterns used across
    // the app (effect-driven state resets like setMounted/imageLoaded, and the
    // plain <a> logo link that navigates between separate route groups). They
    // are advisory here, not build-breakers — keep them as warnings so CI gates
    // on real errors without forcing a risky rewrite of stable code.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
]);

export default eslintConfig;
