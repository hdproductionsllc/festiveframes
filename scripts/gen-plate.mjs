#!/usr/bin/env node
// ─── Per-school vanity-plate mockup ──────────────────────────────────────────
//
//   GEMINI_API_KEY=... node scripts/gen-plate.mjs "PIONEERS" pioneers 3
//   (or GEMINI_API_KEY_FILE=/path/to/key)
//
// Part of the new-school pipeline: every kit's builder opens on a plate that
// reads as that school's, the way SLUH's reads "JRBILLS". This feeds the
// VERIFIED SLUH plate photo to Gemini image editing ("nano banana",
// gemini-2.5-flash-image) and asks for ONE change — the embossed characters.
// Editing beats generating from scratch for the same reason the badge library
// keeps one style block: every school's plate comes out of the same photograph,
// so the set cannot drift. Same plate, same screws, same light.
//
// The output is NOT trusted: embossed lettering is exactly where image models
// misspell (the first PIONEERS run came back "PIONERS" 1 time in 3), so this
// writes N variants and a human reads every one before anything ships. Conform
// the winner to the builder's framing with:
//
//   node scripts/gen-plate.mjs --conform <variant.png> <out.jpg>
//
// which scales its body to 903x461 and composites it at (7,1) onto the SLUH
// photo's own backdrop ring — the 924x467 framing plate-images.ts tunes its
// per-plate scale against. Then add to the kit:
//   plate: { state: "MO", src: "/plates/<out>.jpg" }

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const BASE = path.join(ROOT, "public/plates/missouri-jrbills-centered.jpg");
const MODEL = process.env.GEN_MODEL ?? "gemini-2.5-flash-image";

function apiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  const file = process.env.GEMINI_API_KEY_FILE;
  if (file && existsSync(file)) return readFileSync(file, "utf8").trim();
  console.error("set GEMINI_API_KEY or GEMINI_API_KEY_FILE");
  process.exit(1);
}

// ── conform mode ─────────────────────────────────────────────────────────────
if (process.argv[2] === "--conform") {
  const [, , , src, out] = process.argv;
  if (!src || !out) {
    console.error("usage: node scripts/gen-plate.mjs --conform <variant.png> <out.jpg>");
    process.exit(1);
  }
  const { default: sharp } = await import("sharp");
  const body = await sharp(src).resize(903, 461, { fit: "fill" }).toBuffer();
  await sharp(BASE).composite([{ input: body, left: 7, top: 1 }]).jpeg({ quality: 88 }).toFile(out);
  console.log("conformed ->", out, "(924x467, SLUH framing)");
  process.exit(0);
}

// ── generate mode ────────────────────────────────────────────────────────────
const [text, name, countRaw] = process.argv.slice(2);
if (!text || !name) {
  console.error('usage: node scripts/gen-plate.mjs "<PLATE TEXT>" <outname> [variants]');
  process.exit(1);
}
const KEY = apiKey();
const count = Number(countRaw) || 3;
const outDir = path.join(ROOT, "scripts/out");
mkdirSync(outDir, { recursive: true });

const baseB64 = readFileSync(BASE).toString("base64");
const prompt =
  `This is a photograph of a Missouri bicentennial license plate whose embossed ` +
  `registration characters read "JRBILLS". Produce the identical photograph with ` +
  `ONE change: the embossed characters now read exactly "${text}" — spelled ` +
  `letter-for-letter ${text.split("").join(", ")}, nothing more. Same dark navy ` +
  `embossed lettering style, same size and baseline, centred as a registration ` +
  `number, same plate, same screws, same lighting, same background, same crop. ` +
  `Do not change anything else about the image.`;

for (let i = 1; i <= count; i++) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": KEY, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: baseB64 } },
            { text: prompt },
          ],
        }],
        generationConfig: { responseModalities: ["IMAGE"] },
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
  const out = path.join(outDir, `plate-${name}-${i}.png`);
  writeFileSync(out, Buffer.from(img.inlineData.data, "base64"));
  console.log(name, i, "->", out);
}
console.log("LOOK AT EVERY VARIANT — check the spelling letter by letter — then conform the winner.");
