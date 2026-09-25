// ─────────────────────────────────────────────────────────────
// POST /api/school/designs/original — one uploaded photo's print original, for a
// device opening a saved design's link.
//
// Body: { token, sha256 }. Answers the image bytes only when that image is an
// uploaded original of the design this token opens (store.getDesignOriginal):
// the token is not a key to every file on the server. POST, so the token never
// sits in a URL. The builder stores the bytes in this device's IndexedDB under the
// design's own `fullResId`, and print reads them exactly as on the first device.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getDesignOriginal } from "@/lib/school-designs/store";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let body: { token?: unknown; sha256?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const found = await getDesignOriginal(String(body.token ?? ""), String(body.sha256 ?? ""));
  if (!found) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  return new Response(new Uint8Array(found.bytes), {
    status: 200,
    headers: { "Content-Type": found.mime, "Cache-Control": "no-store" },
  });
}
