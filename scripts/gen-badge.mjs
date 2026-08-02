#!/usr/bin/env node
// ─── Enamel-pin badge art via Gemini image ("nano banana") ───────────────────
//
//   GEMINI_API_KEY=... node scripts/gen-badge.mjs <name> <variants> "<subject>"
//   (or GEMINI_API_KEY_FILE=/path/to/key)
//
// The generator side of the badge pipeline. The METHOD (style block, the
// subject-not-wording rule, the one-inch test) is the Ideogram-era library in
// tasks/enamel-pin-ideogram-prompts.md — only the vendor changed, because
// api.ideogram.ai is outside this environment's egress allowlist and
// generativelanguage.googleapis.com is not.
//
// KNOWN, ACCEPTED FAILURE — read before "fixing" the prompt: Gemini ALWAYS
// lights the magenta backdrop as a studio sweep. Measured magenta-ness comes
// back 66–91 where a clean flat fill is 245, and prose does not move it — the
// maximally explicit "every background pixel is exactly 255,0,255" wording was
// tried and changed nothing, which is the library's own lesson about arguing
// with a prior. Do NOT loop on prompt wording and do NOT feed these sources to
// scripts/cut-enamel-pins.mjs (its gate demands 150+ and will rightly refuse).
// The app's ADAPTIVE keyer handles them: `keyBackground` in
// src/lib/utils/key-background.ts measures the backdrop it is given — verified
// flatness 1.000 on these, partial-alpha edges ramping to GOLD (no magenta
// fringe). Pipeline: generate here → keyBackground → trim → the print gate
// (≥595px after trim) → the one-inch test, by eye, always.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const MODEL = process.env.GEN_MODEL ?? "gemini-2.5-flash-image";

function apiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  const file = process.env.GEMINI_API_KEY_FILE;
  if (file && existsSync(file)) return readFileSync(file, "utf8").trim();
  console.error("set GEMINI_API_KEY or GEMINI_API_KEY_FILE");
  process.exit(1);
}

// Byte-identical across the set (tasks/enamel-pin-ideogram-prompts.md §2).
// Cohesion is the entire point of generating a family in one hand.
const STYLE =
  "die-struck hard enamel pin, cloisonné style, polished gold metal borders and " +
  "raised metal linework separating every colour area, recessed enamel colour fill " +
  "polished flush with the metal, glossy enamel with a single soft specular " +
  "highlight, crisp hard edges, no gradients inside the enamel, no texture, no " +
  "fabric, no embroidery, no stitching, bold simple shapes readable at one inch, " +
  "symmetrical centred composition filling the frame, straight-on top-down view, " +
  "flat lay product photograph, isolated on a solid pure magenta #FF00FF " +
  "background, no drop shadow, no reflection, no text, no lettering, no words, " +
  "1:1 square";

const [name, countRaw, subject] = process.argv.slice(2);
if (!name || !subject) {
  console.error('usage: node scripts/gen-badge.mjs <name> <variants> "<subject line>"');
  process.exit(1);
}
const KEY = apiKey();
const count = Number(countRaw) || 3;
const outDir = path.join(ROOT, "scripts/out");
mkdirSync(outDir, { recursive: true });

for (let i = 1; i <= count; i++) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": KEY, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${subject}, ${STYLE}` }] }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1" } },
      }),
    },
  );
  if (!res.ok) {
    console.error(name, i, res.status, (await res.text()).slice(0, 240).replace(/\s+/g, " "));
    continue;
  }
  const json = await res.json();
  const img = (json.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData);
  if (!img) {
    console.error(name, i, "no image:", JSON.stringify(json).slice(0, 200));
    continue;
  }
  const out = path.join(outDir, `${name}-${i}.png`);
  writeFileSync(out, Buffer.from(img.inlineData.data, "base64"));
  console.log(name, i, "->", out);
}
console.log("Key with the APP's adaptive keyer (key-background.ts), NOT cut-enamel-pins. See header.");
