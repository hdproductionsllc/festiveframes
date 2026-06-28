// ─────────────────────────────────────────────────────────────
// POST /api/cartoonize — turn an uploaded pet photo into the Festive Frames
// die-cut cartoon style, preserving the pet's likeness.
//
// GENERATE step: Google Gemini image model ("Nano Banana"). Research found it
// best-in-class at keeping a SPECIFIC pet looking like itself (the thing Ideogram
// Remix failed at). Key stays SERVER-SIDE (GEMINI_API_KEY).
//
// CUTOUT step: deliberately a separate, pluggable pass (see removeBackground()).
// The generate prompt already asks for a plain white background, which is fine
// for likeness testing; a true transparent die-cut comes from a dedicated remover
// (Ideogram Remove BG / fal BiRefNet / self-hosted rembg) — wire one in when chosen.
//
// Request:  { image: "<data URL>" }
// Response: { image: "<data URL>" }  |  { error, needsKey? }
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Verify the exact model id in AI Studio's model picker — names drift.
// "gemini-2.5-flash-image" = standard Nano Banana (cheap). For Pro, use the
// Gemini 3 Pro Image id (pricier, only if standard misses on likeness).
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

// Locked house style. Likeness + style + plain background; do NOT force a new pose
// (keep the photo's pose — re-posing can hurt likeness).
const PROMPT =
  "Turn the pet in this photo into a clean cartoon sticker illustration of the SAME " +
  "pet. Keep its exact fur colors, markings and patterns, face shape, eye color, ear " +
  "shape, and expression — it must clearly read as THIS specific pet, in the same pose. " +
  "Style: bold thick black outlines, smooth flat cel shading, bright saturated colors, " +
  "simple professional die-cut sticker look. Show only the pet, centered, on a plain " +
  "solid white background — no text, no extra objects, no scenery.";

function parseDataUrl(dataUrl: string): { b64: string; mime: string } | null {
  const m = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { mime: m[1], b64: m[2] };
}

/**
 * Cutout step — PLUGGABLE. Returns a transparent-background die-cut PNG.
 * TODO: wire a real remover (Ideogram Remove BG / fal BiRefNet V2 / rembg). For
 * now it's a pass-through (the generated image already has a plain white bg, good
 * enough for likeness testing in /lab). Keeping this isolated means swapping in a
 * remover later is a one-function change with no other edits.
 */
async function removeBackground(image: string): Promise<string> {
  return image;
}

export async function POST(request: Request): Promise<NextResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Cartoonizer not configured.", needsKey: true },
      { status: 501 },
    );
  }

  let body: { image?: string };
  try {
    body = (await request.json()) as { image?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.image) return NextResponse.json({ error: "No image provided." }, { status: 400 });

  const parsed = parseDataUrl(body.image);
  if (!parsed) return NextResponse.json({ error: "Image must be a base64 data URL." }, { status: 400 });
  // ~10MB decoded guard (base64 is ~4/3 of the bytes).
  if (parsed.b64.length > 14 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (max ~10MB)." }, { status: 413 });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT },
                { inline_data: { mime_type: parsed.mime, data: parsed.b64 } },
              ],
            },
          ],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[cartoonize] Gemini error", res.status, detail.slice(0, 400));
      // Lab diagnostic: surface the upstream reason so we can see it in the UI.
      let msg = `Gemini ${res.status}`;
      try {
        const j = JSON.parse(detail) as { error?: { message?: string } };
        if (j.error?.message) msg += `: ${j.error.message}`;
      } catch {
        if (detail) msg += `: ${detail.slice(0, 160)}`;
      }
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    // Find the image part. REST responses may be camelCase (inlineData/mimeType)
    // or snake_case (inline_data/mime_type) — handle both.
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: Record<string, unknown>[] }; finishReason?: string }[];
    };
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    let outB64: string | undefined;
    let outMime = "image/png";
    for (const p of parts) {
      const inline = (p.inlineData ?? p.inline_data) as { data?: string; mimeType?: string; mime_type?: string } | undefined;
      if (inline?.data) {
        outB64 = inline.data;
        outMime = inline.mimeType || inline.mime_type || outMime;
        break;
      }
    }
    if (!outB64) {
      // Capture any text the model returned instead of an image (e.g. a refusal).
      let why = "";
      for (const p of parts) if (typeof p.text === "string") why += p.text;
      const finish = json.candidates?.[0]?.finishReason;
      console.error("[cartoonize] Gemini returned no image part", finish, why.slice(0, 200));
      return NextResponse.json(
        { error: `No image returned${finish ? ` (${finish})` : ""}${why ? `: ${why.slice(0, 160)}` : ""}` },
        { status: 502 },
      );
    }

    const generated = `data:${outMime};base64,${outB64}`;
    const finished = await removeBackground(generated); // pass-through until a remover is wired
    return NextResponse.json({ image: finished }, { status: 200 });
  } catch (err) {
    console.error("[cartoonize] failed:", err);
    return NextResponse.json({ error: "Cartoonizer failed. Please try again." }, { status: 502 });
  }
}
