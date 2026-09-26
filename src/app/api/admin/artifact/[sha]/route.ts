// GET /api/admin/artifact/<sha256> — a stored image (proof, panel, original) for
// the staff dashboard. Staff session required; never cached by a shared cache.

import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin/session";
import { getArtifact } from "@/lib/school-designs/store";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ sha: string }> }): Promise<Response> {
  if (!(await currentAdmin())) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const { sha } = await params;
  if (!/^[0-9a-f]{64}$/.test(sha)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const a = await getArtifact(sha);
  if (!a) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return new Response(new Uint8Array(a.bytes), {
    headers: { "Content-Type": a.mime, "Cache-Control": "private, max-age=3600" },
  });
}
