// scripts/optimize-images.mjs
//
// Recompresses/resizes marketing image assets IN PLACE (same path, same
// filename, same extension). Run with: node scripts/optimize-images.mjs
//
// Owns only: public/kits/*.jpg, public/gallery/*.jpg,
// public/season/july4-2026-hero.png, public/brand/wordmark.png,
// public/plates/missouri-festive.png. Does NOT touch any other asset, and
// never changes a path or filename (components/config reference them).
//
// Strategy: sharp writes to a temp buffer first; the original is only
// overwritten once the new encode is produced AND re-decoded successfully, so a
// failed encode can never leave a half-written/corrupt file on disk.

import { readFile, writeFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { glob } from "node:fs/promises";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");

/** Each job describes one file (or glob of files) and how to re-encode it. */
const jobs = [
  {
    name: "kits (catalog thumbs)",
    glob: "kits/*.jpg",
    maxWidth: 1000,
    encode: (img) =>
      img.jpeg({ quality: 78, mozjpeg: true, progressive: true }),
  },
  {
    name: "gallery (lifestyle)",
    glob: "gallery/*.jpg",
    maxWidth: 1600,
    encode: (img) =>
      img.jpeg({ quality: 78, mozjpeg: true, progressive: true }),
  },
  {
    name: "season hero (opaque PNG)",
    glob: "season/july4-2026-hero.png",
    maxWidth: 2000,
    // Opaque photo-as-PNG: flatten any alpha, max zlib effort, palette quant.
    encode: (img) =>
      img
        .flatten({ background: "#0b1f3a" })
        .png({ compressionLevel: 9, quality: 80, effort: 10, palette: true }),
  },
  {
    name: "brand wordmark (transparent PNG)",
    glob: "brand/wordmark.png",
    maxWidth: 700,
    // KEEP ALPHA. Palette quant keeps transparency while shrinking hard.
    encode: (img) =>
      img.png({ compressionLevel: 9, quality: 90, effort: 10, palette: true }),
  },
  {
    name: "missouri plate (designer MO plate)",
    glob: "plates/missouri-festive.png",
    maxWidth: 1200,
    // Keep it crisp: lossless-ish, no aggressive quant that would smear text.
    encode: (img) => img.png({ compressionLevel: 9, effort: 10 }),
  },
];

const fmtKB = (bytes) => (bytes / 1024).toFixed(1).padStart(8) + " KB";

async function collect(pattern) {
  const out = [];
  for await (const entry of glob(pattern, { cwd: PUBLIC })) {
    out.push(path.join(PUBLIC, entry));
  }
  return out.sort();
}

async function processFile(file, job) {
  const before = (await stat(file)).size;
  const input = await readFile(file);

  const meta = await sharp(input).metadata();
  const pipeline = sharp(input).rotate(); // respect EXIF orientation before strip
  if (meta.width && meta.width > job.maxWidth) {
    pipeline.resize({ width: job.maxWidth, withoutEnlargement: true });
  }
  // sharp drops metadata by default unless .withMetadata() is called -> stripped.
  const output = await job.encode(pipeline).toBuffer();

  // Verify the re-encoded buffer decodes before we overwrite the original.
  const verify = await sharp(output).metadata();
  if (!verify.width || !verify.height) {
    throw new Error(`re-decode produced no dimensions for ${file}`);
  }

  // Only overwrite when we actually saved bytes; otherwise keep the original
  // (some already-tight files would grow under re-encode).
  const grew = output.length >= before;
  if (!grew) {
    await writeFile(file, output);
  }

  const after = grew ? before : output.length;
  const pct = before > 0 ? ((1 - after / before) * 100).toFixed(1) : "0.0";
  const rel = path.relative(PUBLIC, file).replace(/\\/g, "/");
  console.log(
    `  ${rel.padEnd(40)} ${fmtKB(before)} -> ${fmtKB(after)}  (-${pct}%) ` +
      `${verify.width}x${verify.height} ${verify.format}` +
      (grew ? "  [kept original: re-encode was larger]" : ""),
  );

  return { before, after };
}

async function main() {
  let totalBefore = 0;
  let totalAfter = 0;

  for (const job of jobs) {
    const files = await collect(job.glob);
    if (files.length === 0) {
      console.log(`\n${job.name}: (no files matched ${job.glob})`);
      continue;
    }
    console.log(`\n${job.name}  [${job.glob}]`);
    for (const file of files) {
      const { before, after } = await processFile(file, job);
      totalBefore += before;
      totalAfter += after;
    }
  }

  const savedPct =
    totalBefore > 0 ? ((1 - totalAfter / totalBefore) * 100).toFixed(1) : "0.0";
  console.log("\n========================================");
  console.log(`TOTAL image weight ${fmtKB(totalBefore)} -> ${fmtKB(totalAfter)}`);
  console.log(`  ${(totalBefore / 1024 / 1024).toFixed(2)} MB -> ${(totalAfter / 1024 / 1024).toFixed(2)} MB  (-${savedPct}%)`);
  console.log("========================================");
}

main().catch((err) => {
  console.error("optimize-images failed:", err);
  process.exit(1);
});
