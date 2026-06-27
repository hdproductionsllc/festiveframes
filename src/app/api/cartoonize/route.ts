// ─────────────────────────────────────────────────────────────
// POST /api/cartoonize — turn an uploaded pet/person photo into the Festive
// Frames die-cut cartoon "wing" style, via Ideogram (Remix / image-to-image).
//
// PROTOTYPE (V2, /lab only). The API key stays SERVER-SIDE (IDEOGRAM_API_KEY).
// Request:  { image: "<data URL>" }
// Response: { image: "<data URL of the cartoon>" }  |  { error, needsKey? }
//
// ⚠️ VERIFY the Ideogram endpoint/field names/auth against their current API docs
// before relying on this — image APIs change. This targets the v1 Remix shape:
//   POST https://api.ideogram.ai/remix
//   header: Api-Key: <key>
//   multipart: image_file=<binary>, image_request=<JSON>
//   response: { data: [ { url } ] }
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60; // cartoonizing can take 10-30s

// The locked "house style" — every pet comes out looking like the same product
// line (matches the die-cut wing render the owner approved).
const HOUSE_STYLE_PROMPT =
  "A cute cartoon illustration of this exact pet, full body, sitting upright and " +
  "facing forward, bold clean thick black outlines, flat cel shading, vibrant " +
  "saturated colors, die-cut sticker style. Preserve the pet's breed, fur color, " +
  "and markings faithfully. Plain solid white background, centered, no text.";

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const m = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { buffer: Buffer.from(m[2], "base64"), mime: m[1] };
}

export async function POST(request: Request): Promise<NextResponse> {
  const apiKey = process.env.IDEOGRAM_API_KEY;
  if (!apiKey) {
    // Graceful: the /lab UI shows "set IDEOGRAM_API_KEY to enable cartoonizing".
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
  // Guard oversized uploads (~10MB decoded).
  if (parsed.buffer.length > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (max ~10MB)." }, { status: 413 });
  }

  try {
    // Build the Ideogram Remix multipart request.
    const fd = new FormData();
    fd.append("image_file", new Blob([new Uint8Array(parsed.buffer)], { type: parsed.mime }), "pet.png");
    fd.append(
      "image_request",
      JSON.stringify({
        prompt: HOUSE_STYLE_PROMPT,
        // How much of the original photo to keep (likeness vs. stylization).
        image_weight: 60,
        model: "V_2",
        magic_prompt_option: "OFF",
        aspect_ratio: "ASPECT_1_1",
      }),
    );

    const res = await fetch("https://api.ideogram.ai/remix", {
      method: "POST",
      headers: { "Api-Key": apiKey }, // do NOT set Content-Type; fetch sets the multipart boundary
      body: fd,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[cartoonize] Ideogram error", res.status, detail.slice(0, 300));
      return NextResponse.json({ error: "Cartoonizer failed. Please try again." }, { status: 502 });
    }

    const json = (await res.json()) as { data?: { url?: string; is_image_safe?: boolean }[] };
    const first = json.data?.[0];
    if (!first?.url) {
      return NextResponse.json({ error: "Cartoonizer returned no image." }, { status: 502 });
    }
    if (first.is_image_safe === false) {
      return NextResponse.json({ error: "That image couldn't be used. Try another photo." }, { status: 422 });
    }

    // Fetch the result and return it as a data URL (so the client can preview AND
    // submit it to production without the temporary Ideogram URL expiring).
    const imgRes = await fetch(first.url);
    const arrayBuf = await imgRes.arrayBuffer();
    const b64 = Buffer.from(arrayBuf).toString("base64");
    const contentType = imgRes.headers.get("content-type") || "image/png";
    return NextResponse.json({ image: `data:${contentType};base64,${b64}` }, { status: 200 });
  } catch (err) {
    console.error("[cartoonize] failed:", err);
    return NextResponse.json({ error: "Cartoonizer failed. Please try again." }, { status: 502 });
  }
}
