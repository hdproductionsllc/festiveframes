// Save-my-design endpoint. POST stores the full design JSON under an opaque token
// and emails the visitor a "continue your design" link; GET returns a saved design
// by token so the builder can rehydrate from `/build?restore=<token>`.

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { saveSavedDesign, getSavedDesign } from "@/lib/order/store";
import { sendRestoreLinkEmail } from "@/lib/email";
import { SITE_URL } from "@/config/season";
import type { LoadableDesign } from "@/stores/design-store";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SaveBody {
  email?: string;
  name?: string;
  design?: LoadableDesign;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: SaveBody;
  try {
    body = (await request.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (!body.design || typeof body.design !== "object") {
    return NextResponse.json({ error: "Missing design." }, { status: 400 });
  }
  const name =
    typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : null;

  const token = randomUUID();
  // The link base is SERVER-controlled only. NEVER trust the request Origin here:
  // this email is sent from our verified domain, so an attacker-supplied Origin
  // would let them mint a Festive-Frames-branded email pointing anywhere (phishing).
  const base = process.env.SITE_URL || SITE_URL;
  const url = `${base}/build?restore=${token}`;

  try {
    await saveSavedDesign({ token, email, name, design: body.design });
  } catch (err) {
    console.error("[save-design] persist failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not save right now." }, { status: 500 });
  }

  // Email is best-effort — the design is already saved and the link is returned
  // to the client either way (so the UI can show it even if email is unconfigured).
  const emailed = await sendRestoreLinkEmail({ to: email, name, url });
  return NextResponse.json({ ok: true, url, emailed }, { status: 200 });
}

export async function GET(request: Request): Promise<NextResponse> {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }
  try {
    const saved = await getSavedDesign(token);
    if (!saved) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ design: saved.design, name: saved.name }, { status: 200 });
  } catch (err) {
    console.error("[save-design] fetch failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not load." }, { status: 500 });
  }
}
