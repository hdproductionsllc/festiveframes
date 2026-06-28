// ─────────────────────────────────────────────────────────────
// POST /api/pet-caption — write the "what my pet thinks" bumper line for the
// pet-frame builder's thought wing. Reads the pet PHOTO (Claude Haiku vision)
// and returns ONE short, car-legible line in the chosen voice. Server-side key.
//
// Request:  { image: "<data URL>", voice?: "funny|sassy|dramatic|genz", petName?: string }
// Response: { line, voice, generated }   (generated:false = curated sample, no key)
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { generatePetCaption, isCaptionVoice, type CaptionMedia } from "@/lib/pet-caption";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED: CaptionMedia[] = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function parseDataUrl(dataUrl: string): { b64: string; mime: CaptionMedia } | null {
  const m = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1] as CaptionMedia;
  if (!ALLOWED.includes(mime)) return null;
  return { mime, b64: m[2] };
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: { image?: string; voice?: unknown; petName?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.image) return NextResponse.json({ error: "No image provided." }, { status: 400 });

  const parsed = parseDataUrl(body.image);
  if (!parsed) {
    return NextResponse.json({ error: "Image must be a JPEG/PNG/GIF/WebP data URL." }, { status: 400 });
  }
  if (parsed.b64.length > 7 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (max ~5MB)." }, { status: 413 });
  }

  const voice = isCaptionVoice(body.voice) ? body.voice : "funny";
  const petName =
    typeof body.petName === "string"
      ? body.petName.replace(/[^a-zA-Z0-9 .'-]/g, "").slice(0, 20).trim() || undefined
      : undefined;

  try {
    const result = await generatePetCaption(parsed.b64, parsed.mime, voice, petName);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[pet-caption] failed:", err);
    return NextResponse.json({ error: "Couldn't write a line. Try again." }, { status: 502 });
  }
}
